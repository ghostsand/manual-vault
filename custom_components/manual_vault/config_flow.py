"""Config and options flow for Manual Vault."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.selector import (
    DeviceSelector,
    DeviceSelectorConfig,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)
from homeassistant.loader import async_get_integrations

from .const import DOMAIN, NAME
from .vault import VaultError, all_devices, is_eligible_device, model_key

if TYPE_CHECKING:
    from .vault import ManualVault


class ManualVaultConfigFlow(ConfigFlow, domain=DOMAIN):
    """Confirm and create the single Manual Vault entry."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show a confirm step, then create the entry."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title=NAME, data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Settings screen for hidden devices."""
        return ManualVaultOptionsFlow()


def _model_value(manufacturer: str, model: str) -> str:
    return json.dumps([manufacturer, model])


class ManualVaultOptionsFlow(OptionsFlow):
    """Choose which integrations, models and devices are hidden from the list."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Single step with three pickers."""
        vault: ManualVault | None = getattr(self.config_entry, "runtime_data", None)
        if vault is None:
            return self.async_abort(reason="not_loaded")

        errors: dict[str, str] = {}
        if user_input is not None:
            models = []
            for value in user_input.get("models", []):
                manufacturer, model = json.loads(value)
                models.append({"manufacturer": manufacturer, "model": model})
            try:
                await vault.async_replace_hidden(
                    user_input.get("devices", []),
                    models,
                    user_input.get("integrations", []),
                )
            except VaultError:
                errors["base"] = "backup_running"
            else:
                return self.async_create_entry(data={})

        dev_reg = dr.async_get(self.hass)
        domains: set[str] = set(vault.hidden["integrations"])
        model_options: dict[tuple[str, str], SelectOptionDict] = {}
        for device in all_devices(dev_reg):
            if not is_eligible_device(device):
                continue
            if domain := vault.device_domain(device):
                domains.add(domain)
            key = model_key(device.manufacturer, device.model)
            if key not in model_options and (device.manufacturer or device.model):
                model_options[key] = SelectOptionDict(
                    value=_model_value(device.manufacturer or "", device.model or ""),
                    label=" ".join(filter(None, [device.manufacturer, device.model])),
                )
        hidden_models = []
        for m in vault.hidden["models"]:
            key = model_key(m["manufacturer"], m["model"])
            option = model_options.setdefault(
                key,
                SelectOptionDict(
                    value=_model_value(m["manufacturer"], m["model"]),
                    label=" ".join(filter(None, [m["manufacturer"], m["model"]])),
                ),
            )
            hidden_models.append(option["value"])

        integrations = await async_get_integrations(self.hass, domains)
        integration_options = sorted(
            (
                SelectOptionDict(
                    value=domain,
                    label=(
                        integration.name
                        if not isinstance(integration, Exception)
                        else domain
                    ),
                )
                for domain, integration in integrations.items()
            ),
            key=lambda o: o["label"].casefold(),
        )

        schema = vol.Schema(
            {
                vol.Optional(
                    "integrations", default=list(vault.hidden["integrations"])
                ): SelectSelector(
                    SelectSelectorConfig(
                        options=integration_options,
                        multiple=True,
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional("models", default=hidden_models): SelectSelector(
                    SelectSelectorConfig(
                        options=sorted(
                            model_options.values(), key=lambda o: o["label"].casefold()
                        ),
                        multiple=True,
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(
                    "devices", default=list(vault.hidden["devices"])
                ): DeviceSelector(DeviceSelectorConfig(multiple=True)),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)
