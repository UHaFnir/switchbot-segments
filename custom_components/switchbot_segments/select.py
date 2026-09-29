"""Preset-Auswahl je Strip -- nutzbar in Szenen und Automationen."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import (
    CONF_SWITCHBOT_ENTRY_ID,
    signal_colors_updated,
    signal_presets_updated,
)
from .runtime import SegmentsConfigEntry


async def async_setup_entry(
    hass: HomeAssistant,
    entry: SegmentsConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Preset-Select anlegen, am Geraet der Core-Integration."""
    core = hass.config_entries.async_get_entry(entry.data[CONF_SWITCHBOT_ENTRY_ID])
    address = core.data.get("address") if core else None
    async_add_entities([PresetSelect(entry, address)])


class PresetSelect(SelectEntity):
    """Zeigt das anliegende Preset; Auswahl wendet ein Preset an."""

    _attr_has_entity_name = True
    _attr_translation_key = "preset"
    _attr_should_poll = False

    def __init__(self, entry: SegmentsConfigEntry, address: str | None) -> None:
        self._rt = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_preset"
        if address:
            self._attr_device_info = DeviceInfo(
                connections={(dr.CONNECTION_BLUETOOTH, address)}
            )

    @property
    def options(self) -> list[str]:
        return sorted(self._rt.store.presets)

    @property
    def current_option(self) -> str | None:
        return self._rt.active_preset()

    async def async_select_option(self, option: str) -> None:
        await self._rt.async_apply_preset(option)

    async def async_added_to_hass(self) -> None:
        for signal in (
            signal_colors_updated(self._rt.entry_id),
            signal_presets_updated(self._rt.entry_id),
        ):
            self.async_on_remove(
                async_dispatcher_connect(self.hass, signal, self._updated)
            )

    @callback
    def _updated(self) -> None:
        self.async_write_ha_state()
