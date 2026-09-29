#!/usr/bin/env python3
"""Encryption-Key eines Strips einmalig aus dem SwitchBot-Konto holen.

Nur ein Lese-Call gegen die SwitchBot-API (wie der Config Flow der HA-Integration),
nichts geht an den Strip. Zugangsdaten werden abgefragt und nirgends gespeichert;
Key-ID und Schluessel landen in .env (untracked) und werden nicht ausgegeben.

    .venv/bin/python scripts/get_key.py            # nimmt SB_STRIP_MAC aus .env
    .venv/bin/python scripts/get_key.py aa:bb:cc:dd:ee:ff

Braucht ein echtes Terminal (Passwort-Abfrage) mit stdin.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import re
import sys
from pathlib import Path

import aiohttp
from switchbot import SwitchbotEncryptedDevice

ENV = Path(__file__).resolve().parent.parent / ".env"


def _env_value(name: str) -> str | None:
    if not ENV.exists():
        return None
    for line in ENV.read_text().splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].split("#", 1)[0].strip() or None
    return None


def _set_env(values: dict[str, str]) -> None:
    text = ENV.read_text() if ENV.exists() else ""
    for name, value in values.items():
        pattern = re.compile(rf"^{name}=.*$", re.MULTILINE)
        if pattern.search(text):
            text = pattern.sub(f"{name}={value}", text)
        else:
            text += f"{name}={value}\n"
    ENV.write_text(text)


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mac", nargs="?")
    args = parser.parse_args()
    mac = args.mac or _env_value("SB_STRIP_MAC")
    if not mac:
        raise SystemExit("MAC fehlt (Argument oder SB_STRIP_MAC in .env)")

    if not sys.stdin.isatty():
        raise SystemExit(
            "Kein interaktives Terminal -- bitte in einem eigenen Terminalfenster starten."
        )
    username = input("SwitchBot-Konto (E-Mail): ")
    password = getpass.getpass("Passwort: ")
    async with aiohttp.ClientSession() as session:
        result = await SwitchbotEncryptedDevice.async_retrieve_encryption_key(
            session, mac, username, password
        )
    _set_env(
        {"SB_KEY_ID": result["key_id"], "SB_ENCRYPTION_KEY": result["encryption_key"]}
    )
    print(f"Key fuer {mac} nach {ENV.name} geschrieben (SB_KEY_ID, SB_ENCRYPTION_KEY).")


if __name__ == "__main__":
    asyncio.run(main())
