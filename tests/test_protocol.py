"""Tests fuer protocol.py -- Frames stammen aus dem App-Mitschnitt und dem Replay."""

from __future__ import annotations

import pytest

from custom_components.switchbot_segments.protocol import (
    MODE_SEGMENTED,
    ProtocolError,
    hex_to_rgb,
    parse_colors,
    parse_segment_count,
    parse_status,
    plan_frames,
    read_colors_frames,
    set_segments_frames,
)

RED = (0xFF, 0, 0)
LILA = hex_to_rgb("c857ff")
ORANGE = hex_to_rgb("ff9f00")


def test_single_segment_matches_app_frame() -> None:
    assert set_segments_frames(RED, [0]) == ["570f490c02ff00008100"]
    assert set_segments_frames(hex_to_rgb("fff500"), [59]) == ["570f490c02fff500813b"]


def test_index_list_is_sorted_deduplicated_and_chunked_by_8() -> None:
    frames = set_segments_frames(RED, [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8])
    assert frames == [
        "570f490c02ff0000880001020304050607",
        "570f490c02ff000082" + "0809",
    ]
    # 12 Byte Kopf + 8 Indizes = 20 Byte, das gemessene Maximum
    assert all(len(bytes.fromhex(f)) <= 20 for f in frames)


def test_index_out_of_range() -> None:
    with pytest.raises(ValueError):
        set_segments_frames(RED, [256])


def test_plan_full_preset_needs_8_frames() -> None:
    target = [LILA] * 14 + [ORANGE] * 46
    frames = plan_frames(target)
    assert len(frames) == 2 + 6
    assert frames[0] == "570f490c02c857ff880001020304050607"
    assert frames[1] == "570f490c02c857ff8608090a0b0c0d"


def test_plan_sends_only_differences() -> None:
    current = [LILA] * 14 + [ORANGE] * 46
    target = list(current)
    target[30] = (0, 0xFF, 0)
    target[31] = (0, 0xFF, 0)
    assert plan_frames(target, current) == ["570f490c0200ff00821e1f"]
    assert plan_frames(current, current) == []


def test_plan_length_mismatch() -> None:
    with pytest.raises(ValueError):
        plan_frames([RED], [RED, RED])


def test_parse_status_segment_and_rgb_mode() -> None:
    seg = parse_status(bytes.fromhex("018064c857ff00113a00013c"))
    assert (seg.is_on, seg.brightness, seg.rgb, seg.mode, seg.segment_count) == (
        True,
        100,
        LILA,
        MODE_SEGMENTED,
        60,
    )
    assert parse_status(bytes.fromhex("018064ff00ff00113aff023c")).mode == 2


def test_parse_rejects_error_and_garbage() -> None:
    with pytest.raises(ProtocolError):
        parse_status(None)
    with pytest.raises(ProtocolError):
        parse_status(bytes.fromhex("00"))
    # Antwort des Strips auf einen zu langen Frame (9+ Indizes)
    with pytest.raises(ProtocolError):
        parse_status(bytes.fromhex("015a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a"))


def test_read_frames_and_colors() -> None:
    frames = read_colors_frames(60)
    assert len(frames) == 12
    assert frames[0] == (5, "570f4a0b0005")
    assert frames[-1] == (5, "570f4a0b3705")
    assert read_colors_frames(7)[-1] == (2, "570f4a0b0502")
    colors = parse_colors(bytes.fromhex("01c857ffc857ffc857ffc857ffff9f00"), 5)
    assert colors == [LILA] * 4 + [ORANGE]
    with pytest.raises(ProtocolError):
        parse_colors(bytes.fromhex("01c857ff"), 5)
    assert parse_segment_count(bytes.fromhex("013c")) == 60
