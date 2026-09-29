"""Konstanten fuer SwitchBot Segments."""

from __future__ import annotations

from homeassistant.const import Platform

DOMAIN = "switchbot_segments"

# Die Core-Integration, an deren Config Entry wir uns haengen.
SWITCHBOT_DOMAIN = "switchbot"
SWITCHBOT_CONF_SENSOR_TYPE = "sensor_type"

CONF_SWITCHBOT_ENTRY_ID = "switchbot_entry_id"

# Optionen (Zahnrad der Integration) -- werden bei jedem Auftrag frisch gelesen.
CONF_TRANSITION = "transition"
TRANSITION_WIPE = "wipe"
TRANSITION_DIRECT = "direct"
CONF_SEGMENTS_PER_FRAME = "segments_per_frame"
CONF_WIPE_MIN_CHANGED = "wipe_min_changed"
CONF_WIPE_FROM = "wipe_from"
WIPE_FROM_START = "start"
WIPE_FROM_END = "end"
CONF_FRAME_DELAY_MS = "frame_delay_ms"
CONF_LIVE_DELAY_MS = "live_delay_ms"
DEFAULT_OPTIONS = {
    CONF_TRANSITION: TRANSITION_WIPE,
    CONF_SEGMENTS_PER_FRAME: 8,
    CONF_WIPE_MIN_CHANGED: 9,
    CONF_WIPE_FROM: WIPE_FROM_START,
    CONF_FRAME_DELAY_MS: 0,
    CONF_LIVE_DELAY_MS: 250,
}

# `sensor_type`-Werte der Core-Integration (SupportedModels), fuer die es Segmente gibt.
SUPPORTED_SENSOR_TYPES = ("rgbic_neon_rope_light", "rgbic_neon_wire_rope_light")

PLATFORMS: list[Platform] = [Platform.SELECT]

# Snapshot, den die Kalibrier-Vorschau vor dem ersten Umfaerben anlegt -- ueberlebt
# auch einen HA-Neustart mitten in der Vorschau (Service `restore`).
SNAPSHOT_BEFORE_PREVIEW = "vor_kalibrierung"
# Stand vor der letzten Aenderung aus Panel, Preset oder Service -- ein Schritt zurueck.
SNAPSHOT_BEFORE_CHANGE = "vor_aenderung"
DEFAULT_SNAPSHOT = "default"
DEFAULT_SEGMENT_COUNT = 60


def signal_colors_updated(entry_id: str) -> str:
    """Dispatcher-Signal: Farbstand eines Strips hat sich geaendert."""
    return f"{DOMAIN}_colors_updated_{entry_id}"


def signal_presets_updated(entry_id: str) -> str:
    """Dispatcher-Signal: Presets eines Strips wurden gespeichert oder geloescht."""
    return f"{DOMAIN}_presets_updated_{entry_id}"
