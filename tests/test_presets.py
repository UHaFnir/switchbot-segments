"""Tests fuer presets.py."""

from __future__ import annotations

import pytest

from custom_components.switchbot_segments.layout import Layout
from custom_components.switchbot_segments.presets import (
    TEMPLATE_CORNER_ACCENT,
    TEMPLATE_GRADIENT,
    TEMPLATE_MIRROR,
    TEMPLATE_SECTION_GRADIENT,
    TEMPLATE_SECTIONS,
    TemplateError,
    palette_at,
    render,
)

RED = (255, 0, 0)
BLUE = (0, 0, 255)
WHITE = (255, 255, 255)

# 10 Segmente, Ecken auf 3 und 6: Abschnitte 0..3, 3..6, 6..9.
LAYOUT = Layout.from_dict(
    {
        "segment_count": 10,
        "start_direction": "right",
        "corners": [{"index": 3, "turn": "left"}, {"index": 6, "turn": "left"}],
    }
)


def test_palette_at_ends_and_steps() -> None:
    assert palette_at([RED, BLUE], 0, 6) == RED
    assert palette_at([RED, BLUE], 1, 6) == BLUE
    assert palette_at([RED], 0.5, 6) == RED
    # Auf 3 Stufen gerundet: nur Anfang, Mitte, Ende.
    colors = {palette_at([RED, BLUE], i / 20, 3) for i in range(21)}
    assert len(colors) == 3


def test_lerp_keeps_brightness() -> None:
    mid = palette_at([RED, BLUE], 0.5, 3)
    assert max(mid) == 255
    assert mid[0] == mid[2]


def test_sections_corner_takes_first_section() -> None:
    colors = render(TEMPLATE_SECTIONS, LAYOUT, [RED, BLUE, WHITE])
    assert colors == [RED] * 4 + [BLUE] * 3 + [WHITE] * 3


def test_sections_palette_wraps() -> None:
    colors = render(TEMPLATE_SECTIONS, LAYOUT, [RED, BLUE])
    assert colors[-1] == RED


def test_gradient_spans_whole_strip() -> None:
    colors = render(TEMPLATE_GRADIENT, LAYOUT, [RED, BLUE])
    assert len(colors) == 10
    assert colors[0] == RED
    assert colors[-1] == BLUE


def test_section_gradient_restarts_per_section() -> None:
    colors = render(TEMPLATE_SECTION_GRADIENT, LAYOUT, [RED, BLUE])
    assert len(colors) == 10
    assert colors[0] == RED
    assert colors[3] == BLUE  # Ecke: Ende des ersten Abschnitts
    assert colors[4] != RED  # zweiter Abschnitt startet auf der Ecke
    assert colors[-1] == BLUE


def test_mirror_is_symmetric() -> None:
    colors = render(TEMPLATE_MIRROR, LAYOUT, [RED, BLUE])
    assert colors == colors[::-1]
    assert colors[0] == RED


def test_corner_accent() -> None:
    colors = render(TEMPLATE_CORNER_ACCENT, LAYOUT, [WHITE, RED], accent_width=0)
    assert [i for i, c in enumerate(colors) if c == RED] == [3, 6]
    wide = render(TEMPLATE_CORNER_ACCENT, LAYOUT, [WHITE, RED], accent_width=1)
    assert [i for i, c in enumerate(wide) if c == RED] == [2, 3, 4, 5, 6, 7]


def test_corner_accent_without_corners_marks_ends() -> None:
    colors = render(
        TEMPLATE_CORNER_ACCENT, Layout.default(5), [WHITE, RED], accent_width=0
    )
    assert colors == [RED, WHITE, WHITE, WHITE, RED]


def test_errors() -> None:
    with pytest.raises(TemplateError):
        render(TEMPLATE_GRADIENT, LAYOUT, [])
    with pytest.raises(TemplateError):
        render(TEMPLATE_CORNER_ACCENT, LAYOUT, [RED])
    with pytest.raises(TemplateError):
        render("nope", LAYOUT, [RED])
