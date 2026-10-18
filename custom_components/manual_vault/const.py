"""Constants for Manual Vault."""

from __future__ import annotations

DOMAIN = "manual_vault"
NAME = "Manual Vault"

FOLDER_NAME = "manual_vault"
STORAGE_KEY = "manual_vault"
STORAGE_VERSION = 1

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE = 1024 * 1024
ALLOWED_EXTENSIONS = (".pdf",)

PANEL_URL_PATH = "manual-vault"
PANEL_COMPONENT = "manual-vault-panel"
PANEL_ICON = "mdi:book-open-page-variant"
STATIC_URL = "/manual_vault_static"

API_UPLOAD = "/api/manual_vault/upload"
API_FILE = "/api/manual_vault/file/{manual_id}"

SIGNAL_UPDATED = f"{DOMAIN}_updated"
DEVICE_DEBOUNCE_SECONDS = 2

MATCH_DEVICE = "device"
MATCH_MODEL = "model"

# Integrations hidden from the device list on a fresh install (can be unhidden).
DEFAULT_HIDDEN_INTEGRATIONS = [
    "backup",
    "buienradar",
    "cpuspeed",
    "forecast_solar",
    "glances",
    "google_translate",
    "hacs",
    "hassio",
    "met",
    "met_eireann",
    "mobile_app",
    "openweathermap",
    "radio_browser",
    "shopping_list",
    "speedtestdotcom",
    "sun",
    "systemmonitor",
    "uptime",
    "version",
]

HIDE_DEVICE = "device"
HIDE_MODEL = "model"
HIDE_INTEGRATION = "integration"
