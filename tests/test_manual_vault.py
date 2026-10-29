"""End-to-end tests for Manual Vault."""

from __future__ import annotations

from datetime import timedelta
import json
from pathlib import Path

import aiohttp
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util

from custom_components.manual_vault import backup
from custom_components.manual_vault.const import DOMAIN, MAX_FILE_SIZE
from custom_components.manual_vault.vault import device_entry_id

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, title="Manual Vault")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _devices(hass: HomeAssistant) -> tuple[dr.DeviceEntry, dr.DeviceEntry, dr.DeviceEntry]:
    source = MockConfigEntry(domain="zha")
    source.add_to_hass(hass)
    reg = dr.async_get(hass)
    switch1 = reg.async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("zha", "aa:01")},
        manufacturer="Moes",
        model="ZBM5-1C",
        name="Kitchen switch",
    )
    switch2 = reg.async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("zha", "aa:02")},
        manufacturer="MOES",
        model="Switch 1 gang",
        model_id="zbm5-1c",
        name="Hall switch",
    )
    tuya = reg.async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("zha", "aa:03")},
        manufacturer="_TZE200",
        model="TS0601",
        name="Thermostat",
    )
    return switch1, switch2, tuya


def _form(title: str | None = None, tags=None, devices=None, name="Moes ZBM5.pdf", data=PDF, replace=None):
    form = aiohttp.FormData()
    if title:
        form.add_field("title", title)
    form.add_field("tags", json.dumps(tags or []))
    form.add_field("devices", json.dumps(devices or []))
    if replace:
        form.add_field("replace", replace)
    form.add_field("file", data, filename=name, content_type="application/pdf")
    return form


def _manual_entities(hass: HomeAssistant, entry: MockConfigEntry) -> dict[str, str]:
    """device_id -> entity_id for our sensors."""
    reg = er.async_get(hass)
    return {
        e.device_id: e.entity_id
        for e in er.async_entries_for_config_entry(reg, entry.entry_id)
    }


async def test_config_flow_single_instance(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT


async def test_folder_scan_and_panel(hass: HomeAssistant, hass_ws_client) -> None:
    folder = Path(hass.config.path("manual_vault"))
    folder.mkdir()
    (folder / "old-boiler.pdf").write_bytes(PDF)
    (folder / "notes.txt").write_text("ignored")
    await _setup(hass)

    assert "manual-vault" in hass.data["frontend_panels"]
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "manual_vault/library"})
    res = await client.receive_json()
    assert res["success"]
    manuals = res["result"]["manuals"]
    assert [m["file"] for m in manuals] == ["old-boiler.pdf"]
    assert manuals[0]["tags"] == [] and manuals[0]["title"] == "old boiler"
    assert res["result"]["is_admin"] is True
    assert res["result"]["max_size"] == MAX_FILE_SIZE

    # file removed by hand -> flagged missing
    (folder / "old-boiler.pdf").unlink()
    await client.send_json_auto_id({"type": "manual_vault/library"})
    res = await client.receive_json()
    assert res["result"]["manuals"][0]["missing"] is True


