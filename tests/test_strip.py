"""Tests fuer den StripController gegen den FakeStrip."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from custom_components.switchbot_segments.strip import StripController, StripError

from .conftest import LILA, ORANGE, FakeStrip

GREEN = (0, 255, 0)


def _controller(hass: HomeAssistant, strip: FakeStrip) -> StripController:
    return StripController(hass, "entry", lambda: strip)


async def test_read_uses_only_read_frames(
    hass: HomeAssistant, fake_strip: FakeStrip
) -> None:
    colors = await _controller(hass, fake_strip).async_read()
    assert colors == [LILA] * 14 + [ORANGE] * 46
    assert fake_strip.writes == []
    assert len(fake_strip.frames) == 1 + 12


async def test_apply_sends_only_differences(
    hass: HomeAssistant, fake_strip: FakeStrip
) -> None:
    ctrl = _controller(hass, fake_strip)
    target = list(fake_strip.colors)
    target[30] = target[31] = GREEN
    assert await ctrl.async_apply(target) == 1
    assert fake_strip.writes == ["570f490c0200ff00821e1f"]
    assert fake_strip.colors == target
    # gleicher Stand noch einmal: nichts senden, nicht neu lesen
    sent = len(fake_strip.frames)
    assert await ctrl.async_apply(target) == 0
    assert len(fake_strip.frames) == sent


async def test_full_repaint_is_chunked(
    hass: HomeAssistant, fake_strip: FakeStrip
) -> None:
    ctrl = _controller(hass, fake_strip)
    assert await ctrl.async_apply([GREEN] * 60) == 8
    assert fake_strip.colors == [GREEN] * 60


async def test_set_segments_keeps_others(
    hass: HomeAssistant, fake_strip: FakeStrip
) -> None:
    ctrl = _controller(hass, fake_strip)
    await ctrl.async_set_segments([([0, 59], GREEN)])
    assert fake_strip.colors[0] == fake_strip.colors[59] == GREEN
    assert fake_strip.colors[1:59] == [LILA] * 13 + [ORANGE] * 45
    with pytest.raises(HomeAssistantError):
        await ctrl.async_set_segments([([60], GREEN)])


async def test_failure_invalidates_cache(
    hass: HomeAssistant, fake_strip: FakeStrip
) -> None:
    ctrl = _controller(hass, fake_strip)
    await ctrl.async_read()
    fake_strip.fail_next = True
    with pytest.raises(StripError):
        await ctrl.async_apply([GREEN] * 60)
    assert ctrl.colors is None
    # naechster Auftrag liest erst neu und diffed gegen den echten Stand
    await ctrl.async_apply([GREEN] * 60)
    assert fake_strip.colors == [GREEN] * 60
