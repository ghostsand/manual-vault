"""Manual Vault: store PDF manuals and link them to devices by model."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.typing import ConfigType

from . import websocket
from .const import (
    DEVICE_DEBOUNCE_SECONDS,
    DOMAIN,
    NAME,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_URL_PATH,
    SIGNAL_UPDATED,
    STATIC_URL,
)
from .http import ManualFileView, ManualUploadView
from .vault import ManualVault

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type ManualVaultConfigEntry = ConfigEntry[ManualVault]

_REGISTERED = f"{DOMAIN}_registered"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register things that live for the whole Home Assistant run."""
    if not hass.data.get(_REGISTERED):
        hass.data[_REGISTERED] = True
        hass.http.register_view(ManualUploadView())
        hass.http.register_view(ManualFileView())
        websocket.async_register(hass)
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(Path(__file__).parent / "frontend"),
                    cache_headers=False,
                )
            ]
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ManualVaultConfigEntry) -> bool:
    """Set up Manual Vault from a config entry."""
    vault = ManualVault(hass)
    await vault.async_load()
    entry.runtime_data = vault
    hass.data[DOMAIN] = vault

    version = await hass.async_add_executor_job(_manifest_version)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=NAME,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/manual-vault-panel.js?v={version}",
        require_admin=False,
        config={"version": version},
    )
    card_url = f"{STATIC_URL}/manual-vault-card.js?v={version}"
    frontend.add_extra_js_url(hass, card_url)
    entry.async_on_unload(lambda: frontend.remove_extra_js_url(hass, card_url))

    pending: list = []

    @callback
    def _fire(_now=None) -> None:
        pending.clear()
        async_dispatcher_send(hass, SIGNAL_UPDATED)

    @callback
    def _device_changed(event: Event[dr.EventDeviceRegistryUpdatedData]) -> None:
        if event.data["action"] == "remove" and (
            vault.async_forget_device(event.data["device_id"])
            | vault.async_forget_hidden_device(event.data["device_id"])
        ):
            entry.async_create_background_task(
                hass, vault.async_save(), "manual_vault_save"
            )
        if not pending:
            pending.append(async_call_later(hass, DEVICE_DEBOUNCE_SECONDS, _fire))

    entry.async_on_unload(
        hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, _device_changed)
    )

    @callback
    def _cancel_pending() -> None:
        for cancel in pending:
            cancel()

    entry.async_on_unload(_cancel_pending)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ManualVaultConfigEntry) -> bool:
    """Unload the integration (files and library stay on disk)."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
        hass.data.pop(DOMAIN, None)
    return unloaded


def _manifest_version() -> str:
    with open(Path(__file__).parent / "manifest.json", encoding="utf-8") as fh:
        return json.load(fh)["version"]
