# SwitchBot RGBIC Neon Rope Light — BLE-Protokoll

Stand 2026-09-29: Transport und Verschlüsselung aus pySwitchbot übernommen, am Gerät bestätigt (CTR-Modus).
Segment-Befehle aus einem entschlüsselten App-Mitschnitt (SwitchBot-App 10.4, FW V0.8); Lesen (`4a03`, `4a0b`) und
Segment-Setzen (`490c`) am 2026-09-29 per Replay verifiziert (Rücklesen zeigt die gesetzte Farbe).

## Modell-Erkennung

| Feld | Wert |
|---|---|
| Hersteller-ID | `0x0969` (2409) |
| Service-Data-UUID | `0000fd3d-…` |
| Service-Data | `00 00 00 00 10 d0 b6` (letzte 4 Byte = Modell-Key `00 10 d0 b6` → „RGBIC Neon Rope Light“; `…d0 b5` = Wire-Variante) |
| BLE-Adresse | WLAN-MAC + 2 |

## Advertisement (Manufacturer Data, nach der Hersteller-ID)

| Byte | Bedeutung |
|---|---|
| 0–5 | MAC |
| 6 | Sequenznummer |
| 7 | Bit 7 = an, Bit 0–6 = Helligkeit (0–100) |
| 8 | Bit 7 = Delay, Bit 4–6 = Netzwerkzustand, Bit 0–3 = Farbmodus: 1 SEGMENTED, 2 RGB, 3 SCENE, 4 MUSIC, 5 CONTROLLER, 6 COLOR_TEMP, 7 EFFECT |
| 9–12 | unbekannt (beobachtet konstant `00 11 3a 00`) |

## GATT

Service `cba20d00-224d-11e6-9fb8-0002a5d5c51b`, Write `cba20002-…`, Notify `cba20003-…`.

## Verschlüsselung

1. Init (Klartext): `57 00 00 00 0f 21 03 <key_id>` → Antwort `<status> ?? <mode> ?? <IV>`;
   `mode` 0 = AES-128-CTR mit 16-Byte-IV, 1 = AES-128-GCM mit 12-Byte-IV (+4 Byte).
2. Befehl: Klartext `57 <payload>` wird gesendet als `57 <key_id> <hdr:2> AES(payload)`;
   `hdr` = IV[0:2] (CTR) bzw. Tag[0:2] (GCM).
3. Antwort: `<status> ?? ?? ?? AES(payload)`, Klartext = `<status>` + entschlüsselt.
4. CTR: jeder Frame beginnt beim IV neu. GCM: nach jedem Befehl IV += 1.

Key-ID und Schlüssel stammen aus dem SwitchBot-Konto (einmaliger Abruf, wie im Config Flow der Core-Integration).

## Befehle (Klartext)

| Frame | Bedeutung | Quelle |
|---|---|---|
| `570f4901…` | Licht-Steuerheader (An/Aus, Helligkeit, Farbe) | pySwitchbot `LIGHT_STRIP_CONTROL_HEADER` |
| `570f4907…` | Effekt-Frames, enthalten Farblisten | pySwitchbot `COMMON_EFFECTS` |
| `570f4a01` | Status lesen, siehe „Status-Frame“ | Mitschnitt, verifiziert |
| `570f4a03` | Segmentanzahl lesen → `01 3c` (60) | Mitschnitt |
| `570f4a0b <start> <n>` | Segmentfarben lesen, `n` = 5 pro Abfrage → `01` + n × RGB | Mitschnitt |
| `570f4a05` | unbekannt → `01 <4 Byte> 01 00…` | Mitschnitt |
| `570f490c 02 <R G B> <80+n> <idx₁ … idxₙ>` | **n Segmente auf eine Farbe setzen**, `idx` 0-basiert (0…59), n ≤ 8 | Mitschnitt + Replay |
| `570f4901 12 <bri> <R G B>` | ganzer Strip eine Farbe (RGB-Modus) | pySwitchbot, verifiziert |

`0x4a` = lesen, `0x49` = schreiben. Antwort auf jeden `49…`-Befehl ist der Status-Frame.

### Status-Frame (Antwort auf `4a01` und alle `49…`)

`01 <an> <bri> <R G B> 00 11 3a <??> <mode> <segmente>`

| Feld | Beispiel | Bedeutung |
|---|---|---|
| an | `80` | Bit 7 = an |
| bri | `64` / `2f` | Helligkeit 0–100 |
| R G B | | RGB-Modus: Strip-Farbe; Segment-Modus: zuletzt gesetzte Segmentfarbe |
| `??` | `ff` (RGB) / `00` (Segment) | unbekannt |
| mode | `01` / `02` | Farbmodus wie im Advert: 1 SEGMENTED, 2 RGB |
| segmente | `3c` | Segmentanzahl (60) |

### Segment-Setzen — Regeln (Replay 2026-09-29)

- `80 + n` kündigt eine **Liste von n Indizes** an (Bit 7 gesetzt). Nicht „Anzahl ab Index“: `82 1e` ohne zweiten
  Index setzt nur Segment 30.
- **Maximal 8 Indizes pro Frame** (Klartext-Frame ≤ 20 Byte → 12 + n). Bei 9+ antwortet der Strip mit einem
  Nicht-Status-Frame (17 Byte) und ändert nichts.
- **Nur eine Farbgruppe pro Frame:** eine zweite `<RGB> <80+n> <idx…>`-Gruppe im selben Frame wird ignoriert.
- Aus dem RGB-Modus heraus schaltet ein Segment-Befehl den Strip **selbst in SEGMENTED**; die übrigen Segmentfarben
  bleiben gespeichert (RGB-Modus überschreibt den Segmentspeicher nicht).

### Offen

- Byte `02` nach `0c` (Typ/Modus?); das Byte vor `mode` im Status (`ff`/`00`).
- Helligkeit im Segment-Modus: gilt `4901 14 <bri>` (pySwitchbot-Helligkeit) auch dort?
- `570f4a05` → `01 <4 Byte> 01 00…`.
