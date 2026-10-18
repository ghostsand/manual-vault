"""Fixtures for Manual Vault tests."""

from __future__ import annotations

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom_components/ in every test."""
    return


@pytest.fixture(autouse=True)
def isolated_config_dir(hass, tmp_path):
    """Give every test its own config folder."""
    hass.config.config_dir = str(tmp_path)
    return tmp_path
