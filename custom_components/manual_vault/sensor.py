"""'Manual' sensor attached to every device that has a manual."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import API_FILE, DOMAIN, PANEL_ICON, PANEL_URL_PATH, SIGNAL_UPDATED

if TYPE_CHECKING:
    from . import ManualVaultConfigEntry
    from .vault import ManualVault


def _unique_id(device_id: str) -> str:
    return f"{device_id}_manual"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ManualVaultConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Keep one sensor per matched device, adding and removing as things change."""
    vault = entry.runtime_data
    entities: dict[str, ManualSensor] = {}
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)

    @callback
    def _sync() -> None:
        matches = vault.all_matches()

        # Remove entities whose device no longer has a manual (incl. leftovers
        # in the registry from before a restart).
        wanted = {_unique_id(device_id) for device_id in matches}
        for reg_entry in er.async_entries_for_config_entry(ent_reg, entry.entry_id):
            if reg_entry.unique_id not in wanted:
                ent_reg.async_remove(reg_entry.entity_id)
        for device_id in list(entities):
            if device_id not in matches:
                entities.pop(device_id)

        new: list[ManualSensor] = []
        for device_id in matches:
            if device_id in entities:
                continue
            if (device := dev_reg.async_get(device_id)) is None:
                continue
            entity = ManualSensor(vault, device)
            entities[device_id] = entity
            new.append(entity)
        if new:
            async_add_entities(new)

    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_UPDATED, _sync))
    _sync()


class ManualSensor(SensorEntity):
    """Shows the linked manual(s) on a device page."""

    _attr_has_entity_name = True
    _attr_translation_key = "manual"
    _attr_icon = PANEL_ICON
    _attr_should_poll = False

    def __init__(self, vault: ManualVault, device: dr.DeviceEntry) -> None:
        """Attach to an existing device without taking ownership of it."""
        self._vault = vault
        self._device_id = device.id
        self._attr_unique_id = _unique_id(device.id)
        self.device_entry = device

    async def async_added_to_hass(self) -> None:
        """Refresh when the library or devices change."""
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self._refresh)
        )
        self._refresh(write=False)

    @callback
    def _refresh(self, write: bool = True) -> None:
        device = dr.async_get(self.hass).async_get(self._device_id)
        match = self._vault.match_device(device) if device else None
        if match is None:
            return  # the platform removes this entity
        manuals = [self._vault.manuals[i] for i in match.manual_ids]
        first = manuals[0]["title"]
        state = first if len(manuals) == 1 else f"{first} (+{len(manuals) - 1})"
        self._attr_native_value = state[:255]
        self._attr_extra_state_attributes: dict[str, Any] = {
            "manuals": [
                {
                    "title": m["title"],
                    "file": m["file"],
                    "url": API_FILE.format(manual_id=m["id"]),
                }
                for m in manuals
            ],
            "linked_by": match.match,
            "panel": f"/{PANEL_URL_PATH}?device={self._device_id}",
            "integration": DOMAIN,
        }
        if write:
            self.async_write_ha_state()
