"""The SwitchBot Segments integration.

Begleit-Integration zur Core-Integration `switchbot`: sie baut keine eigene
BLE-Verbindung auf, sondern nutzt das pySwitchbot-Geraet, das die Core-Integration
fuer den Strip ohnehin haelt (`entry.runtime_data.device`). So teilen sich beide
Operation-Lock, Verbindung und Verschluesselungs-Zustand.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError, ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import panel, services, websocket
from .const import CONF_SWITCHBOT_ENTRY_ID, DOMAIN, PLATFORMS
from .runtime import SegmentsConfigEntry, SegmentsRuntime
from .store import StripStore

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Domain-weit einmalig: WebSocket-API, Services, Seitenleisten-Panel."""
    websocket.async_register(hass)
    services.async_register(hass)
    await panel.async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SegmentsConfigEntry) -> bool:
    """Set up SwitchBot Segments from a config entry."""
    core_id: str = entry.data[CONF_SWITCHBOT_ENTRY_ID]
    core = hass.config_entries.async_get_entry(core_id)
    if core is None:
        raise ConfigEntryError(
            "Der zugehoerige SwitchBot-Eintrag existiert nicht mehr -- "
            "SwitchBot Segments entfernen und neu einrichten."
        )
    if core.state is not ConfigEntryState.LOADED:
        raise ConfigEntryNotReady(
            f"SwitchBot-Eintrag '{core.title}' ist noch nicht geladen"
        )

    store = StripStore(hass, entry.entry_id)
    await store.async_load()
    entry.runtime_data = SegmentsRuntime(hass, entry.entry_id, core_id, store)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: SegmentsConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
