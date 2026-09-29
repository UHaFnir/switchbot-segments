"""Intelligente Presets: Farbvorlagen auf Basis der Abschnitte zwischen den Ecken.

Reines Modul ohne Home-Assistant-Import. Verlaeufe werden auf `steps` Farbstufen
gerundet -- jede Stufe kostet mindestens einen Frame, 60 verschiedene Farben
waeren 60 Frames.
"""

from __future__ import annotations

from collections.abc import Sequence

from .layout import Layout
from .protocol import RGB

TEMPLATE_SECTIONS = "sections"
TEMPLATE_GRADIENT = "gradient"
TEMPLATE_SECTION_GRADIENT = "section_gradient"
TEMPLATE_MIRROR = "mirror"
TEMPLATE_CORNER_ACCENT = "corner_accent"
TEMPLATES = (
    TEMPLATE_SECTIONS,
    TEMPLATE_GRADIENT,
    TEMPLATE_SECTION_GRADIENT,
    TEMPLATE_MIRROR,
    TEMPLATE_CORNER_ACCENT,
)

DEFAULT_STEPS = 6
DEFAULT_ACCENT_WIDTH = 1


class TemplateError(ValueError):
    """Vorlage oder Palette passt nicht."""


def _lerp(a: RGB, b: RGB, t: float) -> RGB:
    """Mischen mit gehaltener Helligkeit: Rot -> Blau laeuft ueber kraeftiges Magenta,
    nicht ueber ein dunkles (128, 0, 128) wie bei reinem RGB-Mischen."""
    mixed = [ca + (cb - ca) * t for ca, cb in zip(a, b, strict=True)]
    peak = max(mixed)
    target = max(a) + (max(b) - max(a)) * t
    scale = target / peak if peak else 0
    r, g, b_ = (min(255, round(c * scale)) for c in mixed)
    return (r, g, b_)


def palette_at(palette: Sequence[RGB], t: float, steps: int) -> RGB:
    """Farbe an Position t (0..1) eines Verlaufs durch `palette`, gerundet auf `steps` Stufen.

    Die erste und letzte Stufe sind exakt die erste und letzte Palettenfarbe.
    """
    if len(palette) == 1 or steps <= 1:
        return palette[0]
    t = min(1.0, max(0.0, t))
    band = min(steps - 1, int(t * steps))
    t = band / (steps - 1)
    pos = t * (len(palette) - 1)
    i = min(len(palette) - 2, int(pos))
    return _lerp(palette[i], palette[i + 1], pos - i)


def _gradient(length: int, palette: Sequence[RGB], steps: int) -> list[RGB]:
    if length == 1:
        return [palette[0]]
    return [palette_at(palette, i / (length - 1), steps) for i in range(length)]


def render(
    template: str,
    layout: Layout,
    palette: Sequence[RGB],
    steps: int = DEFAULT_STEPS,
    accent_width: int = DEFAULT_ACCENT_WIDTH,
) -> list[RGB]:
    """Farben fuer alle Segmente nach Vorlage."""
    if not palette:
        raise TemplateError("Mindestens eine Farbe angeben")
    count = layout.segment_count
    sections = layout.sections()

    if template == TEMPLATE_SECTIONS:
        # Ecksegment gehoert zu beiden Abschnitten -- es bekommt die Farbe des ersten.
        colors: list[RGB | None] = [None] * count
        for number, section in enumerate(sections):
            for index in section:
                if colors[index] is None:
                    colors[index] = palette[number % len(palette)]
        return [c for c in colors if c is not None]

    if template == TEMPLATE_GRADIENT:
        return _gradient(count, palette, steps)

    if template == TEMPLATE_SECTION_GRADIENT:
        colors = [None] * count
        for section in sections:
            for index, color in zip(
                section, _gradient(len(section), palette, steps), strict=True
            ):
                if colors[index] is None:
                    colors[index] = color
        return [c for c in colors if c is not None]

    if template == TEMPLATE_MIRROR:
        # Aussen erste Palettenfarbe, zur Strip-Mitte hin die letzte.
        half = (count - 1) / 2 or 1
        return [
            palette_at(palette, min(i, count - 1 - i) / half, steps)
            for i in range(count)
        ]

    if template == TEMPLATE_CORNER_ACCENT:
        if len(palette) < 2:
            raise TemplateError("Ecken-Akzent braucht Grund- und Akzentfarbe")
        base, accent = palette[0], palette[1]
        # Ohne Ecken: Akzent an beiden Enden.
        points = [c.index for c in layout.corners] or [0, count - 1]
        colors = [base] * count
        for point in points:
            for index in range(point - accent_width, point + accent_width + 1):
                if 0 <= index < count:
                    colors[index] = accent
        return colors

    raise TemplateError(f"Unbekannte Vorlage '{template}' (erlaubt: {TEMPLATES})")