async def test_upload_match_and_entities(hass: HomeAssistant, hass_client, hass_ws_client) -> None:
    switch1, switch2, tuya = _devices(hass)
    entry = await _setup(hass)
    client = await hass_client()

    resp = await client.post(
        "/api/manual_vault/upload",
        data=_form("Moes wall switch", [{"manufacturer": "moes", "model": "zbm5-1c"}]),
    )
    assert resp.status == 200, await resp.text()
    manual = (await resp.json())["manual"]
    assert manual["file"] == "Moes-ZBM5.pdf"
    assert Path(hass.config.path("manual_vault", "Moes-ZBM5.pdf")).read_bytes() == PDF
    await hass.async_block_till_done()

    # model tag matches model (switch1) and model_id (switch2), case-insensitive
    ents = _manual_entities(hass, entry)
    assert set(ents) == {switch1.id, switch2.id}
    state = hass.states.get(ents[switch1.id])
    assert state.state == "Moes wall switch"
    assert state.attributes["linked_by"] == "model"
    assert state.attributes["manuals"][0]["url"] == f"/api/manual_vault/file/{manual['id']}"
    # our entry does not take over the device
    assert device_entry_id(dr.async_get(hass).async_get(switch1.id)) != entry.entry_id

    # same name again -> unique file name, direct link to the tuya device
    resp = await client.post(
        "/api/manual_vault/upload",
        data=_form("Thermostat", devices=[tuya.id]),
    )
    m2 = (await resp.json())["manual"]
    assert m2["file"] == "Moes-ZBM5-2.pdf"
    await hass.async_block_till_done()
    ents = _manual_entities(hass, entry)
    assert hass.states.get(ents[tuya.id]).attributes["linked_by"] == "device"

    # a direct link on switch1 overrides its model match
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id(
        {"type": "manual_vault/update", "manual_id": m2["id"], "devices": [tuya.id, switch1.id]}
    )
    assert (await ws.receive_json())["success"]
    await hass.async_block_till_done()
    st = hass.states.get(_manual_entities(hass, entry)[switch1.id])
    assert st.state == "Thermostat" and st.attributes["linked_by"] == "device"

    # removing tags removes the switch2 entity
    await ws.send_json_auto_id(
        {"type": "manual_vault/update", "manual_id": manual["id"], "tags": []}
    )
    assert (await ws.receive_json())["success"]
    await hass.async_block_till_done()
    assert set(_manual_entities(hass, entry)) == {switch1.id, tuya.id}

    # library payload
    await ws.send_json_auto_id({"type": "manual_vault/library"})
    devs = {d["id"]: d for d in (await ws.receive_json())["result"]["devices"]}
    assert devs[tuya.id]["manuals"] == [m2["id"]]
    assert devs[switch2.id]["manuals"] == [] and devs[switch2.id]["integration"] == "zha"

    # delete removes file and entities
    await ws.send_json_auto_id({"type": "manual_vault/delete", "manual_id": m2["id"]})
    assert (await ws.receive_json())["success"]
    await hass.async_block_till_done()
    assert not Path(hass.config.path("manual_vault", "Moes-ZBM5-2.pdf")).exists()
    assert _manual_entities(hass, entry) == {}


async def test_device_removed_and_added(hass: HomeAssistant, hass_client) -> None:
    switch1, switch2, tuya = _devices(hass)
    entry = await _setup(hass)
    client = await hass_client()
    await client.post(
        "/api/manual_vault/upload",
        data=_form("Shared", [{"model": "ZBM5-1C"}], devices=[tuya.id]),
    )
    await hass.async_block_till_done()
    reg = dr.async_get(hass)

    # new matching device appears -> gets an entity after the debounce
    source = hass.config_entries.async_entries("zha")[0]
    new = reg.async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("zha", "aa:09")},
        manufacturer="Moes",
        model="ZBM5-1C",
    )
    reg.async_remove_device(tuya.id)
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=5))
    await hass.async_block_till_done()
    assert set(_manual_entities(hass, entry)) == {switch1.id, switch2.id, new.id}
    manual = next(iter(hass.data[DOMAIN].manuals.values()))
    assert manual["devices"] == []


async def test_upload_rejections(hass: HomeAssistant, hass_client, hass_read_only_access_token, aiohttp_client) -> None:
    await _setup(hass)
    client = await hass_client()

    resp = await client.post("/api/manual_vault/upload", data=_form(name="x.pdf", data=b"not a pdf"))
    assert resp.status == 400 and (await resp.json())["code"] == "not_pdf"
    resp = await client.post("/api/manual_vault/upload", data=_form(name="x.docx"))
    assert (await resp.json())["code"] == "not_pdf"
    resp = await client.post("/api/manual_vault/upload", data=_form(name="../../evil.pdf"))
    assert (await resp.json())["manual"]["file"] == "evil.pdf"
    assert Path(hass.config.path("manual_vault", "evil.pdf")).exists()
    resp = await client.post(
        "/api/manual_vault/upload", data=_form(name="x.pdf", devices=["nope"])
    )
    assert (await resp.json())["code"] == "unknown_device"

    big = PDF + b"0" * (MAX_FILE_SIZE + 1)
    resp = await client.post("/api/manual_vault/upload", data=_form(name="big.pdf", data=big))
    assert (await resp.json())["code"] == "too_large"
    assert not Path(hass.config.path("manual_vault", "big.pdf")).exists()

    # read-only user: can't upload, can download
    ro = await aiohttp_client(hass.http.app, headers={"Authorization": f"Bearer {hass_read_only_access_token}"})
    resp = await ro.post("/api/manual_vault/upload", data=_form())
    assert resp.status == 403
    manual_id = next(iter(hass.data[DOMAIN].manuals))
    resp = await ro.get(f"/api/manual_vault/file/{manual_id}")
    assert resp.status == 200
    assert resp.headers["Content-Type"] == "application/pdf"
    assert await resp.read() == PDF
    assert (await ro.get("/api/manual_vault/file/nope")).status == 404

    # no auth at all
    anon = await aiohttp_client(hass.http.app)
    assert (await anon.get(f"/api/manual_vault/file/{manual_id}")).status == 401


