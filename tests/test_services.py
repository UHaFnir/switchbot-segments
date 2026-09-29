"""Tests fuer die Services."""

from __future__ import annotations

import pytest
import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.switchbot_segments.const import DOMAIN
from custom_components.switchbot_segments.services import parse_segments

from .conftest import LILA, ORANGE, FakeStrip


def test_parse_segments() -> None:
    assert parse_segments("0-2, 5,7-8") == [0, 1, 2, 5, 7, 8]
    assert parse_segments([3, 4]) == [3, 4]
    assert parse_segments(9) == [9]
    with pytest.raises(vol.Invalid):
        parse_segments("5-3")


async def test_set_segments(
    hass: HomeAssistant, strip_entry: MockConfigEntry, fake_strip: FakeStrip
) -> None:
    await hass.services.async_call(
        DOMAIN,
        "set_segments",
        {
            "strip": strip_entry.entry_id,
            "segments": [
                {"segments": "0-1", "color": [0, 255, 0]},
                {"segments": [59], "color": [0, 0, 255]},
            ],
        },
        blocking=True,
    )
    assert fake_strip.colors[:3] == [(0, 255, 0), (0, 255, 0), LILA]
    assert fake_strip.colors[59] == (0, 0, 255)


async def test_snapshot_and_restore(
    hass: HomeAssistant, strip_entry: MockConfigEntry, fake_strip: FakeStrip
) -> None:
    await hass.services.async_call(
        DOMAIN, "snapshot", {"strip": strip_entry.entry_id}, blocking=True
    )
    fake_strip.colors = [(1, 2, 3)] * 60
    strip_entry.runtime_data.controller.colors = (
        None  # Strip wurde von aussen veraendert
    )
    await hass.services.async_call(
        DOMAIN, "restore", {"strip": strip_entry.entry_id}, blocking=True
    )
    assert fake_strip.colors == [LILA] * 14 + [ORANGE] * 46

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "restore",
            {"strip": strip_entry.entry_id, "name": "gibtsnicht"},
            blocking=True,
        )


async def test_unknown_strip(hass: HomeAssistant, strip_entry: MockConfigEntry) -> None:
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "snapshot", {"strip": "nope"}, blocking=True
        )
