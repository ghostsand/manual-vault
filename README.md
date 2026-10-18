# Manual Vault

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![Validate](https://github.com/ghostsand/manual-vault/actions/workflows/validate.yaml/badge.svg)](https://github.com/ghostsand/manual-vault/actions/workflows/validate.yaml)


**DISCLAIMER: Made with help of Claude AI**

Store PDF manuals in Home Assistant and link them automatically to your devices by model.

Example: Upload the manual for a sonoff ZBM5-1C once, and every ZBM5-1C you have now or add later — through ZHA, Zigbee2MQTT or any other integration — gets it. Devices without a manual are flagged, with an upload button right next to them.

## Features

- **Sidebar panel** with all your devices grouped by manufacturer and model, showing which have a manual and which don't.
- **Upload from the device list**: the model is filled in for you, so you never type `ZBM5-1C` by hand.
- **One PDF, many models**: tag a manual with every model it covers (e.g. the 1-, 2- and 3-gang versions).
- **Several PDFs per model**: e.g. a quick-start guide and a full manual.
- **Per-device override** for devices with a generic model string (such as Tuya `TS0601`): link a manual to one specific device.
- **"Manual" sensor on the device page** of every device that has a manual.
- **Dashboard card** that opens a device's manuals (or all manuals in an area) with one tap.
- **Deep links** straight to a device in the panel: `/manual-vault?device=<device id>`.
- **Hide what doesn't need a manual**: phones, system sensors, add-ons and similar are hidden out of the box; hide any device, model or integration with one click.
- **Included in backups**, with uploads paused while a backup runs.
- **Folder sync**: PDFs you copy into the folder yourself appear as *untagged*; files you delete by hand are flagged as *missing*.
- English and Dutch, following each user's language.

## Requirements

Home Assistant 2025.8 or newer.

## Installation

### HACS (custom repository)

1. In Home Assistant open **HACS**, click the **⋮** menu (top right) → **Custom repositories**.
2. Repository: `https://github.com/ghostsand/manual-vault`, Type: **Integration** → **Add**.
3. Search for **Manual Vault** in HACS → **Download**.
4. Restart Home Assistant.
5. **Settings → Devices & services → Add integration → Manual Vault**.

### Manual

1. Copy `custom_components/manual_vault` into `/config/custom_components/`.
2. Restart Home Assistant and add the integration as in step 5 above.

## Using it

Open **Manual Vault** in the sidebar.

**Devices tab** — every physical device, grouped by manufacturer and model.

| Dot | Meaning |
|---|---|
| 🟢 | All devices of this model have a manual |
| 🟠 | Some do (e.g. one has a direct link) |
| 🔴 | No manual |

- **Upload**: uploads a PDF tagged with that model.
- **Link existing**: adds the model to a manual you already uploaded.
- Click a row to see the individual devices. The link icon links a manual to **that device only**; a direct link takes priority over model matches for that device.

- The eye icon hides things that don't need a manual: a single device (in the expanded list), or every device of a model or integration (on the row). The **Hidden** filter shows what's hidden, with an **Unhide** button.

**Manuals tab** — every PDF with its models and device links. Open, download, edit (title, models, devices), replace the file, or delete.

### How a device finds its manual

1. Manuals linked **directly to this device** → used.
2. Otherwise, manuals tagged with this device's **model** (or model ID), optionally limited to a manufacturer → used.
3. Otherwise the device shows as missing.

Matching ignores upper/lower case. Tip: ZHA and Zigbee2MQTT sometimes report the same device with different model strings; picking the model from the list (instead of typing it) avoids mismatches.

### Hiding devices

Out of the box, devices from integrations that never come with a paper manual are hidden: Mobile App (phones), System Monitor, Supervisor/add-ons, Backup, Sun, weather services and a few similar ones.

Hidden devices don't appear in the list and don't count as missing a manual. A hidden device that already has a manual keeps its Manual sensor.

Manage hiding either with the eye icon in the panel, or under **Settings → Devices & services → Manual Vault → Configure**, which lists all hidden integrations, models and devices in one place.

### On the device page

Each device with a manual gets a **Manual** sensor. Its state is the manual's title; the `manuals` attribute lists every linked PDF, `linked_by` says whether the link is by `model` or by `device`, and `panel` is a link that opens this device in Manual Vault.

Home Assistant doesn't let integrations add buttons to the sensor's pop-up, so to open a PDF in one tap use the dashboard card below, or give a card a tap action to the panel:

```yaml
tap_action:
  action: navigate
  navigation_path: /manual-vault?device=<device id>
```

## Dashboard card

The integration loads the card automatically, so there's no resource to add. On a dashboard: **Edit → Add card → Manual Vault**, then pick:

- **Device**: shows that device's manuals, or
- **Area**: shows the manuals of every device in that area.

Each manual is a button that opens the PDF; the download icon saves it. For a device without a manual, administrators get a link straight to that device in the panel.

YAML:

```yaml
type: custom:manual-vault-card
device_id: 1a2b3c4d5e6f…   # or: area_id: kitchen
title: Boiler manual       # optional
show_empty: true           # area mode: also list devices without a manual
```

## Permissions

- Everyone who can log in can view the panel and open or download manuals.
- Only **administrators** can upload, edit, link and delete.
- Files are only served to logged-in users. They are **not** placed under `/local`, so they are not publicly reachable.

## Where things are stored

| What | Where |
|---|---|
| PDF files | `/config/manual_vault/` |
| Titles, models, device links | `/config/.storage/manual_vault` |

Both are inside the configuration folder, so every Home Assistant backup that includes settings also includes your manuals. Keep an eye on backup size: 50 manuals of 5 MB each add about 250 MB.

Removing the integration does **not** delete your files or library; reinstalling picks them up again.

## Limits

- PDF only, up to 50 MB per file (uploads are streamed, so Home Assistant's normal 16 MB request limit does not apply).
- While a backup is running, changes are paused for a moment and you'll see a message to try again.

---

## Nederlands (kort)

Manual Vault bewaart PDF-handleidingen in Home Assistant en koppelt ze automatisch aan je apparaten op basis van het model. Upload een handleiding één keer en elk apparaat van dat model krijgt hem, nu en in de toekomst. Telefoons, systeemsensoren en dergelijke zijn standaard verborgen; met het oog-icoon verberg je zelf apparaten, modellen of integraties. Met de dashboardkaart **Manual Vault** open je de handleidingen van een apparaat of ruimte met één tik. Open **Manual Vault** in de zijbalk: het tabblad **Apparaten** laat zien welke modellen nog geen handleiding hebben, met een knop om er direct een te uploaden of een bestaande te koppelen. Bestanden staan in `/config/manual_vault/` en gaan mee in je backups. Iedereen kan handleidingen bekijken; alleen beheerders kunnen uploaden en wijzigen.

---

## For maintainers

### Releasing a new version

HACS shows versions and update notifications based on GitHub releases.

1. Bump `version` in `custom_components/manual_vault/manifest.json` (e.g. `0.2.0`).
2. Commit and push.
3. On GitHub: **Releases → Draft a new release**, tag `v0.2.0`, target `main`, add notes → **Publish release**.

### Running the tests

```bash
python -m venv .venv && . .venv/bin/activate
pip install pytest-homeassistant-custom-component
pip install "$(python -c "import json, os, homeassistant; p = os.path.join(os.path.dirname(homeassistant.__file__), 'components/frontend/manifest.json'); print(json.load(open(p))['requirements'][0])")"
pytest -q

# frontend (panel and card)
cd tests/frontend && npm install && npm test
```

### Getting listed in the HACS default store (optional, later)

- Add a description and topics (e.g. `home-assistant`, `hacs`, `homeassistant-integration`) to the GitHub repository.
- Add a LICENSE file (HACS requires one for the default store).
- Submit the icon to [home-assistant/brands](https://github.com/home-assistant/brands).
- Remove `ignore: brands license topics` from `.github/workflows/validate.yaml`.
- Make sure the Validate workflow is green and at least one release exists.
- Open a pull request to [hacs/default](https://github.com/hacs/default).

---

Copyright © 2026 ghostsand. All rights reserved.