async def test_read_only_ws(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token) -> None:
    await _setup(hass)
    ws = await hass_ws_client(hass, hass_read_only_access_token)
    await ws.send_json_auto_id({"type": "manual_vault/library"})
    res = await ws.receive_json()
    assert res["success"] and res["result"]["is_admin"] is False
    await ws.send_json_auto_id({"type": "manual_vault/delete", "manual_id": "x"})
    assert (await ws.receive_json())["error"]["code"] == "unauthorized"


async def test_replace_file(hass: HomeAssistant, hass_client) -> None:
    _devices(hass)
    await _setup(hass)
    client = await hass_client()
    resp = await client.post("/api/manual_vault/upload", data=_form("A", [{"model": "TS0601"}], name="a.pdf"))
    m = (await resp.json())["manual"]
    resp = await client.post("/api/manual_vault/upload", data=_form(name="b.pdf", replace=m["id"]))
    m2 = (await resp.json())["manual"]
    assert m2["id"] == m["id"] and m2["file"] == "b.pdf" and m2["title"] == "A"
    assert m2["tags"] == [{"manufacturer": "", "model": "TS0601"}]
    assert not Path(hass.config.path("manual_vault", "a.pdf")).exists()


async def test_backup_blocks_changes(hass: HomeAssistant, hass_client) -> None:
    await _setup(hass)
    client = await hass_client()
    await backup.async_pre_backup(hass)
    resp = await client.post("/api/manual_vault/upload", data=_form())
    assert resp.status == 503
    await backup.async_post_backup(hass)
    resp = await client.post("/api/manual_vault/upload", data=_form())
    assert resp.status == 200


async def test_unload_keeps_files(hass: HomeAssistant, hass_client) -> None:
    entry = await _setup(hass)
    client = await hass_client()
    await client.post("/api/manual_vault/upload", data=_form())
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert "manual-vault" not in hass.data["frontend_panels"]
    assert Path(hass.config.path("manual_vault", "Moes-ZBM5.pdf")).exists()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert len(hass.data[DOMAIN].manuals) == 1


async def test_panel_served(hass: HomeAssistant, hass_client) -> None:
    await _setup(hass)
    panel = hass.data["frontend_panels"]["manual-vault"]
    module_url = panel.config["_panel_custom"]["module_url"]
    assert module_url.startswith("/manual_vault_static/manual-vault-panel.js?v=")
    assert panel.require_admin is False
    client = await hass_client()
    resp = await client.get(module_url)
    assert resp.status == 200
    assert "customElements.define" in await resp.text()


# ----------------------------------------------------------------- v0.2.0


def _extra_devices(hass: HomeAssistant) -> tuple[dr.DeviceEntry, dr.DeviceEntry]:
    phone_entry = MockConfigEntry(domain="mobile_app")
    phone_entry.add_to_hass(hass)
    sysmon = MockConfigEntry(domain="systemmonitor")
    sysmon.add_to_hass(hass)
    reg = dr.async_get(hass)
    phone = reg.async_get_or_create(
        config_entry_id=phone_entry.entry_id,
        identifiers={("mobile_app", "p1")},
        manufacturer="Google",
        model="Pixel 9",
        name="Phone",
    )
    cpu = reg.async_get_or_create(
        config_entry_id=sysmon.entry_id,
        identifiers={("systemmonitor", "cpu")},
        name="CPU",
    )
    return phone, cpu


async def _library(ws) -> dict:
    await ws.send_json_auto_id({"type": "manual_vault/library"})
    res = await ws.receive_json()
    assert res["success"], res
    return res["result"]


async def test_hidden_defaults_and_toggle(hass: HomeAssistant, hass_ws_client) -> None:
    switch1, switch2, tuya = _devices(hass)
    phone, cpu = _extra_devices(hass)
    await _setup(hass)
    ws = await hass_ws_client(hass)

    lib = await _library(ws)
    devs = {d["id"]: d for d in lib["devices"]}
    assert devs[phone.id]["hidden"] == "integration"
    assert devs[cpu.id]["hidden"] == "integration"
    assert devs[switch1.id]["hidden"] is None
    assert "mobile_app" in lib["hidden"]["integrations"]

    # hide one device
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "device", "hidden": True, "device_id": tuya.id})
    assert (await ws.receive_json())["success"]
    # hide a model (case-insensitive, covers every device of that model)
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "model", "hidden": True, "manufacturer": "moes", "model": "zbm5-1c"})
    assert (await ws.receive_json())["success"]
    # unhide an integration
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "integration", "hidden": False, "integration": "mobile_app"})
    assert (await ws.receive_json())["success"]

    devs = {d["id"]: d for d in (await _library(ws))["devices"]}
    assert devs[tuya.id]["hidden"] == "device"
    assert devs[switch1.id]["hidden"] == "model"
    assert devs[switch2.id]["hidden"] is None  # different model string
    assert devs[phone.id]["hidden"] is None

    # unhide again
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "model", "hidden": False, "manufacturer": "Moes", "model": "ZBM5-1C"})
    assert (await ws.receive_json())["success"]
    devs = {d["id"]: d for d in (await _library(ws))["devices"]}
    assert devs[switch1.id]["hidden"] is None

    # persisted, and removed devices are forgotten
    dr.async_get(hass).async_remove_device(tuya.id)
    await hass.async_block_till_done()
    assert tuya.id not in hass.data[DOMAIN].hidden["devices"]


