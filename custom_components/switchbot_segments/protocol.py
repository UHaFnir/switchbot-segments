"""Segment-Protokoll der SwitchBot RGBIC Neon Rope Lights (docs/PROTOCOL.md).

Reine Funktionen ohne Home-Assistant-Import -- dieselbe Logik nutzen die
Integration und die Skripte unter scripts/. Frames sind Klartext-Hex (`57…`);
Verschluesselung und Transport uebernimmt pySwitchbot (`_send_command`).
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

type RGB = tuple[int, int, int]

CMD_STATUS = "570f4a01"
CMD_SEGMENT_COUNT = "570f4a03"
CMD_READ_COLORS = "570f4a0b"
CMD_SET_SEGMENTS = "570f490c02"

STATUS_OK = 0x01
# Klartext-Frame max. 20 Byte: 12 Byte Kopf/Farbe + n Indizes (am Geraet gemessen).
MAX_SEGMENTS_PER_FRAME = 8
# Die App liest 5 Farben pro Abfrage -- mehr ist nicht getestet.
COLORS_PER_READ = 5

MODE_SEGMENTED = 1
MODE_RGB = 2


class ProtocolError(Exception):
    """Antwort des Strips passt nicht zum erwarteten Format."""


@dataclass(frozen=True)
class StripStatus:
    """Antwort auf `4a01` bzw. auf jeden `49…`-Befehl."""

    is_on: bool
    brightness: int
    rgb: RGB
    mode: int
    segment_count: int


def rgb_to_hex(rgb: RGB) -> str:
    """(r, g, b) -> 'rrggbb'."""
    return "".join(f"{c:02x}" for c in rgb)


def hex_to_rgb(value: str) -> RGB:
    """'rrggbb' (optional mit #) -> (r, g, b)."""
    value = value.removeprefix("#")
    if len(value) != 6:
        raise ValueError(f"Farbe muss RRGGBB sein: {value!r}")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def _check_ok(response: bytes | None) -> bytes:
    if not response or response[0] != STATUS_OK:
        raise ProtocolError(f"Fehlerantwort: {response.hex() if response else None}")
    return response


def parse_status(response: bytes | None) -> StripStatus:
    """`01 <an> <bri> <R G B> 00 11 3a <??> <mode> <segmente>` auswerten."""
    data = _check_ok(response)
    if len(data) != 12:
        raise ProtocolError(f"Status-Frame hat {len(data)} statt 12 Byte: {data.hex()}")
    return StripStatus(
        is_on=bool(data[1] & 0x80),
        brightness=data[2],
        rgb=(data[3], data[4], data[5]),
        mode=data[10],
        segment_count=data[11],
    )


def parse_segment_count(response: bytes | None) -> int:
    """Antwort auf `4a03`: `01 <anzahl>`."""
    data = _check_ok(response)
    if len(data) != 2:
        raise ProtocolError(f"Segmentanzahl-Frame unerwartet: {data.hex()}")
    return data[1]


def read_colors_frame(start: int, count: int) -> str:
    """Frame fuer `4a0b`: `count` Segmentfarben ab `start` lesen."""
    if not 0 < count <= COLORS_PER_READ:
        raise ValueError(f"count muss 1..{COLORS_PER_READ} sein")
    return f"{CMD_READ_COLORS}{start:02x}{count:02x}"


def read_colors_frames(segment_count: int) -> list[tuple[int, str]]:
    """Alle Lese-Frames fuer den ganzen Strip, als (erwartete Anzahl, Frame)."""
    return [
        (n := min(COLORS_PER_READ, segment_count - start), read_colors_frame(start, n))
        for start in range(0, segment_count, COLORS_PER_READ)
    ]


def parse_colors(response: bytes | None, expected: int) -> list[RGB]:
    """Antwort auf `4a0b`: `01` + n x RGB."""
    data = _check_ok(response)[1:]
    if len(data) != 3 * expected:
        raise ProtocolError(f"{expected} Farben erwartet, Antwort: {response.hex()}")
    return [(data[i], data[i + 1], data[i + 2]) for i in range(0, len(data), 3)]


def set_segments_frames(color: RGB, indices: Iterable[int]) -> list[str]:
    """Frames, die alle `indices` auf `color` setzen -- je Frame max. 8 Indizes."""
    ordered = sorted(set(indices))
    if any(not 0 <= i <= 0xFF for i in ordered):
        raise ValueError("Segment-Index ausserhalb 0..255")
    head = f"{CMD_SET_SEGMENTS}{rgb_to_hex(color)}"
    return [
        head + f"{0x80 + len(chunk):02x}" + "".join(f"{i:02x}" for i in chunk)
        for chunk in (
            ordered[pos : pos + MAX_SEGMENTS_PER_FRAME]
            for pos in range(0, len(ordered), MAX_SEGMENTS_PER_FRAME)
        )
    ]


def plan_frames(
    target: Sequence[RGB], current: Sequence[RGB] | None = None
) -> list[str]:
    """Minimale Frame-Liste, um von `current` zu `target` zu kommen.

    Nur geaenderte Segmente, nach Farbe gruppiert (eine Farbe pro Frame), Gruppen in
    der Reihenfolge ihres ersten Segments. Ohne `current` wird alles gesendet.
    """
    if current is not None and len(current) != len(target):
        raise ValueError("current und target haben unterschiedliche Laenge")
    groups: dict[RGB, list[int]] = {}
    for index, color in enumerate(target):
        if current is None or current[index] != color:
            groups.setdefault(color, []).append(index)
    frames: list[str] = []
    for color, indices in groups.items():
        frames += set_segments_frames(color, indices)
    return frames


def plan_wipe_frames(
    target: Sequence[RGB],
    current: Sequence[RGB],
    per_frame: int = 2,
    reverse: bool = False,
) -> list[str]:
    """Wie plan_frames, aber als Wisch-Uebergang: geaenderte Segmente in Strip-Reihenfolge,
    hoechstens `per_frame` benachbarte gleicher Zielfarbe pro Frame.

    Mehr Frames als plan_frames, dafuer laeuft die Aenderung sichtbar den Strip entlang
    statt in Farbbloecken quer ueber ihn zu springen. `reverse`: vom Strip-Ende her.
    """
    if len(current) != len(target):
        raise ValueError("current und target haben unterschiedliche Laenge")
    per_frame = max(1, min(per_frame, MAX_SEGMENTS_PER_FRAME))
    frames: list[str] = []
    chunk: list[int] = []
    order = range(len(target) - 1, -1, -1) if reverse else range(len(target))
    for index in order:
        color = target[index]
        if current[index] == color:
            continue
        if chunk and (len(chunk) == per_frame or target[chunk[0]] != color):
            frames += set_segments_frames(target[chunk[0]], chunk)
            chunk = []
        chunk.append(index)
    if chunk:
        frames += set_segments_frames(target[chunk[0]], chunk)
    return frames
