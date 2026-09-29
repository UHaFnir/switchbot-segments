"""Seitenleisten-Panel „Lightstrips“ (Frontend unter frontend/, gebaut nach ./frontend/)."""

from __future__ import annotations

import hashlib
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

PANEL_URL_PATH = "switchbot-segments"
STATIC_URL = "/switchbot_segments_static"
WEBCOMPONENT = "switchbot-segments-panel"
BUNDLE_DIR = Path(__file__).parent / "frontend"
BUNDLE = "panel.js"


def _bundle_version() -> str:
    """Hash des Bundles als Cache-Buster -- jeder Deploy laedt frisch."""
    try:
        return hashlib.sha256((BUNDLE_DIR / BUNDLE).read_bytes()).hexdigest()[:12]
    except FileNotFoundError:
        return "missing"


async def async_register(hass: HomeAssistant) -> None:
    """Statischen Pfad und Panel registrieren (einmal pro HA-Start)."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(BUNDLE_DIR), cache_headers=False)]
    )
    version = await hass.async_add_executor_job(_bundle_version)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=WEBCOMPONENT,
        sidebar_title="Lightstrips",
        sidebar_icon="mdi:led-strip-variant",
        module_url=f"{STATIC_URL}/{BUNDLE}?v={version}",
        require_admin=True,
    )
