"""Persistenz je Strip: Layout, Presets, Snapshots (`.storage/switchbot_segments.<entry_id>`)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from . import protocol as p
from .const import DOMAIN
from .layout import Layout

STORAGE_VERSION = 1


class StripStore:
    """Gespeicherte Daten eines Strips."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}"
        )
        self.entry_id = entry_id
        self.layout: Layout | None = None
        self.presets: dict[str, list[str]] = {}
        self.snapshots: dict[str, dict[str, Any]] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self.layout = Layout.from_dict(data["layout"]) if data.get("layout") else None
        self.presets = data.get("presets", {})
        self.snapshots = data.get("snapshots", {})

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "layout": self.layout.as_dict() if self.layout else None,
                "presets": self.presets,
                "snapshots": self.snapshots,
            }
        )

    async def async_set_layout(self, layout: Layout) -> None:
        layout.validate()
        self.layout = layout
        await self._async_save()

    async def async_save_preset(self, name: str, colors: list[p.RGB]) -> None:
        self.presets[name] = [p.rgb_to_hex(c) for c in colors]
        await self._async_save()

    def preset_colors(self, name: str) -> list[p.RGB] | None:
        preset = self.presets.get(name)
        return [p.hex_to_rgb(c) for c in preset] if preset is not None else None

    async def async_delete_preset(self, name: str) -> None:
        if self.presets.pop(name, None) is not None:
            await self._async_save()

    async def async_save_snapshot(self, name: str, colors: list[p.RGB]) -> None:
        self.snapshots[name] = {
            "taken": datetime.now(UTC).isoformat(timespec="seconds"),
            "colors": [p.rgb_to_hex(c) for c in colors],
        }
        await self._async_save()

    def snapshot_colors(self, name: str) -> list[p.RGB] | None:
        snap = self.snapshots.get(name)
        return [p.hex_to_rgb(c) for c in snap["colors"]] if snap else None

    async def async_remove_snapshot(self, name: str) -> None:
        if self.snapshots.pop(name, None) is not None:
            await self._async_save()
