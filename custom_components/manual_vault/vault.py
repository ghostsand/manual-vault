"""Library storage, folder sync and device matching for Manual Vault."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
import os
from pathlib import Path
import re
import shutil
from typing import Any
from urllib.parse import unquote
import uuid

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar, device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    ALLOWED_EXTENSIONS,
    DEFAULT_HIDDEN_INTEGRATIONS,
    FOLDER_NAME,
    HIDE_DEVICE,
    HIDE_INTEGRATION,
    HIDE_MODEL,
    MATCH_DEVICE,
    MATCH_MODEL,
    SIGNAL_UPDATED,
    STORAGE_KEY,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

_SAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


class VaultError(Exception):
    """User-facing error raised by vault operations."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(slots=True)
class DeviceMatch:
    """Manuals linked to a device and how they were matched."""

    manual_ids: list[str]
    match: str


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def clean_tags(tags: Any) -> list[dict[str, str]]:
    """Validate and normalise a list of model tags (dedup, trim)."""
    if not isinstance(tags, list):
        raise VaultError("invalid_tags", "Tags must be a list")
    result: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for tag in tags:
        if not isinstance(tag, dict):
            raise VaultError("invalid_tags", "Each tag must be an object")
        model = str(tag.get("model") or "").strip()
        manufacturer = str(tag.get("manufacturer") or "").strip()
        if not model:
            continue
        key = (_norm(manufacturer), _norm(model))
        if key in seen:
            continue
        seen.add(key)
        result.append({"manufacturer": manufacturer, "model": model})
    return result


def clean_devices(devices: Any) -> list[str]:
    """Validate a list of device ids."""
    if not isinstance(devices, list) or not all(
        isinstance(d, str) for d in devices
    ):
        raise VaultError("invalid_devices", "Devices must be a list of ids")
    return list(dict.fromkeys(devices))


def tag_matches(tag: dict[str, str], device: dr.DeviceEntry) -> bool:
    """Return True if a model tag applies to a device."""
    model = _norm(tag.get("model"))
    if not model:
        return False
    candidates = {_norm(device.model), _norm(device.model_id)} - {""}
    if model not in candidates:
        return False
    manufacturer = _norm(tag.get("manufacturer"))
    return not manufacturer or manufacturer == _norm(device.manufacturer)


def sanitize_filename(name: str) -> str:
    """Turn an uploaded file name into a safe file name ending in .pdf."""
    base = os.path.basename(unquote(name).replace("\\", "/")).strip()
    stem, ext = os.path.splitext(base)
    stem = _SAFE_CHARS.sub("-", stem.replace(" ", "-")).strip("-._")
    if not stem:
        stem = "manual"
    return f"{stem[:100]}{ext.lower() if ext.lower() in ALLOWED_EXTENSIONS else '.pdf'}"


def is_eligible_device(device: dr.DeviceEntry) -> bool:
    """Physical, enabled devices only."""
    return device.entry_type is None and device.disabled_by is None


def all_devices(registry: dr.DeviceRegistry) -> list[dr.DeviceEntry]:
    """Every device entry, on old and new Home Assistant versions.

    HA 2026.10+ iterates `registry.devices` as entries and deprecates using it as
    a mapping; older versions iterate it as device ids.
    """
    devices = list(registry.devices)
    if devices and isinstance(devices[0], str):
        return [d for i in devices if (d := registry.async_get(i)) is not None]
    return devices


def device_entry_id(device: dr.DeviceEntry) -> str | None:
    """Config entry that owns a device, on old and new Home Assistant versions."""
    if hasattr(device, "config_entry_id"):  # HA 2026.10+
        return device.config_entry_id
    return device.primary_config_entry or next(iter(device.config_entries), None)


def model_key(manufacturer: str | None, model: str | None) -> tuple[str, str]:
    """Normalised (manufacturer, model) pair used to group and hide models."""
    return (_norm(manufacturer), _norm(model))


def default_hidden() -> dict[str, list[Any]]:
    """Hidden settings for a fresh install."""
    return {
        "devices": [],
        "models": [],
        "integrations": list(DEFAULT_HIDDEN_INTEGRATIONS),
    }


