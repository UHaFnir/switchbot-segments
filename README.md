# SwitchBot Segments

Home Assistant's SwitchBot integration can already switch your SwitchBot RGBIC Neon Rope Light on and off,
dim it and set one colour — locally, over Bluetooth. What it can't do is give each segment its own colour.

SwitchBot Segments adds exactly that. It sits next to the built-in SwitchBot integration and uses the same
Bluetooth connection, so on/off, brightness and the single-colour mode stay where they are.

## Features

- **Lightstrips panel** in the sidebar (admins only)
  - **Layout:** tell it how the strip hangs — start direction and the corners where it bends. *Show on strip*
    lights the strip up (start green, corners red) so you can drag the corners until they match the wall; the
    old colours come back afterwards.
  - **Colours:** paint single segments or a range straight onto the strip, fill everything in one colour, read
    the current colours back from the strip.
  - **Presets:** save the current state under a name and apply it again later.
  - **Templates:** colour per section, gradient along the strip, gradient per section, mirrored, corner accent —
    with a preview in the panel before anything is sent to the strip.
  - Works on phones: large touch targets, pinch to zoom and two-finger pan in the strip view.
- **Preset select entity** per strip — pick a preset from dashboards and automations.
- **Services** for automations (see below).
- **Wipe transition** for large changes: the new colours run along the strip instead of arriving in random
  chunks. Configurable in the integration options.

## Requirements

- Home Assistant 2026.8 or newer
- The neon strip set up in the built-in **SwitchBot Bluetooth** integration (including the encryption key)
- Supported models: RGBIC Neon Rope Light, RGBIC Neon Wire Rope Light

No extra Python packages — the integration uses the pySwitchbot version that ships with Home Assistant.

## Installation

**HACS:** add `https://github.com/UHaFnir/switchbot-segments` as a custom repository (category *Integration*),
install *SwitchBot Segments* and restart Home Assistant.

**Manually:** copy `custom_components/switchbot_segments/` into your `config/custom_components/` and restart.

Then: *Settings → Devices & services → Add integration → SwitchBot Segments* and pick the strip. The list
only shows strips that are already set up in the SwitchBot Bluetooth integration.

## Services

All services take a `strip` (the SwitchBot Segments config entry).

| Service | What it does |
|---|---|
| `switchbot_segments.set_segments` | Set segments to colours, e.g. `[{"segments": "0-13", "color": [200, 87, 255]}, {"segments": "14-59", "color": [255, 159, 0]}]` |
| `switchbot_segments.apply_template` | Apply a template (`sections`, `gradient`, `section_gradient`, `mirror`, `corner_accent`) with a list of `colors`; optional `steps` (gradient smoothness) and `accent_width` |
| `switchbot_segments.apply_preset` | Apply a preset saved in the panel, by `name` |
| `switchbot_segments.snapshot` | Read the current colours from the strip and keep them under `name` |
| `switchbot_segments.restore` | Send a snapshot back to the strip (only the segments that differ) |

## Options

*Settings → Devices & services → SwitchBot Segments → Configure* — takes effect immediately:

- **Transition** for large changes: *Wipe* (runs along the strip) or *Direct* (grouped by colour, fewest commands)
- **Segments per command** (1–8), **wipe from … changed segments**, **wipe direction**
- **Pause between commands** and **live display delay** in the panel

## How fast is it?

The strip accepts one colour for up to 8 segments per command and confirms every command before the next one
goes out, and only segments that actually change are sent. One colour on the whole strip is a handful of
commands; a gradient with 60 steps needs at least 60. The *Steps* setting on templates trades smoothness for speed.

## Protocol

The segment commands are documented in [`docs/PROTOCOL.md`](docs/PROTOCOL.md). They were taken from a decrypted
capture of the SwitchBot app and verified on real hardware; the integration only sends commands that were verified
this way.

## Development

```sh
python -m venv .venv && .venv/bin/pip install -r requirements_test.txt
.venv/bin/ruff check . && .venv/bin/pytest -q
cd frontend && npm install && npm run lint && npm test && npm run build
```

`npm run build` writes the panel bundle to `custom_components/switchbot_segments/frontend/panel.js`, which is
committed so the integration works without a build step. `scripts/` holds standalone tools for protocol work
(passive BLE scan, capture decoder, replay) that run outside Home Assistant.

## License

MIT
