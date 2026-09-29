"""Laufzeitdaten je Strip und Lookup fuer WebSocket-API und Services."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady, ServiceValidationError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from . import presets
from .const import (
    CONF_FRAME_DELAY_MS,
    CONF_SEGMENTS_PER_FRAME,
    CONF_TRANSITION,
    CONF_WIPE_FROM,
    CONF_WIPE_MIN_CHANGED,
    DEFAULT_OPTIONS,
    DOMAIN,
    SNAPSHOT_BEFORE_CHANGE,
    TRANSITION_WIPE,
    WIPE_FROM_END,
    signal_presets_updated,
)
from .layout import Layout
from .store import StripStore
from .strip import StripController, Transition

if TYPE_CHECKING:
    from switchbot import SwitchbotDevice

    from .protocol import RGB


@dataclass
class SegmentsRuntime:
    """Laufzeitdaten eines Strips."""

    hass: HomeAssistant
    entry_id: str
    switchbot_entry_id: str
    store: StripStore
    controller: StripController = field(init=False)
    # Farbstand vor der Kalibrier-Vorschau und Zahl offener Vorschau-Sitzungen.
    preview_backup: list[RGB] | None = None
    preview_sessions: int = 0

    def __post_init__(self) -> None:
        self.controller = StripController(self.hass, self.entry_id, lambda: self.device)

    @property
    def device(self) -> SwitchbotDevice:
        """Das pySwitchbot-Geraet der Core-Integration.

        Nicht cachen: laedt die Core-Integration neu, gibt es ein neues Objekt.
        """
        core = self.hass.config_entries.async_get_entry(self.switchbot_entry_id)
        if core is None or core.state is not ConfigEntryState.LOADED:
            raise ConfigEntryNotReady("SwitchBot-Entry ist nicht geladen")
        return core.runtime_data.device

    @property
    def options(self) -> dict[str, Any]:
        """Optionen der Integration, fehlende mit Default -- bei jedem Zugriff frisch."""
        entry = self.hass.config_entries.async_get_entry(self.entry_id)
        return {**DEFAULT_OPTIONS, **(entry.options if entry else {})}

    def transition(self) -> Transition | None:
        opts = self.options
        if opts[CONF_TRANSITION] != TRANSITION_WIPE:
            return None
        return Transition(
            per_frame=int(opts[CONF_SEGMENTS_PER_FRAME]),
            min_changed=int(opts[CONF_WIPE_MIN_CHANGED]),
            reverse=opts[CONF_WIPE_FROM] == WIPE_FROM_END,
            frame_delay=int(opts[CONF_FRAME_DELAY_MS]) / 1000,
        )

    async def async_change(self, colors: Sequence[RGB]) -> int:
        """Strip auf `colors` bringen, vorher den bisherigen Stand sichern.

        Schreibweg fuer Panel, Presets und Services; die Kalibrier-Vorschau sichert selbst.
        """
        if self.preview_sessions:
            raise ServiceValidationError("Am Strip laeuft gerade die Kalibrier-Anzeige")
        before = self.controller.colors or await self.controller.async_read()
        if list(colors) != before:
            await self.store.async_save_snapshot(SNAPSHOT_BEFORE_CHANGE, before)
        return await self.controller.async_apply(colors, self.transition())

    async def async_apply_preset(self, name: str) -> int:
        colors = self.store.preset_colors(name)
        if colors is None:
            raise ServiceValidationError(f"Preset '{name}' gibt es nicht")
        return await self.async_change(colors)

    async def async_save_preset(self, name: str) -> None:
        """Aktuellen Stand des Strips als Preset speichern (ueberschreibt gleichen Namen)."""
        name = name.strip()
        if not name:
            raise ServiceValidationError("Preset braucht einen Namen")
        colors = self.controller.colors or await self.controller.async_read()
        await self.store.async_save_preset(name, colors)
        async_dispatcher_send(self.hass, signal_presets_updated(self.entry_id))

    async def async_delete_preset(self, name: str) -> None:
        await self.store.async_delete_preset(name)
        async_dispatcher_send(self.hass, signal_presets_updated(self.entry_id))

    async def async_render_template(
        self,
        template: str,
        palette: Sequence[RGB],
        steps: int,
        accent_width: int,
        layout: Layout | None = None,
    ) -> list[RGB]:
        """Farben einer Vorlage -- mit uebergebenem (Panel-Entwurf) oder gespeichertem Layout."""
        if layout is None:
            layout = self.store.layout
        if layout is None:
            colors = self.controller.colors or await self.controller.async_read()
            layout = Layout.default(len(colors))
        try:
            return presets.render(template, layout, palette, steps, accent_width)
        except presets.TemplateError as err:
            raise ServiceValidationError(str(err)) from err

    async def async_apply_template(
        self, template: str, palette: Sequence[RGB], steps: int, accent_width: int
    ) -> int:
        colors = await self.async_render_template(
            template, palette, steps, accent_width
        )
        return await self.async_change(colors)

    def active_preset(self) -> str | None:
        """Preset, das exakt dem bekannten Farbstand entspricht."""
        colors = self.controller.colors
        if colors is None:
            return None
        return next(
            (
                name
                for name in sorted(self.store.presets)
                if self.store.preset_colors(name) == colors
            ),
            None,
        )


type SegmentsConfigEntry = ConfigEntry[SegmentsRuntime]


def get_runtime(hass: HomeAssistant, entry_id: str) -> SegmentsRuntime:
    """Geladenen Strip zu einer Entry-ID holen, sonst verstaendlicher Fehler."""
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or entry.domain != DOMAIN:
        raise ServiceValidationError(f"Kein SwitchBot-Segments-Strip mit ID {entry_id}")
    if entry.state is not ConfigEntryState.LOADED:
        raise ServiceValidationError(f"Strip '{entry.title}' ist nicht geladen")
    return entry.runtime_data


def loaded_runtimes(hass: HomeAssistant) -> list[tuple[ConfigEntry, SegmentsRuntime]]:
    """Alle geladenen Strips."""
    return [
        (entry, entry.runtime_data)
        for entry in hass.config_entries.async_loaded_entries(DOMAIN)
    ]