class ManualVault:
    """Owns the manual library and its folder."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.folder = Path(hass.config.path(FOLDER_NAME))
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, atomic_writes=True
        )
        self.manuals: dict[str, dict[str, Any]] = {}
        self.hidden: dict[str, list[Any]] = default_hidden()
        # Held while files and the library are being changed; backups wait on it.
        self.lock = asyncio.Lock()
        self.backup_running = False

    # ------------------------------------------------------------------ setup

    async def async_load(self) -> None:
        """Load the library from storage and sync with the folder."""
        data = await self._store.async_load() or {}
        self.manuals = data.get("manuals", {})
        if "hidden" in data:
            self.hidden = {**default_hidden(), **data["hidden"]}
        await self.hass.async_add_executor_job(self.folder.mkdir, 0o755, True, True)
        await self.async_scan()

    async def _async_save(self) -> None:
        await self._store.async_save(
            {"manuals": self.manuals, "hidden": self.hidden}
        )
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)

    def _ensure_writable(self) -> None:
        if self.backup_running:
            raise VaultError(
                "backup_running", "A backup is running, try again in a moment"
            )

    # ------------------------------------------------------------ folder sync

    def _list_folder(self) -> dict[str, int]:
        files: dict[str, int] = {}
        for entry in os.scandir(self.folder):
            if (
                entry.is_file()
                and not entry.name.startswith(".")
                and entry.name.lower().endswith(ALLOWED_EXTENSIONS)
            ):
                files[entry.name] = entry.stat().st_size
        return files

    async def async_scan(self) -> dict[str, Any]:
        """Add PDFs found in the folder as untagged manuals, refresh sizes.

        Returns the set of files currently on disk.
        """
        async with self.lock:
            return await self._async_scan_locked()

    async def _async_scan_locked(self) -> dict[str, Any]:
        files = await self.hass.async_add_executor_job(self._list_folder)
        known = {m["file"] for m in self.manuals.values()}
        changed = False
        for name, size in files.items():
            if name in known:
                continue
            manual_id = uuid.uuid4().hex[:12]
            self.manuals[manual_id] = {
                "id": manual_id,
                "file": name,
                "title": Path(name).stem.replace("-", " ").replace("_", " "),
                "tags": [],
                "devices": [],
                "added": dt_util.utcnow().isoformat(),
                "size": size,
            }
            changed = True
            _LOGGER.info("Found new manual in folder: %s", name)
        for manual in self.manuals.values():
            size = files.get(manual["file"])
            if size is not None and manual.get("size") != size:
                manual["size"] = size
                changed = True
        if changed and not self.backup_running:
            await self._async_save()
        return files

    def file_path(self, manual_id: str) -> Path | None:
        """Return the on-disk path of a manual, if it is inside the folder."""
        manual = self.manuals.get(manual_id)
        if manual is None:
            return None
        path = (self.folder / manual["file"]).resolve()
        if path.parent != self.folder.resolve():
            return None
        return path

    # -------------------------------------------------------------- mutations

    def _unique_name(self, wanted: str, ignore: str | None = None) -> str:
        stem, ext = os.path.splitext(wanted)
        taken = {m["file"].casefold() for m in self.manuals.values()} | {
            f.casefold() for f in os.listdir(self.folder)
        }
        if ignore:
            taken.discard(ignore.casefold())
        name, n = wanted, 2
        while name.casefold() in taken:
            name = f"{stem}-{n}{ext}"
            n += 1
        return name

    def _validate_devices(self, devices: list[str]) -> None:
        registry = dr.async_get(self.hass)
        for device_id in devices:
            if registry.async_get(device_id) is None:
                raise VaultError("unknown_device", f"Unknown device: {device_id}")

    async def async_add(
        self,
        temp_path: Path,
        original_name: str,
        size: int,
        title: str | None,
        tags: list[dict[str, str]],
        devices: list[str],
        replace_id: str | None = None,
    ) -> dict[str, Any]:
        """Move an uploaded temp file into the folder and record it."""
        self._validate_devices(devices)
        async with self.lock:
            self._ensure_writable()
            existing = self.manuals.get(replace_id) if replace_id else None
            if replace_id and existing is None:
                raise VaultError("not_found", "Manual not found")

            wanted = sanitize_filename(original_name)
            name = await self.hass.async_add_executor_job(
                self._unique_name, wanted, existing["file"] if existing else None
            )
            dest = self.folder / name
            await self.hass.async_add_executor_job(
                shutil.move, str(temp_path), str(dest)
            )
            await self.hass.async_add_executor_job(os.chmod, dest, 0o644)

            if existing:
                old = self.folder / existing["file"]
                if existing["file"] != name:
                    await self.hass.async_add_executor_job(_unlink, old)
                existing["file"] = name
                existing["size"] = size
                if title:
                    existing["title"] = title
                existing["tags"] = clean_tags(existing["tags"] + tags)
                existing["devices"] = list(
                    dict.fromkeys(existing["devices"] + devices)
                )
                manual = existing
            else:
                manual_id = uuid.uuid4().hex[:12]
                manual = {
                    "id": manual_id,
                    "file": name,
                    "title": title or Path(original_name).stem,
                    "tags": tags,
                    "devices": devices,
                    "added": dt_util.utcnow().isoformat(),
                    "size": size,
                }
                self.manuals[manual_id] = manual
            await self._async_save()
            return manual

    async def async_update(
        self,
        manual_id: str,
        title: str | None = None,
        tags: list[dict[str, str]] | None = None,
        devices: list[str] | None = None,
    ) -> dict[str, Any]:
        """Change title, tags or device links of a manual."""
        if devices is not None:
            self._validate_devices(devices)
        async with self.lock:
            self._ensure_writable()
            manual = self.manuals.get(manual_id)
            if manual is None:
                raise VaultError("not_found", "Manual not found")
            if title is not None:
                title = title.strip()
                if not title:
                    raise VaultError("invalid_title", "Title cannot be empty")
                manual["title"] = title[:200]
            if tags is not None:
                manual["tags"] = tags
            if devices is not None:
                manual["devices"] = devices
            await self._async_save()
            return manual

    async def async_delete(self, manual_id: str, delete_file: bool = True) -> None:
        """Remove a manual from the library, and its file by default."""
        async with self.lock:
            self._ensure_writable()
            manual = self.manuals.get(manual_id)
            if manual is None:
                raise VaultError("not_found", "Manual not found")
            if delete_file and (path := self.file_path(manual_id)):
                await self.hass.async_add_executor_job(_unlink, path)
            del self.manuals[manual_id]
            await self._async_save()

    @callback
    def async_forget_device(self, device_id: str) -> bool:
        """Drop links to a device that was removed. Returns True if changed."""
        changed = False
        for manual in self.manuals.values():
            if device_id in manual["devices"]:
                manual["devices"].remove(device_id)
                changed = True
        return changed

    async def async_save(self) -> None:
        """Persist the library (used after device cleanup)."""
        async with self.lock:
            await self._async_save()

    # ---------------------------------------------------------------- hiding

    def device_domain(self, device: dr.DeviceEntry) -> str:
        """Domain of the integration that owns a device."""
        entry_id = device_entry_id(device)
        entry = self.hass.config_entries.async_get_entry(entry_id) if entry_id else None
        return entry.domain if entry else ""

    @callback
    def hidden_reason(self, device: dr.DeviceEntry, domain: str | None = None) -> str | None:
        """Why a device is hidden from the list, or None."""
        if device.id in self.hidden["devices"]:
            return HIDE_DEVICE
        key = model_key(device.manufacturer, device.model)
        if any(model_key(m["manufacturer"], m["model"]) == key for m in self.hidden["models"]):
            return HIDE_MODEL
        if (domain if domain is not None else self.device_domain(device)) in self.hidden[
            "integrations"
        ]:
            return HIDE_INTEGRATION
        return None

    async def async_set_hidden(
        self,
        kind: str,
        hidden: bool,
        *,
        device_id: str | None = None,
        manufacturer: str | None = None,
        model: str | None = None,
        integration: str | None = None,
    ) -> None:
        """Hide or unhide one device, model or integration."""
        async with self.lock:
            self._ensure_writable()
            if kind == HIDE_DEVICE:
                if not device_id:
                    raise VaultError("invalid", "device_id is required")
                items = self.hidden["devices"]
                if hidden and device_id not in items:
                    items.append(device_id)
                elif not hidden and device_id in items:
                    items.remove(device_id)
            elif kind == HIDE_MODEL:
                key = model_key(manufacturer, model)
                rest = [
                    m for m in self.hidden["models"]
                    if model_key(m["manufacturer"], m["model"]) != key
                ]
                if hidden:
                    rest.append({"manufacturer": manufacturer or "", "model": model or ""})
                self.hidden["models"] = rest
            elif kind == HIDE_INTEGRATION:
                if not integration:
                    raise VaultError("invalid", "integration is required")
                items = self.hidden["integrations"]
                if hidden and integration not in items:
                    items.append(integration)
                elif not hidden and integration in items:
                    items.remove(integration)
            else:
                raise VaultError("invalid", f"Unknown kind: {kind}")
            await self._async_save()

    async def async_replace_hidden(
        self,
        devices: list[str],
        models: list[dict[str, str]],
        integrations: list[str],
    ) -> None:
        """Replace all hidden settings at once (options flow)."""
        async with self.lock:
            self._ensure_writable()
            self.hidden = {
                "devices": list(dict.fromkeys(devices)),
                "models": models,
                "integrations": sorted(set(integrations)),
            }
            await self._async_save()

    @callback
    def async_forget_hidden_device(self, device_id: str) -> bool:
        """Drop a removed device from the hidden list."""
        if device_id in self.hidden["devices"]:
            self.hidden["devices"].remove(device_id)
            return True
        return False

    # ------------------------------------------------------------------ card

    async def async_card_payload(
        self, device_id: str | None = None, area_id: str | None = None
    ) -> dict[str, Any]:
        """Manuals for one device or every device in an area (dashboard card)."""
        files = await self.hass.async_add_executor_job(self._list_folder)
        dev_reg = dr.async_get(self.hass)
        if device_id:
            device = dev_reg.async_get(device_id)
            candidates = [device] if device else []
        elif area_id:
            candidates = [
                d for d in dr.async_entries_for_area(dev_reg, area_id)
                if is_eligible_device(d)
            ]
        else:
            candidates = []
        result = []
        for device in candidates:
            match = self.match_device(device)
            if area_id and match is None and self.hidden_reason(device):
                continue
            result.append(
                {
                    "id": device.id,
                    "name": device.name_by_user or device.name or "",
                    "manuals": [
                        {
                            "id": m["id"],
                            "title": m["title"],
                            "file": m["file"],
                            "missing": m["file"] not in files,
                        }
                        for m in (self.manuals[i] for i in (match.manual_ids if match else []))
                    ],
                }
            )
        result.sort(key=lambda d: d["name"].casefold())
        return {"devices": result}

    # --------------------------------------------------------------- matching

    @callback
    def match_device(self, device: dr.DeviceEntry) -> DeviceMatch | None:
        """Manuals for a device: direct links win over model tags."""
        direct = [m["id"] for m in self.manuals.values() if device.id in m["devices"]]
        if direct:
            return DeviceMatch(direct, MATCH_DEVICE)
        by_model = [
            m["id"]
            for m in self.manuals.values()
            if any(tag_matches(t, device) for t in m["tags"])
        ]
        if by_model:
            return DeviceMatch(by_model, MATCH_MODEL)
        return None

    @callback
    def all_matches(self) -> dict[str, DeviceMatch]:
        """Device id -> match, for every eligible device with a manual."""
        result: dict[str, DeviceMatch] = {}
        for device in all_devices(dr.async_get(self.hass)):
            if not is_eligible_device(device):
                continue
            if match := self.match_device(device):
                result[device.id] = match
        return result

    # ---------------------------------------------------------------- payload

    async def async_payload(self) -> dict[str, Any]:
        """Everything the panel needs in one response."""
        files = await self.async_scan()
        manuals = [
            {**m, "missing": m["file"] not in files}
            for m in sorted(self.manuals.values(), key=lambda m: m["title"].casefold())
        ]
        dev_reg = dr.async_get(self.hass)
        area_reg = ar.async_get(self.hass)
        devices: list[dict[str, Any]] = []
        for device in all_devices(dev_reg):
            if not is_eligible_device(device):
                continue
            domain = self.device_domain(device)
            area = area_reg.async_get_area(device.area_id) if device.area_id else None
            match = self.match_device(device)
            devices.append(
                {
                    "id": device.id,
                    "name": device.name_by_user or device.name or "",
                    "manufacturer": device.manufacturer or "",
                    "model": device.model or "",
                    "model_id": device.model_id or "",
                    "integration": domain,
                    "area": area.name if area else "",
                    "area_id": device.area_id or "",
                    "hidden": self.hidden_reason(device, domain),
                    "manuals": match.manual_ids if match else [],
                    "match": match.match if match else None,
                }
            )
        devices.sort(key=lambda d: (d["manufacturer"].casefold(), d["model"].casefold(), d["name"].casefold()))
        return {"manuals": manuals, "devices": devices, "hidden": self.hidden}


def _unlink(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass
