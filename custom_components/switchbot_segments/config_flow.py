"""Config flow fuer SwitchBot Segments.

Einziger Weg: einen Neon-Strip auswaehlen, der in der Core-Integration `switchbot`
schon eingerichtet ist. Adresse und Schluessel kommen damit von dort -- hier wird
nichts abgetippt und kein zweites Mal beim SwitchBot-Konto angemeldet.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_FRAME_DELAY_MS,
    CONF_LIVE_DELAY_MS,
    CONF_SEGMENTS_PER_FRAME,
    CONF_SWITCHBOT_ENTRY_ID,
    CONF_TRANSITION,
    CONF_WIPE_FROM,
    CONF_WIPE_MIN_CHANGED,
    DEFAULT_OPTIONS,
    DOMAIN,
    SUPPORTED_SENSOR_TYPES,
    SWITCHBOT_CONF_SENSOR_TYPE,
    SWITCHBOT_DOMAIN,
    TRANSITION_DIRECT,
    TRANSITION_WIPE,
    WIPE_FROM_END,
    WIPE_FROM_START,
)


def _unique_id(core: ConfigEntry) -> str:
    return core.unique_id or core.entry_id


class SwitchbotSegmentsConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for SwitchBot Segments."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return SwitchbotSegmentsOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Einen Strip aus den vorhandenen SwitchBot-Eintraegen waehlen."""
        configured = self._async_current_ids(include_ignore=False)
        candidates = {
            core.entry_id: core
            for core in self.hass.config_entries.async_entries(SWITCHBOT_DOMAIN)
            if core.data.get(SWITCHBOT_CONF_SENSOR_TYPE) in SUPPORTED_SENSOR_TYPES
            and _unique_id(core) not in configured
        }

        if user_input is not None:
            core = candidates[user_input[CONF_SWITCHBOT_ENTRY_ID]]
            await self.async_set_unique_id(_unique_id(core))
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=core.title,
                data={CONF_SWITCHBOT_ENTRY_ID: core.entry_id},
            )

        if not candidates:
            return self.async_abort(reason="no_devices")

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SWITCHBOT_ENTRY_ID): vol.In(
                        {entry_id: core.title for entry_id, core in candidates.items()}
                    )
                }
            ),
        )


def _number(minimum: int, maximum: int, unit: str | None = None, step: int = 1):
    config = selector.NumberSelectorConfig(
        min=minimum, max=maximum, step=step, mode=selector.NumberSelectorMode.BOX
    )
    if unit:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


def _choice(key: str, options: list[str]):
    return selector.SelectSelector(
        selector.SelectSelectorConfig(options=options, translation_key=key)
    )


OPTIONS_FIELDS = {
    CONF_TRANSITION: _choice(CONF_TRANSITION, [TRANSITION_WIPE, TRANSITION_DIRECT]),
    CONF_SEGMENTS_PER_FRAME: _number(1, 8),
    CONF_WIPE_MIN_CHANGED: _number(1, 255),
    CONF_WIPE_FROM: _choice(CONF_WIPE_FROM, [WIPE_FROM_START, WIPE_FROM_END]),
    CONF_FRAME_DELAY_MS: _number(0, 1000, "ms", 10),
    CONF_LIVE_DELAY_MS: _number(50, 2000, "ms", 50),
}


class SwitchbotSegmentsOptionsFlow(OptionsFlow):
    """Uebergang und Timing -- wirken sofort, ohne Neuladen."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            numbers = {
                k
                for k, v in OPTIONS_FIELDS.items()
                if isinstance(v, selector.NumberSelector)
            }
            return self.async_create_entry(
                data={k: int(v) if k in numbers else v for k, v in user_input.items()}
            )
        current = {**DEFAULT_OPTIONS, **self.config_entry.options}
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(key, default=current[key]): field
                    for key, field in OPTIONS_FIELDS.items()
                }
            ),
        )
