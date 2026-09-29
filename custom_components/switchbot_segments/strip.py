"""Steuerung eines Strips ueber das pySwitchbot-Geraet der Core-Integration.

Einziger Schreibweg zum Strip. Alle Auftraege laufen unter einem Lock, damit
Editor, Services und Presets sich nicht ueberholen; gesendet wird nur die
Differenz zum zuletzt bekannten Farbstand (protocol.plan_frames).
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from . import protocol as p
from .const import signal_colors_updated

if TYPE_CHECKING:
    from switchbot import SwitchbotDevice

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class Transition:
    """Wisch-Uebergang fuer grosse Aenderungen (Optionen der Integration)."""

    per_frame: int = 8
    min_changed: int = 9  # darunter direkt -- Malen bleibt flott
    reverse: bool = False
    frame_delay: float = 0.0  # Sekunden zwischen zwei Frames


class StripError(HomeAssistantError):
    """Strip hat einen Befehl nicht bestaetigt."""


class StripController:
    """Farbstand, Lock und Versand fuer einen Strip."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry_id: str,
        device_getter: Callable[[], SwitchbotDevice],
    ) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self._device_getter = device_getter
        self._lock = asyncio.Lock()
        self.status: p.StripStatus | None = None
        self.colors: list[p.RGB] | None = None

    async def _send(self, frame: str) -> bytes:
        response = await self._device_getter()._send_command(frame)
        if not response or response[0] != p.STATUS_OK:
            raise StripError(
                f"Strip hat {frame} nicht bestaetigt: {response.hex() if response else None}"
            )
        return response

    async def _read_locked(self) -> list[p.RGB]:
        self.status = p.parse_status(await self._send(p.CMD_STATUS))
        colors: list[p.RGB] = []
        for expected, frame in p.read_colors_frames(self.status.segment_count):
            colors += p.parse_colors(await self._send(frame), expected)
        self.colors = colors
        return colors

    async def async_read(self) -> list[p.RGB]:
        """Status und alle Segmentfarben vom Strip lesen (nur Lese-Befehle)."""
        async with self._lock:
            colors = await self._read_locked()
        self._notify()
        return list(colors)

    async def async_apply(
        self, target: Sequence[p.RGB], transition: Transition | None = None
    ) -> int:
        """Strip auf `target` bringen; sendet nur Unterschiede. Rueckgabe: Anzahl Frames.

        Mit `transition` laufen grosse Aenderungen als Wisch-Uebergang den Strip entlang.
        """
        async with self._lock:
            current = (
                self.colors if self.colors is not None else await self._read_locked()
            )
            if len(target) != len(current):
                raise HomeAssistantError(
                    f"{len(target)} Farben fuer {len(current)} Segmente angegeben"
                )
            changed = sum(1 for a, b in zip(target, current, strict=True) if a != b)
            wipe = transition is not None and changed >= transition.min_changed
            frames = (
                p.plan_wipe_frames(
                    target, current, transition.per_frame, transition.reverse
                )
                if wipe
                else p.plan_frames(target, current)
            )
            delay = transition.frame_delay if wipe else 0.0
            started = time.monotonic()
            try:
                for number, frame in enumerate(frames):
                    if delay and number:
                        await asyncio.sleep(delay)
                    self.status = p.parse_status(await self._send(frame))
            except Exception:
                # Stand unklar -- beim naechsten Mal neu lesen statt falsch zu diffen.
                self.colors = None
                raise
            self.colors = list(target)
            _LOGGER.debug(
                "%s: %d Segmente, %d Frames in %.2f s",
                self.entry_id,
                changed,
                len(frames),
                time.monotonic() - started,
            )
        self._notify()
        return len(frames)

    async def async_set_segments(
        self, assignments: Sequence[tuple[Sequence[int], p.RGB]]
    ) -> int:
        """Einzelne Segmente umfaerben, Rest unveraendert lassen."""
        async with self._lock:
            base = self.colors if self.colors is not None else await self._read_locked()
        target = list(base)
        for indices, color in assignments:
            for index in indices:
                if not 0 <= index < len(target):
                    raise HomeAssistantError(
                        f"Segment {index} gibt es nicht (0..{len(target) - 1})"
                    )
                target[index] = color
        return await self.async_apply(target)

    @callback
    def _notify(self) -> None:
        async_dispatcher_send(self.hass, signal_colors_updated(self.entry_id))