async def test_hidden_device_keeps_sensor(hass: HomeAssistant, hass_client, hass_ws_client) -> None:
    switch1, _s2, _t = _devices(hass)
    entry = await _setup(hass)
    client = await hass_client()
    await client.post("/api/manual_vault/upload", data=_form("Moes", [{"model": "ZBM5-1C"}]))
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "device", "hidden": True, "device_id": switch1.id})
    assert (await ws.receive_json())["success"]
    await hass.async_block_till_done()
    ent = _manual_entities(hass, entry)[switch1.id]
    assert hass.states.get(ent).attributes["panel"] == f"/manual-vault?device={switch1.id}"


async def test_hide_read_only_rejected(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token) -> None:
    await _setup(hass)
    ws = await hass_ws_client(hass, hass_read_only_access_token)
    await ws.send_json_auto_id({"type": "manual_vault/hide", "kind": "integration", "hidden": True, "integration": "zha"})
    assert (await ws.receive_json())["error"]["code"] == "unauthorized"


async def test_options_flow(hass: HomeAssistant) -> None:
    switch1, _s2, tuya = _devices(hass)
    phone, _cpu = _extra_devices(hass)
    entry = await _setup(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    schema = result["data_schema"].schema
    defaults = {str(k): k.default() for k in schema}
    assert "mobile_app" in defaults["integrations"]
    model_opts = {o["label"]: o["value"] for o in next(v for k, v in schema.items() if str(k) == "models").config["options"]}
    integ_opts = {o["value"] for o in next(v for k, v in schema.items() if str(k) == "integrations").config["options"]}
    assert {"zha", "mobile_app", "systemmonitor"} <= integ_opts

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {"integrations": ["systemmonitor"], "models": [model_opts["Moes ZBM5-1C"]], "devices": [tuya.id]},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    hidden = hass.data[DOMAIN].hidden
    assert hidden == {
        "devices": [tuya.id],
        "models": [{"manufacturer": "Moes", "model": "ZBM5-1C"}],
        "integrations": ["systemmonitor"],
    }
    vault = hass.data[DOMAIN]
    assert vault.hidden_reason(dr.async_get(hass).async_get(phone.id)) is None
    assert vault.hidden_reason(dr.async_get(hass).async_get(switch1.id)) == "model"

    # survives a reload
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.data[DOMAIN].hidden["integrations"] == ["systemmonitor"]


async def test_card_payload_and_script(hass: HomeAssistant, hass_client, hass_ws_client) -> None:
    switch1, switch2, tuya = _devices(hass)
    phone, _cpu = _extra_devices(hass)
    ar_reg = __import__("homeassistant.helpers.area_registry", fromlist=["x"]).async_get(hass)
    kitchen = ar_reg.async_create("Kitchen")
    reg = dr.async_get(hass)
    for dev in (switch1, tuya, phone):
        reg.async_update_device(dev.id, area_id=kitchen.id)
    await _setup(hass)
    client = await hass_client()
    resp = await client.post("/api/manual_vault/upload", data=_form("Moes", [{"model": "ZBM5-1C"}]))
    manual_id = (await resp.json())["manual"]["id"]

    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "manual_vault/card", "device_id": switch1.id})
    res = (await ws.receive_json())["result"]
    assert res["devices"][0]["manuals"] == [
        {"id": manual_id, "title": "Moes", "file": "Moes-ZBM5.pdf", "missing": False}
    ]

    # area: phone is hidden (mobile_app) and has no manual -> left out
    await ws.send_json_auto_id({"type": "manual_vault/card", "area_id": kitchen.id})
    res = (await ws.receive_json())["result"]
    assert [d["name"] for d in res["devices"]] == ["Kitchen switch", "Thermostat"]

    # card script is registered and served
    from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL
    urls = list(hass.data[DATA_EXTRA_MODULE_URL].urls)
    card = next(u for u in urls if "manual-vault-card.js" in u)
    resp = await client.get(card)
    assert resp.status == 200
