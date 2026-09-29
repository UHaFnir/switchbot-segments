#!/usr/bin/env python3
"""Befehle direkt vom Rechner an einen Strip schicken -- Replay-Tests und Sicherheitsnetz.

Nutzt pySwitchbot wie HA (gleiche Verschluesselung), aber ausserhalb von HA, und
dieselbe Frame-Logik wie die Integration (custom_components/.../protocol.py).
Waehrend des Tests SwitchBot-App schliessen und den Strip nicht aus HA bedienen:
er nimmt nur eine BLE-Verbindung an.

    source .env
    .venv/bin/python scripts/send.py read                  # nur Lese-Befehle (0x4a)
    .venv/bin/python scripts/send.py snapshot snapshots/x.json
    .venv/bin/python scripts/send.py restore snapshots/x.json   # nur Unterschiede senden
    .venv/bin/python scripts/send.py set 30 00ff00         # EIN Segment setzen (0x49)
    .venv/bin/python scripts/send.py raw 570f4a03          # genau einen Frame (Experimente)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from bleak import BleakScanner
from bleak.backends.device import BLEDevice
from switchbot import SwitchbotRgbicNeonLight

sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parent.parent
        / "custom_components"
        / "switchbot_segments"
    ),
)
import protocol as p  # reines Modul, ohne HA-Import

SWITCHBOT_COMPANY_ID = 2409


async def _find(mac: str, timeout: float = 15) -> BLEDevice:
    """macOS liefert UUIDs statt MACs -- Geraet ueber die MAC im Advert finden."""
    target = bytes.fromhex(mac.replace(":", ""))
    found: asyncio.Future[BLEDevice] = asyncio.get_running_loop().create_future()

    def on_adv(device, adv) -> None:
        mfr = adv.manufacturer_data.get(SWITCHBOT_COMPANY_ID, b"")
        if mfr[:6] == target and not found.done():
            found.set_result(device)

    async with BleakScanner(on_adv):
        return await asyncio.wait_for(found, timeout)


async def _cmd(dev: SwitchbotRgbicNeonLight, frame: str, quiet: bool = False) -> bytes:
    result = await dev._send_command(frame)
    if not quiet:
        print(f"  {frame:<36} -> {result.hex() if result else None}")
    if not result or result[0] != p.STATUS_OK:
        raise SystemExit(f"Befehl {frame} fehlgeschlagen")
    return result


async def _read_all(dev: SwitchbotRgbicNeonLight) -> tuple[p.StripStatus, list[p.RGB]]:
    status = p.parse_status(await _cmd(dev, p.CMD_STATUS, quiet=True))
    colors: list[p.RGB] = []
    for expected, frame in p.read_colors_frames(status.segment_count):
        colors += p.parse_colors(await _cmd(dev, frame, quiet=True), expected)
    return status, colors


def _print_colors(colors: list[p.RGB]) -> None:
    for start in range(0, len(colors), 10):
        row = " ".join(p.rgb_to_hex(c) for c in colors[start : start + 10])
        print(f"  {start:2d}-{start + 9:2d}: {row}")


async def _run(dev: SwitchbotRgbicNeonLight, args: argparse.Namespace) -> None:
    if args.action == "read":
        status, colors = await _read_all(dev)
        print(status)
        _print_colors(colors)
    elif args.action == "snapshot":
        status, colors = await _read_all(dev)
        path = Path(args.file)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "mac": args.mac,
                    "taken": datetime.now(UTC).isoformat(timespec="seconds"),
                    "status": {
                        "is_on": status.is_on,
                        "brightness": status.brightness,
                        "mode": status.mode,
                        "segment_count": status.segment_count,
                    },
                    "colors": [p.rgb_to_hex(c) for c in colors],
                },
                indent=2,
            )
            + "\n"
        )
        print(status)
        _print_colors(colors)
        print(f"-> {path}")
    elif args.action == "restore":
        target = [
            p.hex_to_rgb(c) for c in json.loads(Path(args.file).read_text())["colors"]
        ]
        current = None if args.full else (await _read_all(dev))[1]
        frames = p.plan_frames(target, current)
        print(f"{len(frames)} Frames")
        for frame in frames:
            await _cmd(dev, frame)
        _, after = await _read_all(dev)
        if after != target:
            raise SystemExit("Zuruecklesen weicht vom Snapshot ab!")
        print("Zurueckgelesen: identisch mit Snapshot.")
    elif args.action == "raw":
        await _cmd(dev, args.frame.lower())
    else:
        for frame in p.set_segments_frames(p.hex_to_rgb(args.rgb), [args.index]):
            await _cmd(dev, frame)


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mac", default=os.environ.get("SB_STRIP_MAC"))
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("read")
    snap = sub.add_parser("snapshot")
    snap.add_argument("file")
    rest = sub.add_parser("restore")
    rest.add_argument("file")
    rest.add_argument(
        "--full",
        action="store_true",
        help="alle Segmente senden, nicht nur Unterschiede",
    )
    set_p = sub.add_parser("set")
    set_p.add_argument("index", type=int, help="Segment, 0-basiert")
    set_p.add_argument("rgb", help="Farbe als RRGGBB")
    raw_p = sub.add_parser("raw")
    raw_p.add_argument("frame", help="Klartext-Frame in Hex, beginnend mit 57")
    args = parser.parse_args()

    key_id, key = os.environ.get("SB_KEY_ID"), os.environ.get("SB_ENCRYPTION_KEY")
    if not (args.mac and key_id and key):
        raise SystemExit(
            "SB_STRIP_MAC, SB_KEY_ID, SB_ENCRYPTION_KEY fehlen -- source .env"
        )

    dev = SwitchbotRgbicNeonLight(
        await _find(args.mac), key_id=key_id, encryption_key=key
    )
    try:
        await _run(dev, args)
    finally:
        disconnect = getattr(dev, "_execute_disconnect", None)
        if disconnect:
            await disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
