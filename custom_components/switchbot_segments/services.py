"""Services: Segmente setzen, Farbstand sichern/wiederherstellen, Presets und Vorlagen."""

from __future__ import annotations

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from . import presets
from .const import DEFAULT_SNAPSHOT, DOMAIN
from .runtime import get_runtime

ATTR_STRIP = "strip"
ATTR_SEGMENTS = "segments"
ATTR_COLOR = "color"
ATTR_NAME = "name"

SERVICE_SET_SEGMENTS = "set_segments"
SERVICE_SNAPSHOT = "snapshot"
SERVICE_RESTORE = "restore"
SERVICE_APPLY_PRESET = "apply_preset"
SERVICE_APPLY_TEMPLATE = "apply_template"
ATTR_TEMPLATE = "template"
ATTR_COLORS = "colors"
ATTR_STEPS = "steps"
ATTR_ACCENT_WIDTH = "accent_width"


def parse_segments(value: str | int | list) -> list[int]:
    """'0-13, 20, 30-32' bzw. [0, 1, 2] -> Liste von Indizes (0-basiert)."""
    if isinstance(value, int):
        return [value]
    if isinstance(value, list):
        return [int(v) for v in value]
    indices: list[int] = []
    for part in str(value).split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = (int(x) for x in part.split("-", 1))
            if end < start:
                raise vol.Invalid(f"Bereich {part} ist rueckwaerts")
            indices += range(start, end + 1)
        else:
            indices.append(int(part))
    return indices


def _segments(value: object) -> list[int]:
    try:
        return parse_segments(value)  # type: ignore[arg-type]
    except ValueError as err:
        raise vol.Invalid(f"Segmente nicht lesbar: {value}") from err


RGB_SCHEMA = vol.All(vol.ExactSequence((cv.byte, cv.byte, cv.byte)), vol.Coerce(tuple))

SET_SEGMENTS_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_STRIP): cv.string,
        vol.Required(ATTR_SEGMENTS): [
            vol.Schema(
                {
                    vol.Required(ATTR_SEGMENTS): _segments,
                    vol.Required(ATTR_COLOR): RGB_SCHEMA,
                }
            )
        ],
    }
)
SNAPSHOT_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_STRIP): cv.string,
        vol.Optional(ATTR_NAME, default=DEFAULT_SNAPSHOT): cv.string,
    }
)
APPLY_TEMPLATE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_STRIP): cv.string,
        vol.Required(ATTR_TEMPLATE): vol.In(presets.TEMPLATES),
        vol.Required(ATTR_COLORS): vol.All([RGB_SCHEMA], vol.Length(min=1, max=8)),
        vol.Optional(ATTR_STEPS, default=presets.DEFAULT_STEPS): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=60)
        ),
        vol.Optional(ATTR_ACCENT_WIDTH, default=presets.DEFAULT_ACCENT_WIDTH): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=30)
        ),
    }
)
APPLY_PRESET_SCHEMA = vol.Schema(
    {vol.Required(ATTR_STRIP): cv.string, vol.Required(ATTR_NAME): cv.string}
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Services registrieren."""

    async def set_segments(call: ServiceCall) -> None:
        rt = get_runtime(hass, call.data[ATTR_STRIP])
        await rt.controller.async_set_segments(
            [
                (item[ATTR_SEGMENTS], item[ATTR_COLOR])
                for item in call.data[ATTR_SEGMENTS]
            ]
        )

    async def snapshot(call: ServiceCall) -> None:
        rt = get_runtime(hass, call.data[ATTR_STRIP])
        colors = await rt.controller.async_read()
        await rt.store.async_save_snapshot(call.data[ATTR_NAME], colors)

    async def restore(call: ServiceCall) -> None:
        rt = get_runtime(hass, call.data[ATTR_STRIP])
        colors = rt.store.snapshot_colors(call.data[ATTR_NAME])
        if colors is None:
            raise ServiceValidationError(
                f"Snapshot '{call.data[ATTR_NAME]}' gibt es nicht"
            )
        await rt.controller.async_apply(colors)

    async def apply_template(call: ServiceCall) -> None:
        rt = get_runtime(hass, call.data[ATTR_STRIP])
        await rt.async_apply_template(
            call.data[ATTR_TEMPLATE],
            call.data[ATTR_COLORS],
            call.data[ATTR_STEPS],
            call.data[ATTR_ACCENT_WIDTH],
        )

    async def apply_preset(call: ServiceCall) -> None:
        rt = get_runtime(hass, call.data[ATTR_STRIP])
        await rt.async_apply_preset(call.data[ATTR_NAME])

    hass.services.async_register(
        DOMAIN, SERVICE_SET_SEGMENTS, set_segments, SET_SEGMENTS_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_SNAPSHOT, snapshot, SNAPSHOT_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_RESTORE, restore, SNAPSHOT_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY_PRESET, apply_preset, APPLY_PRESET_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY_TEMPLATE, apply_template, APPLY_TEMPLATE_SCHEMA
    )
