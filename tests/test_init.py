"""Tests fuer Config Flow und Setup: Anbindung an den Core-Entry `switchbot`."""

from __future__ import annotations

from homeassistant.config_entries import SOURCE_USER, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.switchbot_segments.const import CONF_SWITCHBOT_ENTRY_ID, DOMAIN

from .conftest import add_core_entry


def _core_entry(hass: HomeAssistant, **kwargs) -> MockConfigEntry:
    return add_core_entry(hass, **kwargs)


async def test_flow_aborts_without_rope_light(hass: HomeAssistant) -> None:
    _core_entry(hass, sensor_type="meter")
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_devices"


async def test_flow_creates_entry(hass: HomeAssistant) -> None:
    core = _core_entry(hass)
    _core_entry(hass, sensor_type="meter", unique_id="aabbccddee02")
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert list(result["data_schema"].schema[CONF_SWITCHBOT_ENTRY_ID].container) == [
        core.entry_id
    ]

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SWITCHBOT_ENTRY_ID: core.entry_id}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == core.title
    assert result["data"] == {CONF_SWITCHBOT_ENTRY_ID: core.entry_id}
    assert result["result"].unique_id == core.unique_id


async def test_flow_hides_already_configured(hass: HomeAssistant) -> None:
    core = _core_entry(hass)
    MockConfigEntry(domain=DOMAIN, unique_id=core.unique_id).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_devices"


async def test_setup_uses_core_device(hass: HomeAssistant) -> None:
    core = _core_entry(hass)
    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_SWITCHBOT_ENTRY_ID: core.entry_id}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data.device is core.runtime_data.device
    assert (
        entry.runtime_data.controller.colors is None
    )  # beim Setup wird nichts gesendet

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert entry.state is ConfigEntryState.NOT_LOADED


async def test_setup_retries_while_core_not_loaded(hass: HomeAssistant) -> None:
    core = _core_entry(hass, state=ConfigEntryState.SETUP_RETRY)
    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_SWITCHBOT_ENTRY_ID: core.entry_id}
    )
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.SETUP_RETRY


async def test_setup_fails_when_core_removed(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_SWITCHBOT_ENTRY_ID: "gibtsnicht"})
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.SETUP_ERROR
