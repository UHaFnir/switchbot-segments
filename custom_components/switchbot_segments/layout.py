"""Strip-Layout: Ecken, Abschnitte, Kalibrierfarben.

Reines Modul ohne Home-Assistant-Import. Ein Layout beschreibt, wie der Strip
haengt: er startet in `start_direction` und knickt an jeder Ecke um 90 Grad nach
links oder rechts. Die Ecke sitzt *auf* einem Segment (`index`); dieses Segment
gehoert zu beiden angrenzenden Abschnitten. Die Geometrie fuer die Anzeige
rechnet das Frontend (frontend/src/geometry.ts) -- hier nur, was das Backend braucht.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise
from typing import Any

from .protocol import RGB

DIRECTIONS = ("right", "down", "left", "up")
TURNS = ("left", "right")

CALIBRATION_BASE: RGB = (255, 200, 0)  # gelb
CALIBRATION_CORNER: RGB = (255, 0, 0)  # rot
CALIBRATION_START: RGB = (0, 255, 0)  # gruen: Segment 0, zeigt Anfang und Richtung


class LayoutError(ValueError):
    """Layout ist in sich nicht stimmig."""


@dataclass(frozen=True)
class Corner:
    index: int
    turn: str


@dataclass(frozen=True)
class Layout:
    segment_count: int
    start_direction: str
    corners: tuple[Corner, ...]

    @classmethod
    def default(cls, segment_count: int) -> Layout:
        return cls(segment_count, "right", ())

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Layout:
        layout = cls(
            segment_count=int(data["segment_count"]),
            start_direction=str(data.get("start_direction", "right")),
            corners=tuple(
                Corner(int(c["index"]), str(c["turn"])) for c in data.get("corners", [])
            ),
        )
        layout.validate()
        return layout

    def as_dict(self) -> dict[str, Any]:
        return {
            "segment_count": self.segment_count,
            "start_direction": self.start_direction,
            "corners": [{"index": c.index, "turn": c.turn} for c in self.corners],
        }

    def validate(self) -> None:
        if not 1 <= self.segment_count <= 255:
            raise LayoutError("segment_count muss 1..255 sein")
        if self.start_direction not in DIRECTIONS:
            raise LayoutError(f"start_direction muss eins von {DIRECTIONS} sein")
        indices = [c.index for c in self.corners]
        if indices != sorted(set(indices)):
            raise LayoutError("Ecken muessen aufsteigend und eindeutig sein")
        for corner in self.corners:
            if not 0 < corner.index < self.segment_count - 1:
                raise LayoutError(
                    "Ecken nur auf inneren Segmenten (nicht am Anfang/Ende)"
                )
            if corner.turn not in TURNS:
                raise LayoutError(f"turn muss eins von {TURNS} sein")

    def sections(self) -> list[range]:
        """Abschnitte zwischen den Ecken; Ecksegmente gehoeren zu beiden Nachbarn."""
        bounds = [0, *(c.index for c in self.corners), self.segment_count - 1]
        return [range(a, b + 1) for a, b in pairwise(bounds)]

    def calibration_colors(self) -> list[RGB]:
        """Ganzer Strip gelb, Ecken rot, Segment 0 gruen."""
        colors = [CALIBRATION_BASE] * self.segment_count
        for corner in self.corners:
            colors[corner.index] = CALIBRATION_CORNER
        colors[0] = CALIBRATION_START
        return colors
