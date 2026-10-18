"""HTTP views for uploading and downloading manuals."""

from __future__ import annotations

from http import HTTPStatus
import json
import logging
import os
from pathlib import Path
import tempfile
from typing import TYPE_CHECKING, Any

from aiohttp import BodyPartReader, web

from homeassistant.components.http import KEY_HASS, HomeAssistantView

from .const import API_FILE, API_UPLOAD, CHUNK_SIZE, DOMAIN, MAX_FILE_SIZE
from .vault import VaultError, clean_devices, clean_tags

if TYPE_CHECKING:
    from .vault import ManualVault

_LOGGER = logging.getLogger(__name__)


def _vault(request: web.Request) -> ManualVault | None:
    return request.app[KEY_HASS].data.get(DOMAIN)


def _error(status: HTTPStatus, code: str, message: str) -> web.Response:
    return web.json_response({"code": code, "message": message}, status=status)


class ManualUploadView(HomeAssistantView):
    """Accept a PDF upload (streamed, admins only)."""

    url = API_UPLOAD
    name = "api:manual_vault:upload"
    requires_auth = True

    async def post(self, request: web.Request) -> web.Response:
        """Handle a multipart upload: fields title/tags/devices/replace + file."""
        if not request["hass_user"].is_admin:
            return _error(HTTPStatus.FORBIDDEN, "forbidden", "Admins only")
        vault = _vault(request)
        if vault is None:
            return _error(HTTPStatus.SERVICE_UNAVAILABLE, "not_loaded", "Not loaded")
        if vault.backup_running:
            return _error(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "backup_running",
                "A backup is running, try again in a moment",
            )

        hass = request.app[KEY_HASS]
        fields: dict[str, str] = {}
        temp_path: Path | None = None
        original_name = ""
        size = 0
        try:
            reader = await request.multipart()
            while (part := await reader.next()) is not None:
                if not isinstance(part, BodyPartReader):
                    continue
                if part.name == "file":
                    if temp_path is not None:
                        return _error(HTTPStatus.BAD_REQUEST, "multiple_files", "One file per upload")
                    original_name = part.filename or "manual.pdf"
                    if not original_name.lower().endswith(".pdf"):
                        return _error(HTTPStatus.BAD_REQUEST, "not_pdf", "Only PDF files are allowed")
                    temp_path, size = await _receive_file(hass, part)
                elif part.name in ("title", "tags", "devices", "replace"):
                    fields[part.name] = (await part.text())[:10000]

            if temp_path is None:
                return _error(HTTPStatus.BAD_REQUEST, "no_file", "No file received")

            tags = clean_tags(json.loads(fields.get("tags") or "[]"))
            devices = clean_devices(json.loads(fields.get("devices") or "[]"))
            title = (fields.get("title") or "").strip()[:200] or None
            manual = await vault.async_add(
                temp_path,
                original_name,
                size,
                title,
                tags,
                devices,
                replace_id=fields.get("replace") or None,
            )
            temp_path = None  # moved into the vault
        except _UploadRejected as err:
            return _error(HTTPStatus.BAD_REQUEST, err.code, str(err))
        except VaultError as err:
            status = (
                HTTPStatus.SERVICE_UNAVAILABLE
                if err.code == "backup_running"
                else HTTPStatus.BAD_REQUEST
            )
            return _error(status, err.code, str(err))
        except json.JSONDecodeError:
            return _error(HTTPStatus.BAD_REQUEST, "invalid_json", "Invalid tags or devices")
        finally:
            if temp_path is not None:
                await hass.async_add_executor_job(_remove, temp_path)
        return web.json_response({"manual": manual})


class _UploadRejected(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


async def _receive_file(hass: Any, part: BodyPartReader) -> tuple[Path, int]:
    """Stream a file part into a temp file, enforcing size and PDF signature."""
    fd, name = await hass.async_add_executor_job(
        tempfile.mkstemp, ".pdf", "manual_vault_"
    )
    path = Path(name)
    handle = os.fdopen(fd, "wb")
    size = 0
    first = True
    try:
        while chunk := await part.read_chunk(CHUNK_SIZE):
            if first:
                first = False
                if b"%PDF-" not in chunk[:1024]:
                    raise _UploadRejected("not_pdf", "File is not a valid PDF")
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                raise _UploadRejected(
                    "too_large", f"File is larger than {MAX_FILE_SIZE // 1024 // 1024} MB"
                )
            await hass.async_add_executor_job(handle.write, chunk)
        if size == 0:
            raise _UploadRejected("empty", "File is empty")
    except BaseException:
        await hass.async_add_executor_job(handle.close)
        await hass.async_add_executor_job(_remove, path)
        raise
    await hass.async_add_executor_job(handle.close)
    return path, size


def _remove(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


class ManualFileView(HomeAssistantView):
    """Serve a manual to any logged-in user (supports signed paths)."""

    url = API_FILE
    name = "api:manual_vault:file"
    requires_auth = True

    async def get(self, request: web.Request, manual_id: str) -> web.StreamResponse:
        """Return the PDF."""
        vault = _vault(request)
        if vault is None:
            return _error(HTTPStatus.SERVICE_UNAVAILABLE, "not_loaded", "Not loaded")
        path = vault.file_path(manual_id)
        hass = request.app[KEY_HASS]
        if path is None or not await hass.async_add_executor_job(path.is_file):
            return _error(HTTPStatus.NOT_FOUND, "not_found", "Manual not found")
        disposition = "attachment" if request.query.get("download") else "inline"
        return web.FileResponse(
            path,
            headers={
                "Content-Type": "application/pdf",
                "Content-Disposition": f'{disposition}; filename="{path.name}"',
                "Cache-Control": "private, no-cache",
                "X-Content-Type-Options": "nosniff",
            },
        )
