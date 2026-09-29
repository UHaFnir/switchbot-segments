#!/usr/bin/env python3
"""BLE-Mitschnitt der SwitchBot-App entschluesseln -- rein passiv, sendet nichts.

Liest einen HCI-Mitschnitt, sucht die ATT-Writes an den Strip und dessen
Notifications, und entschluesselt beides mit dem Geraete-Schluessel -- so, wie
pySwitchbot 2.9.0 (`SwitchbotEncryptedDevice`) verschluesselt:

    Init   App -> Geraet  57 000000 0f2103 <kid>          (Klartext)
           Geraet -> App  <status> ?? <mode> ?? <IV>      (mode 0 = CTR/16-Byte-IV,
                                                           mode 1 = GCM/12-Byte-IV + 4)
    Befehl App -> Geraet  57 <kid> <hdr:2> <ciphertext>   Klartext = 57 + decrypt(ct)
           Geraet -> App  <status> ?? ?? ?? <ciphertext>

CTR: jeder Frame beginnt beim IV neu. GCM: nach jedem Befehl IV += 1.
Der Mitschnitt muss den Verbindungsaufbau enthalten, sonst fehlt der IV.

Formate: Apple PacketLogger (.pklg), btsnoop (Android `btsnoop_hci.log`), oder
Text mit einer Zeile pro Frame: `W <hex>` (Write) / `N <hex>` (Notification).

    source .env
    python3 scripts/decode_capture.py captures/segmente.pklg \
        --key-id "$SB_KEY_ID" --key "$SB_ENCRYPTION_KEY"
"""

from __future__ import annotations

import argparse
import struct
import sys
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

WRITE = "W"
NOTIFY = "N"

ATT_WRITE_REQ = 0x12
ATT_WRITE_CMD = 0x52
ATT_NOTIFY = 0x1B
L2CAP_CID_ATT = 0x0004
H4_ACL = 0x02

INIT_PREFIX = bytes.fromhex("570000000f2103")
MODE_CTR = 0
MODE_GCM = 1


@dataclass
class AttFrame:
    """Ein ATT-Wert in Richtung Geraet (W) oder vom Geraet (N)."""

    index: int
    kind: str
    handle: int
    value: bytes


# --------------------------------------------------------------------------- #
# Container-Formate -> HCI-ACL-Pakete
# --------------------------------------------------------------------------- #


def _iter_btsnoop(data: bytes) -> Iterator[tuple[bool, bytes]]:
    """(gesendet?, ACL-Nutzdaten ohne H4-Typbyte) aus einer btsnoop-Datei."""
    if data[:8] != b"btsnoop\0":
        raise ValueError("keine btsnoop-Datei")
    datalink = struct.unpack(">I", data[12:16])[0]
    pos = 16
    while pos + 24 <= len(data):
        _orig, incl, flags, _drops, _ts = struct.unpack(">IIIIq", data[pos : pos + 24])
        pkt = data[pos + 24 : pos + 24 + incl]
        pos += 24 + incl
        sent = not flags & 0x01
        if datalink == 1002:  # HCI UART (H4): erstes Byte ist der Pakettyp
            if pkt[:1] == bytes([H4_ACL]):
                yield sent, pkt[1:]
        # 1001: HCI ohne Typbyte, Flag-Bit 1 = Command/Event
        elif datalink == 1001 and not flags & 0x02:
            yield sent, pkt


def _iter_pklg(data: bytes) -> Iterator[tuple[bool, bytes]]:
    """(gesendet?, ACL-Nutzdaten) aus Apple PacketLogger (.pklg).

    Satz: Laenge(4) Zeitstempel(8) Typ(1) Daten. Neuere Dateien little-endian,
    alte big-endian -- am ersten Satz erkannt.
    """
    first_le = struct.unpack("<I", data[:4])[0]
    endian = "<" if 9 <= first_le <= len(data) else ">"
    pos = 0
    while pos + 13 <= len(data):
        length = struct.unpack(endian + "I", data[pos : pos + 4])[0]
        if length < 9:
            break
        ptype = data[pos + 12]
        body = data[pos + 13 : pos + 4 + length]
        pos += 4 + length
        if ptype == 0x02:
            yield True, body
        elif ptype == 0x03:
            yield False, body


def _iter_att(
    acl_packets: Iterable[tuple[bool, bytes]],
) -> Iterator[tuple[bool, bytes]]:
    """ACL-Fragmente zu L2CAP-Rahmen zusammensetzen, nur ATT-PDUs liefern."""
    pending: dict[tuple[bool, int], bytearray] = {}
    for sent, acl in acl_packets:
        if len(acl) < 4:
            continue
        hdr, _length = struct.unpack("<HH", acl[:4])
        conn, pb = hdr & 0x0FFF, (hdr >> 12) & 0x3
        key = (sent, conn)
        if pb == 0x1:  # Fortsetzung
            if key not in pending:
                continue
            pending[key] += acl[4:]
        else:
            pending[key] = bytearray(acl[4:])
        buf = pending[key]
        if len(buf) < 4:
            continue
        l2_len, cid = struct.unpack("<HH", buf[:4])
        if len(buf) < 4 + l2_len:
            continue
        del pending[key]
        if cid == L2CAP_CID_ATT:
            yield sent, bytes(buf[4 : 4 + l2_len])


