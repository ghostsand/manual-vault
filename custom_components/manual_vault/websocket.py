"""Websocket API used by the Manual Vault panel."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, MAX_FILE_SIZE
from .vault import ManualVault, VaultError, clean_devices, clean_tags


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register websocket commands (once per Home Assistant run)."""
    websocket_api.async_register_command(hass, ws_library)
    websocket_api.async_register_command(hass, ws_update)
    websocket_api.async_register_command(hass, ws_delete)


def _get_vault(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg_id: int
) -> ManualVault | None:
    vault: ManualVault | None = hass.data.get(DOMAIN)
    if vault is None:
        connection.send_error(msg_id, "not_loaded", "Manual Vault is not loaded")
    return vault


@websocket_api.websocket_command({vol.Required("type"): "manual_vault/library"})
@websocket_api.async_response
async def ws_library(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return manuals, devices and permissions."""
    if (vault := _get_vault(hass, connection, msg["id"])) is None:
        return
    payload = await vault.async_payload()
    payload["is_admin"] = connection.user.is_admin
    payload["max_size"] = MAX_FILE_SIZE
    payload["backup_running"] = vault.backup_running
    connection.send_result(msg["id"], payload)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "manual_vault/update",
        vol.Required("manual_id"): str,
        vol.Optional("title"): str,
        vol.Optional("tags"): list,
        vol.Optional("devices"): list,
    }
)
@websocket_api.async_response
async def ws_update(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Change title, tags or device links."""
    if (vault := _get_vault(hass, connection, msg["id"])) is None:
        return
    try:
        manual = await vault.async_update(
            msg["manual_id"],
            title=msg.get("title"),
            tags=clean_tags(msg["tags"]) if "tags" in msg else None,
            devices=clean_devices(msg["devices"]) if "devices" in msg else None,
        )
    except VaultError as err:
        connection.send_error(msg["id"], err.code, str(err))
        return
    connection.send_result(msg["id"], {"manual": manual})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "manual_vault/delete",
        vol.Required("manual_id"): str,
        vol.Optional("delete_file", default=True): bool,
    }
)
@websocket_api.async_response
async def ws_delete(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Delete a manual (and its file)."""
    if (vault := _get_vault(hass, connection, msg["id"])) is None:
        return
    try:
        await vault.async_delete(msg["manual_id"], msg["delete_file"])
    except VaultError as err:
        connection.send_error(msg["id"], err.code, str(err))
        return
    connection.send_result(msg["id"])
