"""Fixtures for SwitchBot Segments tests."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.switchbot_segments.const import CONF_SWITCHBOT_ENTRY_ID, DOMAIN

pytest_plugins = "pytest_homeassistant_custom_component"

ROPE = "rgbic_neon_rope_light"
LILA = (0xC8, 0x57, 0xFF)
ORANGE = (0xFF, 0x9F, 0x00)


class FakeStrip:
    """Bildet das Segment-Protokoll des echten Strips nach (docs/PROTOCOL.md)."""

    def __init__(self, colors: list[tuple[int, int, int]] | None = None) -> None:
        self.colors = list(colors or [LILA] * 14 + [ORANGE] * 46)
        self.frames: list[str] = []
        self.fail_next = False

    def _status(self) -> bytes:
        return bytes(
            [0x01, 0x80, 0x64, *LILA, 0x00, 0x11, 0x3A, 0x00, 0x01, len(self.colors)]
        )

    async def _send_command(self, frame: str) -> bytes | None:
        self.frames.append(frame)
        if self.fail_next:
            self.fail_next = False
            return None
        data = bytes.fromhex(frame)
        if frame == "570f4a01":
            return self._status()
        if frame == "570f4a03":
            return bytes([0x01, len(self.colors)])
        if frame.startswith("570f4a0b"):
            start, count = data[4], data[5]
            return bytes([0x01]) + b"".join(
                bytes(c) for c in self.colors[start : start + count]
            )
        if frame.startswith("570f490c02"):
            rgb, n, indices = tuple(data[5:8]), data[8] & 0x7F, data[9:]
            if n > 8 or len(indices) != n:
                return bytes.fromhex("015a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a")
            for i in indices:
                self.colors[i] = rgb
            return self._status()
        raise AssertionError(f"unerwarteter Frame {frame}")

    @property
    def writes(self) -> list[str]:
        return [f for f in self.frames if f.startswith("570f49")]


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Custom Integrations in allen Tests laden."""
    yield


@pytest.fixture(autouse=True)
def _dependencies_loaded(hass: HomeAssistant):
    """Abhaengigkeiten ohne echtes Bluetooth/Frontend: als geladen markieren, Panel nicht bauen.

    Beim Teardown wuerde HA geladene `switchbot`-Entries entladen und dafuer die echte
    Bluetooth-Kette importieren -- deshalb die Mock-Entries vorher auf NOT_LOADED.
    """
    hass.config.components.update({"switchbot", "frontend", "panel_custom"})
    with patch("custom_components.switchbot_segments.panel.async_register"):
        yield
    for core in hass.config_entries.async_entries("switchbot"):
        core.mock_state(hass, ConfigEntryState.NOT_LOADED)


def add_core_entry(
    hass: HomeAssistant,
    sensor_type: str = ROPE,
    unique_id: str = "aabbccddee01",
    state: ConfigEntryState = ConfigEntryState.LOADED,
    device: object | None = None,
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain="switchbot",
        title=f"Strip {unique_id[-2:]}",
        unique_id=unique_id,
        data={"sensor_type": sensor_type, "address": "AA:BB:CC:DD:EE:01"},
        state=state,
    )
    entry.add_to_hass(hass)
    entry.runtime_data = MagicMock()
    entry.runtime_data.device = device if device is not None else FakeStrip()
    return entry


@pytest.fixture
def fake_strip() -> FakeStrip:
    return FakeStrip()


@pytest.fixture
async def strip_entry(hass: HomeAssistant, fake_strip: FakeStrip) -> MockConfigEntry:
    """Geladener SwitchBot-Segments-Entry auf einem FakeStrip."""
    core = add_core_entry(hass, device=fake_strip)
    entry = MockConfigEntry(
        domain=DOMAIN, title="Wohnzimmer", data={CONF_SWITCHBOT_ENTRY_ID: core.entry_id}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry
