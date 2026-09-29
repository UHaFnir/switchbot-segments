"""WebSocket-API fuer das Seitenleisten-Panel.

Die Kalibrier-Vorschau ist eine Subscription: `preview/start` sichert den
aktuellen Farbstand, `preview/update` zeigt Ecken am Strip an, und das Ende der
Subscription -- durch das Panel oder weil die Verbindung abreisst -- stellt den
gesicherten Stand wieder her.
"""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from . import presets
from . import protocol as p
from .const import CONF_LIVE_DELAY_MS, DEFAULT_SEGMENT_COUNT, SNAPSHOT_BEFORE_PREVIEW
from .layout import Layout, LayoutError
from .runtime import SegmentsRuntime, get_runtime, loaded_runtimes

_LOGGER = logging.getLogger(__name__)

WS_PREFIX = "switchbot_segments"

LAYOUT_SCHEMA = vol.Schema(
    {
        vol.Required("segment_count"): vol.All(int, vol.Range(min=1, max=255)),
        vol.Required("start_direction"): str,
        vol.Required("corners"): [
            vol.Schema({vol.Required("index"): int, vol.Required("turn"): str})
        ],
    }
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """WebSocket-Befehle registrieren."""
    for handler in (
        ws_strips,
        ws_read,
        ws_save_layout,
        ws_preview_start,
        ws_preview_update,
        ws_apply_colors,
        ws_save_preset,
        ws_apply_preset,
        ws_delete_preset,
        ws_render_template,
    ):
        websocket_api.async_register_command(hass, handler)


def _segment_count(rt: SegmentsRuntime) -> int:
    if rt.controller.status is not None:
        return rt.controller.status.segment_count
    if rt.store.layout is not None:
        return rt.store.layout.segment_count
    return DEFAULT_SEGMENT_COUNT


def _strip_info(entry_id: str, title: str, rt: SegmentsRuntime) -> dict[str, Any]:
    layout = rt.store.layout or Layout.default(_segment_count(rt))
    colors = rt.controller.colors
    return {
        "entry_id": entry_id,
        "title": title,
        "segment_count": _segment_count(rt),
        "layout": layout.as_dict(),
        "layout_saved": rt.store.layout is not None,
        "colors": [p.rgb_to_hex(c) for c in colors] if colors is not None else None,
        "preview_active": rt.preview_sessions > 0,
        "presets": rt.store.presets,
        "active_preset": rt.active_preset(),
        "live_delay_ms": int(rt.options[CONF_LIVE_DELAY_MS]),
    }


def _info(hass: HomeAssistant, entry_id: str) -> dict[str, Any]:
    entry = hass.config_entries.async_get_entry(entry_id)
    return _strip_info(entry_id, entry.title, get_runtime(hass, entry_id))


async def _guard(connection: websocket_api.ActiveConnection, msg_id: int, coro) -> Any:
    """Fehler aus Strip/Layout als WS-Fehler melden statt als Traceback."""
    try:
        return await coro
    except LayoutError as err:
        connection.send_error(msg_id, "invalid_layout", str(err))
    except (HomeAssistantError, p.ProtocolError) as err:
        connection.send_error(msg_id, "strip_error", str(err))
    return None


@websocket_api.websocket_command({vol.Required("type"): f"{WS_PREFIX}/strips"})
@websocket_api.require_admin
@callback
def ws_strips(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Alle geladenen Strips mit Layout und bekanntem Farbstand."""
    connection.send_result(
        msg["id"],
        [
            _strip_info(entry.entry_id, entry.title, rt)
            for entry, rt in loaded_runtimes(hass)
        ],
    )


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS_PREFIX}/read", vol.Required("entry_id"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_read(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Farben frisch vom Strip lesen."""
    rt = get_runtime(hass, msg["entry_id"])
    colors = await _guard(connection, msg["id"], rt.controller.async_read())
    if colors is not None:
        connection.send_result(msg["id"], _info(hass, msg["entry_id"]))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/save_layout",
        vol.Required("entry_id"): str,
        vol.Required("layout"): LAYOUT_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_layout(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Layout speichern."""
    rt = get_runtime(hass, msg["entry_id"])

    async def _save() -> bool:
        await rt.store.async_set_layout(Layout.from_dict(msg["layout"]))
        return True

    if await _guard(connection, msg["id"], _save()):
        connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS_PREFIX}/preview/start", vol.Required("entry_id"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_preview_start(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Vorschau beginnen: aktuellen Stand sichern; Subscription-Ende stellt ihn wieder her."""
    rt = get_runtime(hass, msg["entry_id"])
    if rt.preview_backup is None:
        backup = await _guard(connection, msg["id"], rt.controller.async_read())
        if backup is None:
            return
        rt.preview_backup = backup
        await rt.store.async_save_snapshot(SNAPSHOT_BEFORE_PREVIEW, backup)
    rt.preview_sessions += 1

    @callback
    def _stop() -> None:
        rt.preview_sessions -= 1
        if rt.preview_sessions == 0:
            hass.async_create_task(_async_end_preview(rt), eager_start=False)

    connection.subscriptions[msg["id"]] = _stop
    connection.send_result(msg["id"])


async def _async_end_preview(rt: SegmentsRuntime) -> None:
    backup, rt.preview_backup = rt.preview_backup, None
    if backup is None:
        return
    try:
        await rt.controller.async_apply(backup)
    except (HomeAssistantError, p.ProtocolError):
        _LOGGER.exception(
            "Stand vor der Kalibrierung nicht wiederhergestellt -- Service "
            "switchbot_segments.restore mit Snapshot '%s' ausfuehren",
            SNAPSHOT_BEFORE_PREVIEW,
        )
        return
    await rt.store.async_remove_snapshot(SNAPSHOT_BEFORE_PREVIEW)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/preview/update",
        vol.Required("entry_id"): str,
        vol.Required("layout"): LAYOUT_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_preview_update(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Ecken des (noch ungespeicherten) Layouts am Strip anzeigen."""
    rt = get_runtime(hass, msg["entry_id"])
    if rt.preview_sessions == 0:
        connection.send_error(msg["id"], "no_preview", "Vorschau ist nicht gestartet")
        return

    async def _show() -> int:
        layout = Layout.from_dict(msg["layout"])
        if layout.segment_count != _segment_count(rt):
            raise LayoutError(
                f"Layout hat {layout.segment_count} Segmente, Strip hat {_segment_count(rt)}"
            )
        return await rt.controller.async_apply(layout.calibration_colors())

    frames = await _guard(connection, msg["id"], _show())
    if frames is not None:
        connection.send_result(msg["id"], {"frames": frames})


HEX_COLOR = vol.All(str, vol.Match(r"^[0-9a-fA-F]{6}$"))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/apply_colors",
        vol.Required("entry_id"): str,
        vol.Required("colors"): [HEX_COLOR],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_apply_colors(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Gemalten Farbstand an den Strip senden (nur die Unterschiede)."""
    rt = get_runtime(hass, msg["entry_id"])
    colors = [p.hex_to_rgb(c) for c in msg["colors"]]
    frames = await _guard(connection, msg["id"], rt.async_change(colors))
    if frames is not None:
        connection.send_result(msg["id"], {"frames": frames})


async def _preset_command(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict, coro
) -> None:
    if await _guard(connection, msg["id"], _returns_true(coro)):
        connection.send_result(msg["id"], _info(hass, msg["entry_id"]))


async def _returns_true(coro) -> bool:
    await coro
    return True


PRESET_COMMAND = {vol.Required("entry_id"): str, vol.Required("name"): str}


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS_PREFIX}/save_preset", **PRESET_COMMAND}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_preset(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Aktuellen Farbstand als Preset speichern."""
    rt = get_runtime(hass, msg["entry_id"])
    await _preset_command(hass, connection, msg, rt.async_save_preset(msg["name"]))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS_PREFIX}/apply_preset", **PRESET_COMMAND}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_apply_preset(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Preset am Strip anwenden."""
    rt = get_runtime(hass, msg["entry_id"])
    await _preset_command(hass, connection, msg, rt.async_apply_preset(msg["name"]))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS_PREFIX}/delete_preset", **PRESET_COMMAND}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete_preset(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Preset loeschen."""
    rt = get_runtime(hass, msg["entry_id"])
    await _preset_command(hass, connection, msg, rt.async_delete_preset(msg["name"]))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/render_template",
        vol.Required("entry_id"): str,
        vol.Required("template"): vol.In(presets.TEMPLATES),
        vol.Required("colors"): vol.All([HEX_COLOR], vol.Length(min=1, max=8)),
        vol.Optional("steps", default=presets.DEFAULT_STEPS): vol.All(
            int, vol.Range(min=1, max=60)
        ),
        vol.Optional("accent_width", default=presets.DEFAULT_ACCENT_WIDTH): vol.All(
            int, vol.Range(min=0, max=30)
        ),
        vol.Optional("layout"): LAYOUT_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_render_template(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Vorlage berechnen, ohne zu senden -- das Panel uebernimmt sie in die Malflaeche."""
    rt = get_runtime(hass, msg["entry_id"])

    async def _render() -> list[str]:
        layout = Layout.from_dict(msg["layout"]) if "layout" in msg else None
        colors = await rt.async_render_template(
            msg["template"],
            [p.hex_to_rgb(c) for c in msg["colors"]],
            msg["steps"],
            msg["accent_width"],
            layout,
        )
        return [p.rgb_to_hex(c) for c in colors]

    colors = await _guard(connection, msg["id"], _render())
    if colors is not None:
        connection.send_result(msg["id"], {"colors": colors})
