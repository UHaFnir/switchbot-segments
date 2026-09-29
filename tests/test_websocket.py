"""Tests fuer die WebSocket-API des Panels, inklusive Kalibrier-Vorschau."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.switchbot_segments.const import SNAPSHOT_BEFORE_PREVIEW
from custom_components.switchbot_segments.layout import CALIBRATION_CORNER

from .conftest import LILA, ORANGE, FakeStrip

U = {
    "segment_count": 60,
    "start_direction": "up",
    "corners": [{"index": 14, "turn": "right"}, {"index": 45, "turn": "right"}],
}
ORIGINAL = [LILA] * 14 + [ORANGE] * 46


async def test_strips_and_read(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    strip_entry: MockConfigEntry,
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "switchbot_segments/strips"})
    [info] = (await client.receive_json())["result"]
    assert info["entry_id"] == strip_entry.entry_id
    assert info["colors"] is None
    assert info["layout_saved"] is False
    assert info["layout"]["corners"] == []

    await client.send_json_auto_id(
        {"type": "switchbot_segments/read", "entry_id": strip_entry.entry_id}
    )
    result = (await client.receive_json())["result"]
    assert result["colors"][:1] == ["c857ff"]
    assert result["segment_count"] == 60


async def test_save_layout(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    strip_entry: MockConfigEntry,
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/save_layout",
            "entry_id": strip_entry.entry_id,
            "layout": U,
        }
    )
    assert (await client.receive_json())["success"]
    assert strip_entry.runtime_data.store.layout.as_dict() == U

    bad = {**U, "corners": [{"index": 0, "turn": "left"}]}
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/save_layout",
            "entry_id": strip_entry.entry_id,
            "layout": bad,
        }
    )
    response = await client.receive_json()
    assert response["error"]["code"] == "invalid_layout"


async def test_preview_restores_on_unsubscribe(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    strip_entry: MockConfigEntry,
    fake_strip: FakeStrip,
) -> None:
    rt = strip_entry.runtime_data
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "switchbot_segments/preview/start", "entry_id": strip_entry.entry_id}
    )
    start = await client.receive_json()
    assert start["success"]
    assert rt.store.snapshot_colors(SNAPSHOT_BEFORE_PREVIEW) == ORIGINAL

    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/preview/update",
            "entry_id": strip_entry.entry_id,
            "layout": U,
        }
    )
    assert (await client.receive_json())["success"]
    assert fake_strip.colors[14] == fake_strip.colors[45] == CALIBRATION_CORNER

    # Ecke verschieben: nur die zwei betroffenen Segmente aendern sich
    moved = {**U, "corners": [{"index": 15, "turn": "right"}, U["corners"][1]]}
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/preview/update",
            "entry_id": strip_entry.entry_id,
            "layout": moved,
        }
    )
    assert (await client.receive_json())["result"] == {"frames": 2}

    await client.send_json_auto_id(
        {"type": "unsubscribe_events", "subscription": start["id"]}
    )
    await client.receive_json()
    await hass.async_block_till_done()
    assert fake_strip.colors == ORIGINAL
    assert rt.store.snapshot_colors(SNAPSHOT_BEFORE_PREVIEW) is None
    assert rt.preview_sessions == 0


async def test_preview_restores_when_connection_drops(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    strip_entry: MockConfigEntry,
    fake_strip: FakeStrip,
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "switchbot_segments/preview/start", "entry_id": strip_entry.entry_id}
    )
    await client.receive_json()
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/preview/update",
            "entry_id": strip_entry.entry_id,
            "layout": U,
        }
    )
    await client.receive_json()
    await client.close()
    await hass.async_block_till_done()
    assert fake_strip.colors == ORIGINAL


async def test_preview_update_requires_start_and_matching_count(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    strip_entry: MockConfigEntry,
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/preview/update",
            "entry_id": strip_entry.entry_id,
            "layout": U,
        }
    )
    assert (await client.receive_json())["error"]["code"] == "no_preview"

    await client.send_json_auto_id(
        {"type": "switchbot_segments/preview/start", "entry_id": strip_entry.entry_id}
    )
    await client.receive_json()
    await client.send_json_auto_id(
        {
            "type": "switchbot_segments/preview/update",
            "entry_id": strip_entry.entry_id,
            "layout": {**U, "segment_count": 50},
        }
    )
    assert (await client.receive_json())["error"]["code"] == "invalid_layout"
