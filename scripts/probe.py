#!/usr/bin/env python3
"""Passiver BLE-Scan nach den Neon-Strips -- hoert nur zu, verbindet sich nicht.

Dekodiert die Advertisements mit pySwitchbot (wie die HA-Integration) und
zusaetzlich roh, damit Abweichungen auffallen. Laeuft ausserhalb von HA.

    source .env
    .venv/bin/python scripts/probe.py                 # SB_STRIP_MAC / SB_STRIP2_MAC
    .venv/bin/python scripts/probe.py --seconds 60 aa:bb:cc:dd:ee:ff
"""

from __future__ import annotations

import argparse
import asyncio
import os

from bleak import BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from switchbot import parse_advertisement_data

SWITCHBOT_COMPANY_ID = 2409
COLOR_MODES = {
    1: "SEGMENTED",
    2: "RGB",
    3: "SCENE",
    4: "MUSIC",
    5: "CONTROLLER",
    6: "COLOR_TEMP",
    7: "EFFECT",
}


def _norm(mac: str) -> str:
    return mac.replace(":", "").replace("-", "").lower()


def _raw(mfr: bytes) -> str:
    """Bytes 6..8 nach `process_wostrip` -- unabhaengig von pySwitchbot."""
    if len(mfr) < 9:
        return f"zu kurz: {mfr.hex()}"
    b7, b8 = mfr[7], mfr[8]
    mode = b8 & 0x0F
    return (
        f"seq={mfr[6]:3d} on={bool(b7 & 0x80)!s:5} bri={b7 & 0x7F:3d} "
        f"net={(b8 >> 4) & 0x7} mode={mode}({COLOR_MODES.get(mode, '?')}) rest={mfr[9:].hex()}"
    )


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("macs", nargs="*")
    parser.add_argument("--seconds", type=float, default=20)
    args = parser.parse_args()
    macs = args.macs or [
        m
        for m in (os.environ.get("SB_STRIP_MAC"), os.environ.get("SB_STRIP2_MAC"))
        if m
    ]
    targets = {_norm(m) for m in macs}
    last: dict[str, str] = {}

    def on_adv(device: BLEDevice, adv: AdvertisementData) -> None:
        mfr = adv.manufacturer_data.get(SWITCHBOT_COMPANY_ID)
        if mfr is None or len(mfr) < 6:
            return
        mac = mfr[:6].hex()  # macOS liefert UUIDs statt MACs -- MAC steht im Advert
        if targets and mac not in targets:
            return
        parsed = parse_advertisement_data(device, adv)
        model = parsed.data.get("modelFriendlyName") if parsed else None
        data = parsed.data.get("data") if parsed else None
        # Scan-Response ohne Service-Daten -- naechstes Advert abwarten
        if model is None:
            return
        state = f"{model}  raw[{_raw(mfr)}]  pyswitchbot={data}"
        # nur Zustandswechsel ausgeben, RSSI schwankt staendig
        if last.get(mac) != state:
            last[mac] = state
            print(
                f"{':'.join(mac[i : i + 2] for i in range(0, 12, 2))}  rssi={adv.rssi:4d} {state}",
                flush=True,
            )

    async with BleakScanner(on_adv):
        await asyncio.sleep(args.seconds)
    if not last:
        print("Keine passenden Advertisements empfangen.")


if __name__ == "__main__":
    asyncio.run(main())
