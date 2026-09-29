"""Tests fuer scripts/decode_capture.py.

Erzeugt Mitschnitte so, wie pySwitchbot verschluesselt, verpackt sie in echte
Container-Formate und prueft, dass der Decoder den Klartext zurueckbekommt.
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import decode_capture as dc

KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
KEY_ID = "a1"
IV_CTR = bytes(range(16))
IV_GCM = bytes(range(12))
COMMANDS = [bytes.fromhex("570f4901010164"), bytes.fromhex("570f49070200033c01")]
REPLY = bytes.fromhex("01ff00")


def _encrypt(mode: int, iv: bytes, data: bytes) -> tuple[bytes, bytes]:
    """(Header, Ciphertext) wie `SwitchbotEncryptedDevice._encrypt`."""
    if mode == dc.MODE_GCM:
        enc = Cipher(algorithms.AES128(KEY), modes.GCM(iv)).encryptor()
        ct = enc.update(data) + enc.finalize()
        return enc.tag[:2], ct
    enc = Cipher(algorithms.AES128(KEY), modes.CTR(iv)).encryptor()
    return iv[:2], enc.update(data) + enc.finalize()


def _session(mode: int) -> list[tuple[str, bytes]]:
    """Init + zwei Befehle mit Antworten, als (W|N, ATT-Wert)."""
    iv = IV_GCM if mode == dc.MODE_GCM else IV_CTR
    init_resp = (
        bytes([0x01, 0x00, mode, 0x00])
        + iv
        + (b"\0" * 4 if mode == dc.MODE_GCM else b"")
    )
    frames = [("W", dc.INIT_PREFIX + bytes.fromhex(KEY_ID)), ("N", init_resp)]
    for cmd in COMMANDS:
        hdr, ct = _encrypt(mode, iv, cmd[1:])
        frames.append(("W", b"\x57" + bytes.fromhex(KEY_ID) + hdr + ct))
        _, rct = _encrypt(mode, iv, REPLY[1:])
        frames.append(("N", REPLY[:1] + b"\0\0\0" + rct))
        if mode == dc.MODE_GCM:
            iv = (int.from_bytes(iv, "big") + 1).to_bytes(12, "big")
    return frames


def _acl(kind: str, value: bytes) -> bytes:
    opcode = dc.ATT_WRITE_CMD if kind == "W" else dc.ATT_NOTIFY
    att = bytes([opcode]) + struct.pack("<H", 0x0010) + value
    l2cap = struct.pack("<HH", len(att), dc.L2CAP_CID_ATT) + att
    return struct.pack("<HH", 0x0040 | (0x2 << 12), len(l2cap)) + l2cap


def _btsnoop(frames: list[tuple[str, bytes]]) -> bytes:
    out = b"btsnoop\0" + struct.pack(">II", 1, 1002)
    for kind, value in frames:
        pkt = bytes([dc.H4_ACL]) + _acl(kind, value)
        flags = 0 if kind == "W" else 1
        out += struct.pack(">IIIIq", len(pkt), len(pkt), flags, 0, 0) + pkt
    return out


def _pklg(frames: list[tuple[str, bytes]]) -> bytes:
    out = b""
    for kind, value in frames:
        body = _acl(kind, value)
        out += (
            struct.pack("<Iq", 9 + len(body), 0)
            + bytes([0x02 if kind == "W" else 0x03])
            + body
        )
    return out


def _check(decoded: list[dc.Decoded], mode: int) -> None:
    assert decoded[0].note.startswith(
        "init: mode=" + ("GCM" if mode == dc.MODE_GCM else "CTR")
    )
    assert [d.plaintext for d in decoded[1:]] == COMMANDS
    assert all(d.response_plaintext == REPLY for d in decoded[1:])


@pytest.mark.parametrize("mode", [dc.MODE_CTR, dc.MODE_GCM])
def test_btsnoop_roundtrip(tmp_path: Path, mode: int) -> None:
    path = tmp_path / "btsnoop_hci.log"
    path.write_bytes(_btsnoop(_session(mode)))
    _check(dc.Session(KEY_ID, KEY.hex()).decode(dc.load_frames(path)), mode)


@pytest.mark.parametrize("mode", [dc.MODE_CTR, dc.MODE_GCM])
def test_pklg_roundtrip(tmp_path: Path, mode: int) -> None:
    path = tmp_path / "capture.pklg"
    path.write_bytes(_pklg(_session(mode)))
    _check(dc.Session(KEY_ID, KEY.hex()).decode(dc.load_frames(path)), mode)


def test_text_format(tmp_path: Path) -> None:
    path = tmp_path / "frames.txt"
    path.write_text(
        "\n".join(f"{k} {v.hex()}  # Kommentar" for k, v in _session(dc.MODE_CTR))
    )
    _check(dc.Session(KEY_ID, KEY.hex()).decode(dc.load_frames(path)), dc.MODE_CTR)


def test_without_key_reports_raw() -> None:
    frames = [dc.AttFrame(i, k, 0, v) for i, (k, v) in enumerate(_session(dc.MODE_CTR))]
    decoded = dc.Session(None, None).decode(frames)
    assert decoded[1].plaintext is None
    assert decoded[1].note == "kein Schluessel"


def test_missing_init_reports_missing_iv() -> None:
    frames = [
        dc.AttFrame(i, k, 0, v) for i, (k, v) in enumerate(_session(dc.MODE_CTR)[2:])
    ]
    decoded = dc.Session(KEY_ID, KEY.hex()).decode(frames)
    assert decoded[0].plaintext is None
    assert "IV fehlt" in decoded[0].note
