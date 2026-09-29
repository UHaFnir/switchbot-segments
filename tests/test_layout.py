"""Tests fuer layout.py."""

from __future__ import annotations

import pytest

from custom_components.switchbot_segments.layout import (
    CALIBRATION_BASE,
    CALIBRATION_CORNER,
    CALIBRATION_START,
    Layout,
    LayoutError,
)

# Umgekehrtes U um einen Schrank: hoch, oben rueber, runter.
U = {
    "segment_count": 60,
    "start_direction": "up",
    "corners": [{"index": 14, "turn": "right"}, {"index": 45, "turn": "right"}],
}


def test_roundtrip_and_sections() -> None:
    layout = Layout.from_dict(U)
    assert layout.as_dict() == U
    assert layout.sections() == [range(15), range(14, 46), range(45, 60)]
    assert Layout.default(60).sections() == [range(60)]


def test_calibration_colors() -> None:
    colors = Layout.from_dict(U).calibration_colors()
    assert len(colors) == 60
    assert colors[0] == CALIBRATION_START
    assert colors[14] == colors[45] == CALIBRATION_CORNER
    assert colors.count(CALIBRATION_BASE) == 57


@pytest.mark.parametrize(
    "change",
    [
        {"segment_count": 0},
        {"start_direction": "diagonal"},
        {"corners": [{"index": 0, "turn": "left"}]},
        {"corners": [{"index": 59, "turn": "left"}]},
        {"corners": [{"index": 20, "turn": "left"}, {"index": 10, "turn": "left"}]},
        {"corners": [{"index": 20, "turn": "left"}, {"index": 20, "turn": "right"}]},
        {"corners": [{"index": 20, "turn": "up"}]},
    ],
)
def test_invalid_layouts(change: dict) -> None:
    with pytest.raises(LayoutError):
        Layout.from_dict({**U, **change})