def _att_frames(att_pdus: Iterable[tuple[bool, bytes]]) -> list[AttFrame]:
    frames: list[AttFrame] = []
    for sent, pdu in att_pdus:
        if len(pdu) < 3:
            continue
        opcode = pdu[0]
        handle = struct.unpack("<H", pdu[1:3])[0]
        value = pdu[3:]
        if sent and opcode in (ATT_WRITE_REQ, ATT_WRITE_CMD) and value[:1] == b"\x57":
            frames.append(AttFrame(len(frames), WRITE, handle, value))
        elif not sent and opcode == ATT_NOTIFY:
            frames.append(AttFrame(len(frames), NOTIFY, handle, value))
    return frames


def _text_frames(text: str) -> list[AttFrame]:
    frames: list[AttFrame] = []
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        kind, hexval = line.split(None, 1)
        frames.append(
            AttFrame(
                len(frames), kind.upper(), 0, bytes.fromhex(hexval.replace(" ", ""))
            )
        )
    return frames


def load_frames(path: Path) -> list[AttFrame]:
    """Mitschnitt laden; Format an Inhalt bzw. Endung erkennen."""
    data = path.read_bytes()
    if data[:8] == b"btsnoop\0":
        return _att_frames(_iter_att(_iter_btsnoop(data)))
    if path.suffix == ".pklg":
        return _att_frames(_iter_att(_iter_pklg(data)))
    return _text_frames(data.decode())


# --------------------------------------------------------------------------- #
# Entschluesselung
# --------------------------------------------------------------------------- #


@dataclass
class Decoded:
    """Ein Befehl mit Antwort, soweit entschluesselbar."""

    command: AttFrame
    plaintext: bytes | None
    response: AttFrame | None = None
    response_plaintext: bytes | None = None
    note: str = ""


class Session:
    """Verfolgt Init/IV ueber einen Mitschnitt, wie `SwitchbotEncryptedDevice`."""

    def __init__(self, key_id: str | None, key: str | None) -> None:
        self.key_id = bytes.fromhex(key_id) if key_id else None
        self.key = bytes.fromhex(key) if key else None
        self.iv: bytes | None = None
        self.mode: int | None = None

    def _decrypt(self, data: bytes) -> bytes:
        assert self.key is not None and self.iv is not None
        if self.mode == MODE_GCM:
            # Firmware liefert nur 2 Tag-Bytes -- wie pySwitchbot ohne finalize().
            dec = Cipher(
                algorithms.AES128(self.key), modes.GCM(self.iv, b"\x00" * 16)
            ).decryptor()
            return dec.update(data)
        dec = Cipher(algorithms.AES128(self.key), modes.CTR(self.iv)).decryptor()
        return dec.update(data) + dec.finalize()

    def _advance(self) -> None:
        if self.mode == MODE_GCM and self.iv is not None:
            self.iv = (int.from_bytes(self.iv, "big") + 1).to_bytes(12, "big")

    def decode(self, frames: list[AttFrame]) -> list[Decoded]:
        out: list[Decoded] = []
        i = 0
        while i < len(frames):
            frame = frames[i]
            if frame.kind != WRITE:
                i += 1
                continue
            resp = (
                frames[i + 1]
                if i + 1 < len(frames) and frames[i + 1].kind == NOTIFY
                else None
            )
            i += 2 if resp else 1

            if frame.value.startswith(INIT_PREFIX):
                item = Decoded(
                    frame, frame.value, resp, resp.value if resp else None, "init"
                )
                if resp and len(resp.value) > 4:
                    self.mode = resp.value[2]
                    self.iv = (
                        resp.value[4:-4] if self.mode == MODE_GCM else resp.value[4:]
                    )
                    item.note = f"init: mode={'GCM' if self.mode == MODE_GCM else 'CTR'} iv={self.iv.hex()}"
                out.append(item)
                continue

            if self.key is None or self.iv is None or len(frame.value) < 4:
                why = (
                    "kein Schluessel"
                    if self.key is None
                    else "IV fehlt (Init nicht im Mitschnitt)"
                )
                out.append(Decoded(frame, None, resp, None, why))
                continue

            if self.key_id is not None and frame.value[1:2] != self.key_id:
                note = f"key_id {frame.value[1:2].hex()} != {self.key_id.hex()}"
            else:
                note = ""
            plaintext = b"\x57" + self._decrypt(frame.value[4:])
            resp_plain = None
            if resp is not None:
                resp_plain = resp.value[:1] + self._decrypt(resp.value[4:])
            self._advance()
            out.append(Decoded(frame, plaintext, resp, resp_plain, note))
        return out


def _fmt(data: bytes | None) -> str:
    return data.hex() if data is not None else "-"


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("capture", type=Path)
    parser.add_argument("--key-id", help="2 Hex-Zeichen (SB_KEY_ID)")
    parser.add_argument("--key", help="32 Hex-Zeichen (SB_ENCRYPTION_KEY)")
    parser.add_argument(
        "--raw",
        action="store_true",
        help="auch die verschluesselten Rohframes ausgeben",
    )
    args = parser.parse_args()

    frames = load_frames(args.capture)
    writes = sum(f.kind == WRITE for f in frames)
    print(f"{len(frames)} ATT-Frames, davon {writes} Writes mit 0x57", file=sys.stderr)

    for item in Session(args.key_id, args.key).decode(frames):
        line = f"#{item.command.index:04d} h=0x{item.command.handle:04x}  CMD {_fmt(item.plaintext)}"
        if item.response is not None:
            line += f"  ->  {_fmt(item.response_plaintext)}"
        if item.note:
            line += f"   [{item.note}]"
        print(line)
        if args.raw:
            print(f"        raw W {item.command.value.hex()}")
            if item.response is not None:
                print(f"        raw N {item.response.value.hex()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
