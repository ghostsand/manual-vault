"""Backup hooks: pause changes while Home Assistant makes a backup."""

from __future__ import annotations

import asyncio
import logging

from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
_WAIT_SECONDS = 60


async def async_pre_backup(hass: HomeAssistant) -> None:
    """Block new changes and wait for a running one to finish."""
    if (vault := hass.data.get(DOMAIN)) is None:
        return
    vault.backup_running = True
    try:
        async with asyncio.timeout(_WAIT_SECONDS):
            async with vault.lock:
                pass
    except TimeoutError:
        _LOGGER.warning("A manual change was still running when the backup started")


async def async_post_backup(hass: HomeAssistant) -> None:
    """Allow changes again."""
    if (vault := hass.data.get(DOMAIN)) is not None:
        vault.backup_running = False
