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
