/*
 * Manual Vault sidebar panel.
 * Plain web component (no build step, no external libraries).
 */

const ICONS = {
  menu: "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
  refresh:
    "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
  upload: "M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z",
  chevron: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  pencil:
    "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
  delete: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
  open: "M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z",
  download: "M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z",
  link: "M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z",
  unlink:
    "M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.43 19.12,14.63 17.79,15L19.25,16.44C20.88,15.61 22,13.95 22,12A5,5 0 0,0 17,7M16,11H13.81L15.81,13H16V11M2,4.27L5.11,7.38C3.29,8.12 2,9.91 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12C3.9,10.41 5.11,9.1 6.66,8.93L8.73,11H8V13H10.73L13,15.27V17H14.73L18.74,21L20,19.74L3.27,3L2,4.27Z",
  close:
    "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  replace:
    "M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z",
  book: "M19 2L14 6.5V17.5L19 13V2M6.5 5C4.55 5 2.45 5.4 1 6.5V21.16C1 21.41 1.25 21.66 1.5 21.66C1.6 21.66 1.65 21.59 1.75 21.59C3.1 20.94 5.05 20.5 6.5 20.5C8.45 20.5 10.55 20.9 12 22C13.35 21.15 15.8 20.5 17.5 20.5C19.15 20.5 20.85 20.81 22.25 21.56C22.35 21.61 22.4 21.59 22.5 21.59C22.75 21.59 23 21.34 23 21.09V6.5C22.4 6.05 21.75 5.75 21 5.5V19C19.9 18.65 18.7 18.5 17.5 18.5C15.8 18.5 13.35 19.15 12 20V6.5C10.55 5.4 8.45 5 6.5 5Z",
};

ICONS.eyeOff =
  "M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z";
ICONS.eye =
  "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z";

const STRINGS = {
  en: {
    devices: "Devices",
    manuals: "Manuals",
    search: "Search",
    all: "All",
    missing: "Missing manual",
    has_manual: "Has manual",
    untagged: "Untagged",
    file_missing: "File missing",
    no_manual: "No manual",
    upload: "Upload",
    upload_manual: "Upload manual",
    link_existing: "Link existing",
    link_device: "Link to this device",
    unlink: "Remove direct link",
    open: "Open",
    download: "Download",
    edit: "Edit",
    delete: "Delete",
    replace: "Replace file",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    refresh: "Refresh",
    title: "Title",
    file: "PDF file",
    choose_file: "Choose a PDF…",
    tags: "Models",
    tags_help: "Every device with one of these models gets this manual.",
    devices_help: "Only for devices whose model is too generic (e.g. Tuya TS0601). A direct link overrides model matches for that device.",
    specific_devices: "Specific devices",
    add_model: "Add a model…",
    custom_model: "Other model…",
    manufacturer: "Manufacturer (optional)",
    model: "Model",
    add: "Add",
    add_device: "Add a device…",
    devices_count: (n) => (n === 1 ? "1 device" : `${n} devices`),
    manuals_count: (n) => (n === 1 ? "1 manual" : `${n} manuals`),
    linked_direct: "linked directly",
    unknown: "Unknown",
    nothing_found: "Nothing found.",
    empty_manuals: "No manuals yet. Upload one from the Devices tab or with the Upload button.",
    confirm_delete: (t) => `Delete “${t}”? The PDF file is removed as well. This can't be undone.`,
    uploaded: "Manual uploaded",
    saved: "Saved",
    deleted: "Deleted",
    pick_manual: "Pick a manual",
    link_model_help: (m) => `Adds the model ${m} to the manual you pick.`,
    link_device_help: (d) => `Links the manual you pick directly to ${d}.`,
    too_large: (mb) => `File is larger than ${mb} MB.`,
    not_pdf: "Only PDF files are allowed.",
    backup_running: "A backup is running. Try again in a moment.",
    read_only: "You can view and open manuals. Ask an administrator to upload or change them.",
    added: "Added",
    matched: (n) => (n === 1 ? "used by 1 device" : `used by ${n} devices`),
    error: "Something went wrong",
    uploading: "Uploading…",
    hidden: "Hidden",
    hide: "Hide",
    hide_title: "Hide from the list",
    hide_device: "Hide this device",
    hide_model: (m) => `All ${m} devices`,
    hide_model_help: "Including devices of this model added later.",
    hide_integration: (i) => `Everything from ${i}`,
    hide_integration_help: "Every device of this integration.",
    hide_help: "Hidden devices don't count as missing a manual. A device that already has a manual keeps its Manual sensor. You can also manage this under Settings → Devices & services → Manual Vault → Configure.",
    unhide: "Unhide",
    reason_device: "hidden device",
    reason_model: "hidden model",
    reason_integration: (i) => `hidden integration: ${i}`,
    unhide_integration: (i) => `Unhide everything from ${i}`,
    unhide_model: "Unhide this model",
    empty_hidden: "Nothing is hidden.",
  },
  nl: {
    devices: "Apparaten",
    manuals: "Handleidingen",
    search: "Zoeken",
    all: "Alle",
    missing: "Handleiding ontbreekt",
    has_manual: "Heeft handleiding",
    untagged: "Niet gekoppeld",
    file_missing: "Bestand ontbreekt",
    no_manual: "Geen handleiding",
    upload: "Uploaden",
    upload_manual: "Handleiding uploaden",
    link_existing: "Bestaande koppelen",
    link_device: "Aan dit apparaat koppelen",
    unlink: "Directe koppeling verwijderen",
    open: "Openen",
    download: "Downloaden",
    edit: "Bewerken",
    delete: "Verwijderen",
    replace: "Bestand vervangen",
    cancel: "Annuleren",
    save: "Opslaan",
    close: "Sluiten",
    refresh: "Vernieuwen",
    title: "Titel",
    file: "PDF-bestand",
    choose_file: "Kies een PDF…",
    tags: "Modellen",
    tags_help: "Elk apparaat met een van deze modellen krijgt deze handleiding.",
    devices_help: "Alleen voor apparaten met een te algemeen model (bijv. Tuya TS0601). Een directe koppeling gaat voor op modelkoppelingen van dat apparaat.",
    specific_devices: "Specifieke apparaten",
    add_model: "Model toevoegen…",
    custom_model: "Ander model…",
    manufacturer: "Fabrikant (optioneel)",
    model: "Model",
    add: "Toevoegen",
    add_device: "Apparaat toevoegen…",
    devices_count: (n) => (n === 1 ? "1 apparaat" : `${n} apparaten`),
    manuals_count: (n) => (n === 1 ? "1 handleiding" : `${n} handleidingen`),
    linked_direct: "direct gekoppeld",
    unknown: "Onbekend",
    nothing_found: "Niets gevonden.",
    empty_manuals: "Nog geen handleidingen. Upload er een via het tabblad Apparaten of met de knop Uploaden.",
    confirm_delete: (t) => `“${t}” verwijderen? Het PDF-bestand wordt ook verwijderd. Dit kan niet ongedaan worden gemaakt.`,
    uploaded: "Handleiding geüpload",
    saved: "Opgeslagen",
    deleted: "Verwijderd",
    pick_manual: "Kies een handleiding",
    link_model_help: (m) => `Voegt het model ${m} toe aan de handleiding die je kiest.`,
    link_device_help: (d) => `Koppelt de gekozen handleiding direct aan ${d}.`,
    too_large: (mb) => `Bestand is groter dan ${mb} MB.`,
    not_pdf: "Alleen PDF-bestanden zijn toegestaan.",
    backup_running: "Er loopt een backup. Probeer het zo opnieuw.",
    read_only: "Je kunt handleidingen bekijken en openen. Vraag een beheerder om ze te uploaden of te wijzigen.",
    added: "Toegevoegd",
    matched: (n) => (n === 1 ? "gebruikt door 1 apparaat" : `gebruikt door ${n} apparaten`),
    error: "Er ging iets mis",
    uploading: "Uploaden…",
    hidden: "Verborgen",
    hide: "Verbergen",
    hide_title: "Verbergen uit de lijst",
    hide_device: "Dit apparaat verbergen",
    hide_model: (m) => `Alle ${m}-apparaten`,
    hide_model_help: "Ook apparaten van dit model die later worden toegevoegd.",
    hide_integration: (i) => `Alles van ${i}`,
    hide_integration_help: "Elk apparaat van deze integratie.",
    hide_help: "Verborgen apparaten tellen niet mee als 'handleiding ontbreekt'. Een apparaat dat al een handleiding heeft, houdt zijn Handleiding-sensor. Je kunt dit ook beheren via Instellingen → Apparaten & diensten → Manual Vault → Configureren.",
    unhide: "Zichtbaar maken",
    reason_device: "verborgen apparaat",
    reason_model: "verborgen model",
    reason_integration: (i) => `verborgen integratie: ${i}`,
    unhide_integration: (i) => `Alles van ${i} zichtbaar maken`,
    unhide_model: "Dit model zichtbaar maken",
    empty_hidden: "Er is niets verborgen.",
  },
};

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const norm = (value) => String(value ?? "").trim().toLowerCase();
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"></path></svg>`;
const formatSize = (bytes) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;
const tagLabel = (tag) => [tag.manufacturer, tag.model].filter(Boolean).join(" ");

class ManualVaultPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._loading = false;
    this._tab = "devices";
    this._search = "";
    this._filter = "all";
    this._expanded = new Set();
    this._dialog = null;
    this._built = false;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._build();
      this._load();
    }
  }

  get hass() {
    return this._hass;
  }

  set narrow(value) {
    this._narrow = value;
    this.toggleAttribute("narrow", !!value);
  }

  set panel(value) {
    this._panel = value;
  }

  connectedCallback() {
    this._deepLinked = null;
    this._onLocation = () => this._checkDeepLink();
    window.addEventListener("location-changed", this._onLocation);
    window.addEventListener("popstate", this._onLocation);
    if (this._hass && this._built) this._load();
  }

  disconnectedCallback() {
    window.removeEventListener("location-changed", this._onLocation);
    window.removeEventListener("popstate", this._onLocation);
  }

  _checkDeepLink() {
    if (!this._data) return;
    const id = new URLSearchParams(window.location.search).get("device");
    if (!id || id === this._deepLinked) return;
    this._deepLinked = id;
    const dev = this._deviceById.get(id);
    if (!dev) return;
    const groups = dev.hidden ? this._hiddenGroups : this._groups;
    const group = groups.find((g) => g.devices.includes(dev));
    this._tab = "devices";
    this._filter = dev.hidden ? "hidden" : "all";
    this._search = "";
    const search = this.shadowRoot.querySelector(".search");
    if (search) search.value = "";
    if (group) this._expanded.add(group.key);
    this._highlight = id;
    this._render();
    const row = [...this.shadowRoot.querySelectorAll("[data-device-row]")].find((el) => el.dataset.deviceRow === id);
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  get _t() {
    const lang = (this._hass?.locale?.language || this._hass?.language || "en").toLowerCase();
    return lang.startsWith("nl") ? STRINGS.nl : STRINGS.en;
  }

  get _admin() {
    return !!this._data?.is_admin;
  }

  // ---------------------------------------------------------------- data

  async _load() {
    if (this._loading) return;
    this._loading = true;
    this._setBusy(true);
    try {
      this._data = await this._hass.callWS({ type: "manual_vault/library" });
      this._index();
      this._render();
      this._checkDeepLink();
    } catch (err) {
      this._toast(this._errorText(err), true);
    } finally {
      this._loading = false;
      this._setBusy(false);
    }
  }

  _index() {
    const d = this._data;
    this._manualById = new Map(d.manuals.map((m) => [m.id, m]));
    this._deviceById = new Map(d.devices.map((dev) => [dev.id, dev]));
    // devices using each manual
    this._usage = new Map();
    for (const dev of d.devices) {
      for (const id of dev.manuals) this._usage.set(id, (this._usage.get(id) || 0) + 1);
    }
    this._groups = this._buildGroups(d.devices.filter((dev) => !dev.hidden), "");
    this._hiddenGroups = this._buildGroups(d.devices.filter((dev) => dev.hidden), "h:");
    // known models for the tag picker
    const models = new Map();
    for (const dev of d.devices) {
      for (const model of [dev.model, dev.model_id]) {
        if (!model) continue;
        const key = `${norm(dev.manufacturer)}|${norm(model)}`;
        if (!models.has(key)) models.set(key, { manufacturer: dev.manufacturer, model });
      }
    }
    this._knownModels = [...models.values()].sort((a, b) =>
      tagLabel(a).localeCompare(tagLabel(b), undefined, { sensitivity: "base" })
    );
  }

  _buildGroups(devices, prefix) {
    // group devices by manufacturer + model
    const groups = new Map();
    for (const dev of devices) {
      const key = `${prefix}${norm(dev.manufacturer)}|${norm(dev.model)}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, manufacturer: dev.manufacturer, model: dev.model, model_ids: new Set(), devices: [], integrations: new Set() };
        groups.set(key, group);
      }
      group.devices.push(dev);
      if (dev.model_id && norm(dev.model_id) !== norm(dev.model)) group.model_ids.add(dev.model_id);
      if (dev.integration) group.integrations.add(dev.integration);
    }
    for (const group of groups.values()) {
      const ids = new Set();
      group.devices.forEach((dev) => dev.manuals.forEach((id) => ids.add(id)));
      group.manuals = [...ids];
      group.missing = group.devices.filter((dev) => dev.manuals.length === 0).length;
    }
    return [...groups.values()];
  }

  _findGroup(key) {
    return this._groups.find((g) => g.key === key) || this._hiddenGroups.find((g) => g.key === key);
  }

  _errorText(err) {
    const t = this._t;
    const code = err?.code;
    if (code === "backup_running") return t.backup_running;
    if (code === "not_pdf") return t.not_pdf;
    if (code === "too_large") return t.too_large(Math.round((this._data?.max_size || 0) / 1048576));
    return err?.message || t.error;
  }

  // -------------------------------------------------------------- render

  _build() {
    const t = this._t;
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="toolbar">
        <button class="icon-btn menu" data-action="menu" title="Menu">${icon("menu")}</button>
        <div class="main-title">Manual Vault</div>
        <button class="icon-btn" data-action="refresh" title="${esc(t.refresh)}">${icon("refresh")}</button>
        <button class="btn primary admin-only" data-action="upload" hidden>${icon("upload")}<span>${esc(t.upload)}</span></button>
      </div>
      <div class="progress" hidden></div>
      <div class="content">
        <div class="tabs" role="tablist">
          <button class="tab" data-action="tab" data-tab="devices" role="tab"></button>
          <button class="tab" data-action="tab" data-tab="manuals" role="tab"></button>
        </div>
        <div class="readonly" hidden>${esc(t.read_only)}</div>
        <div class="filters">
          <input class="search" type="search" placeholder="${esc(t.search)}" />
          <div class="chips"></div>
        </div>
        <div class="list"></div>
      </div>
      <div class="dialog-host"></div>
      <div class="toast" hidden></div>
    `;
    const root = this.shadowRoot;
    root.addEventListener("click", (ev) => this._onClick(ev));
    root.addEventListener("change", (ev) => this._onChange(ev));
    root.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && this._dialog) this._closeDialog();
    });
    root.querySelector(".search").addEventListener("input", (ev) => {
      this._search = ev.target.value;
      this._renderList();
    });
    this._built = true;
  }

  _setBusy(busy) {
    const bar = this.shadowRoot.querySelector(".progress");
    if (bar) bar.hidden = !busy;
  }

  _render() {
    if (!this._built || !this._data) return;
    const t = this._t;
    const root = this.shadowRoot;
    root.querySelector(".admin-only").hidden = !this._admin;
    root.querySelector(".readonly").hidden = this._admin;
    const [devTab, manTab] = root.querySelectorAll(".tab");
    devTab.textContent = `${t.devices} (${this._groups.length})`;
    manTab.textContent = `${t.manuals} (${this._data.manuals.length})`;
    devTab.classList.toggle("active", this._tab === "devices");
    manTab.classList.toggle("active", this._tab === "manuals");
    devTab.setAttribute("aria-selected", this._tab === "devices");
    manTab.setAttribute("aria-selected", this._tab === "manuals");

    const filters =
      this._tab === "devices"
        ? [["all", t.all], ["missing", t.missing], ["has", t.has_manual], ["hidden", `${t.hidden} (${this._hiddenGroups.reduce((n, g) => n + g.devices.length, 0)})`]]
        : [["all", t.all], ["untagged", t.untagged], ["file_missing", t.file_missing]];
    if (!filters.some(([key]) => key === this._filter)) this._filter = "all";
    root.querySelector(".chips").innerHTML = filters
      .map(
        ([key, label]) =>
          `<button class="chip ${this._filter === key ? "active" : ""}" data-action="filter" data-filter="${key}">${esc(label)}</button>`
      )
      .join("");
    this._renderList();
  }

  _renderList() {
    const list = this.shadowRoot.querySelector(".list");
    if (!list || !this._data) return;
    list.innerHTML = this._tab === "devices" ? this._renderGroups() : this._renderManuals();
  }

  _matchesSearch(...values) {
    const q = norm(this._search);
    return !q || values.some((v) => norm(v).includes(q));
  }

  _renderGroups() {
    const t = this._t;
    if (this._filter === "hidden") return this._renderHidden();
    const groups = this._groups.filter((g) => {
      if (this._filter === "missing" && g.missing === 0) return false;
      if (this._filter === "has" && g.manuals.length === 0) return false;
      return this._matchesSearch(
        g.manufacturer,
        g.model,
        ...g.model_ids,
        ...g.devices.map((d) => d.name),
        ...g.devices.map((d) => d.area),
        ...g.manuals.map((id) => this._manualById.get(id)?.title)
      );
    });
    if (!groups.length) return `<div class="empty">${esc(t.nothing_found)}</div>`;
    return groups
      .map((g) => {
        const open = this._expanded.has(g.key);
        const ok = g.missing === 0;
        const status = ok ? "ok" : g.manuals.length ? "partial" : "missing";
        const manuals = g.manuals
          .map((id) => this._manualById.get(id))
          .filter(Boolean)
          .map((m) => this._manualLink(m))
          .join("");
        const actions =
          this._admin && !ok
            ? `<div class="row-actions">
                <button class="btn small primary" data-action="upload-model" data-group="${esc(g.key)}">${icon("upload")}<span>${esc(t.upload)}</span></button>
                ${g.model ? `<button class="btn small" data-action="link-model" data-group="${esc(g.key)}">${icon("link")}<span>${esc(t.link_existing)}</span></button>` : ""}
              </div>`
            : "";
        const modelIds = [...g.model_ids].map((m) => `<span class="mono">${esc(m)}</span>`).join(" ");
        return `
          <div class="card group ${status}">
            <div class="group-head" data-action="toggle" data-group="${esc(g.key)}">
              <span class="chev ${open ? "open" : ""}">${icon("chevron")}</span>
              <span class="dot ${status}" title="${esc(ok ? t.has_manual : t.missing)}"></span>
              <div class="group-title">
                <div class="primary-line">${esc(g.manufacturer || t.unknown)} · <b>${esc(g.model || t.unknown)}</b> ${modelIds}</div>
                <div class="secondary-line">${esc(t.devices_count(g.devices.length))}${g.integrations.size ? " · " + [...g.integrations].map(esc).join(", ") : ""}</div>
              </div>
              ${this._admin ? `<button class="icon-btn small" data-action="hide-menu" data-group="${esc(g.key)}" title="${esc(t.hide)}">${icon("eyeOff")}</button>` : ""}
            </div>
            <div class="group-body">
              ${manuals ? `<div class="manual-links">${manuals}</div>` : `<div class="muted">${esc(t.no_manual)}</div>`}
              ${actions}
            </div>
            ${open ? `<div class="device-list">${g.devices.map((d) => this._renderDevice(d)).join("")}</div>` : ""}
          </div>`;
      })
      .join("");
  }

  _renderDevice(dev) {
    const t = this._t;
    const manuals = dev.manuals.map((id) => this._manualById.get(id)).filter(Boolean);
    const admin = this._admin
      ? `<button class="icon-btn small" data-action="link-device" data-device="${esc(dev.id)}" title="${esc(t.link_device)}">${icon("link")}</button>` +
        `<button class="icon-btn small" data-action="hide-device" data-device="${esc(dev.id)}" title="${esc(t.hide_device)}">${icon("eyeOff")}</button>` +
        (dev.match === "device"
          ? `<button class="icon-btn small" data-action="unlink-device" data-device="${esc(dev.id)}" title="${esc(t.unlink)}">${icon("unlink")}</button>`
          : "")
      : "";
    return `
      <div class="device ${this._highlight === dev.id ? "highlight" : ""}" data-device-row="${esc(dev.id)}">
        <span class="dot ${manuals.length ? "ok" : "missing"}"></span>
        <div class="device-main">
          <div>${esc(dev.name || t.unknown)}${dev.match === "device" ? ` <span class="badge">${esc(t.linked_direct)}</span>` : ""}</div>
          <div class="secondary-line">${[dev.area, dev.integration].filter(Boolean).map(esc).join(" · ")}</div>
          ${manuals.length ? `<div class="manual-links">${manuals.map((m) => this._manualLink(m)).join("")}</div>` : ""}
        </div>
        <div class="device-actions">${admin}</div>
      </div>`;
  }

  _renderHidden() {
    const t = this._t;
    const groups = this._hiddenGroups.filter((g) =>
      this._matchesSearch(g.manufacturer, g.model, ...g.devices.map((d) => d.name), ...g.integrations)
    );
    if (!groups.length) return `<div class="empty">${esc(this._hiddenGroups.length ? t.nothing_found : t.empty_hidden)}</div>`;
    return `<div class="note">${esc(t.hide_help)}</div>` + groups
      .map((g) => {
        const rows = g.devices
          .map((dev) => {
            const reason =
              dev.hidden === "device" ? t.reason_device : dev.hidden === "model" ? t.reason_model : t.reason_integration(dev.integration);
            const label =
              dev.hidden === "integration" ? t.unhide_integration(dev.integration) : dev.hidden === "model" ? t.unhide_model : t.unhide;
            const manuals = dev.manuals.map((id) => this._manualById.get(id)).filter(Boolean);
            return `
              <div class="device ${this._highlight === dev.id ? "highlight" : ""}" data-device-row="${esc(dev.id)}">
                <span class="dot hidden-dot"></span>
                <div class="device-main">
                  <div>${esc(dev.name || t.unknown)} <span class="badge">${esc(reason)}</span></div>
                  <div class="secondary-line">${[dev.area, dev.integration].filter(Boolean).map(esc).join(" · ")}</div>
                  ${manuals.length ? `<div class="manual-links">${manuals.map((m) => this._manualLink(m)).join("")}</div>` : ""}
                </div>
                ${this._admin ? `<div class="device-actions"><button class="btn small" data-action="unhide" data-device="${esc(dev.id)}">${icon("eye")}<span>${esc(label)}</span></button></div>` : ""}
              </div>`;
          })
          .join("");
        return `
          <div class="card group hidden-group">
            <div class="group-head static">
              <div class="group-title">
                <div class="primary-line">${esc(g.manufacturer || t.unknown)} · <b>${esc(g.model || t.unknown)}</b></div>
                <div class="secondary-line">${esc(t.devices_count(g.devices.length))}</div>
              </div>
            </div>
            <div class="device-list">${rows}</div>
          </div>`;
      })
      .join("");
  }

  _manualLink(m) {
    return `<button class="manual-link ${m.missing ? "broken" : ""}" data-action="open" data-manual="${esc(m.id)}" ${m.missing ? "disabled" : ""}>${icon("book")}<span>${esc(m.title)}</span></button>`;
  }

  _renderManuals() {
    const t = this._t;
    if (!this._data.manuals.length) return `<div class="empty">${esc(t.empty_manuals)}</div>`;
    const manuals = this._data.manuals.filter((m) => {
      if (this._filter === "untagged" && (m.tags.length || m.devices.length)) return false;
      if (this._filter === "file_missing" && !m.missing) return false;
      return this._matchesSearch(m.title, m.file, ...m.tags.map(tagLabel), ...m.devices.map((id) => this._deviceById.get(id)?.name));
    });
    if (!manuals.length) return `<div class="empty">${esc(t.nothing_found)}</div>`;
    return manuals
      .map((m) => {
        const tags = m.tags.map((tag) => `<span class="tag">${esc(tagLabel(tag))}</span>`).join("");
        const devs = m.devices
          .map((id) => this._deviceById.get(id))
          .filter(Boolean)
          .map((d) => `<span class="tag device-tag">${icon("link")}${esc(d.name)}</span>`)
          .join("");
        const untagged = !m.tags.length && !m.devices.length;
        const used = this._usage.get(m.id) || 0;
        const admin = this._admin
          ? `<button class="icon-btn" data-action="edit" data-manual="${esc(m.id)}" title="${esc(t.edit)}">${icon("pencil")}</button>
             <button class="icon-btn" data-action="replace" data-manual="${esc(m.id)}" title="${esc(t.replace)}">${icon("replace")}</button>
             <button class="icon-btn danger" data-action="delete" data-manual="${esc(m.id)}" title="${esc(t.delete)}">${icon("delete")}</button>`
          : "";
        return `
          <div class="card manual ${m.missing ? "missing" : ""}">
            <div class="manual-head">
              <div class="manual-icon">${icon("book")}</div>
              <div class="manual-main">
                <div class="primary-line"><b>${esc(m.title)}</b>
                  ${m.missing ? `<span class="badge error">${esc(t.file_missing)}</span>` : ""}
                  ${untagged ? `<span class="badge warn">${esc(t.untagged)}</span>` : ""}
                </div>
                <div class="secondary-line"><span class="mono">${esc(m.file)}</span>${m.size ? " · " + formatSize(m.size) : ""} · ${esc(t.matched(used))}</div>
              </div>
              <div class="manual-actions">
                <button class="icon-btn" data-action="open" data-manual="${esc(m.id)}" title="${esc(t.open)}" ${m.missing ? "disabled" : ""}>${icon("open")}</button>
                <button class="icon-btn" data-action="download" data-manual="${esc(m.id)}" title="${esc(t.download)}" ${m.missing ? "disabled" : ""}>${icon("download")}</button>
                ${admin}
              </div>
            </div>
            ${tags || devs ? `<div class="tags">${tags}${devs}</div>` : ""}
          </div>`;
      })
      .join("");
  }

  // -------------------------------------------------------------- events

  _onClick(ev) {
    const el = ev.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    const group = el.dataset.group ? this._findGroup(el.dataset.group) : null;
    const manual = el.dataset.manual ? this._manualById.get(el.dataset.manual) : null;
    const device = el.dataset.device ? this._deviceById.get(el.dataset.device) : null;
    switch (a) {
      case "menu":
        this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true }));
        break;
      case "refresh":
        this._load();
        break;
      case "tab":
        this._tab = el.dataset.tab;
        this._filter = "all";
        this._render();
        break;
      case "filter":
        this._filter = el.dataset.filter;
        this._render();
        break;
      case "toggle":
        if (this._expanded.has(group.key)) this._expanded.delete(group.key);
        else this._expanded.add(group.key);
        this._renderList();
        break;
      case "upload":
        this._openUpload({});
        break;
      case "upload-model":
        if (group.model) this._openUpload({ tags: [{ manufacturer: group.manufacturer, model: group.model }] });
        else this._openUpload({ devices: group.devices.map((dev) => dev.id) });
        break;
      case "link-model":
        this._openLink({ group });
        break;
      case "link-device":
        this._openLink({ device });
        break;
      case "unlink-device":
        this._unlinkDevice(device);
        break;
      case "hide-menu":
        ev.stopPropagation();
        this._dialog = { kind: "hide", group };
        this._renderDialog();
        break;
      case "hide-device":
        this._setHidden({ kind: "device", device_id: device.id }, true);
        break;
      case "unhide":
        if (device.hidden === "device") this._setHidden({ kind: "device", device_id: device.id }, false);
        else if (device.hidden === "model")
          this._setHidden({ kind: "model", manufacturer: device.manufacturer, model: device.model }, false);
        else this._setHidden({ kind: "integration", integration: device.integration }, false);
        break;
      case "open":
        this._openFile(manual, false);
        break;
      case "download":
        this._openFile(manual, true);
        break;
      case "edit":
        this._openEdit(manual);
        break;
      case "replace":
        this._openUpload({ replace: manual });
        break;
      case "delete":
        this._openDelete(manual);
        break;
      default:
        this._onDialogClick(a, el);
    }
  }

  _onChange(ev) {
    if (!this._dialog) return;
    const el = ev.target;
    if (el.name === "file") {
      const file = el.files?.[0];
      this._dialog.file = file || null;
      const title = this.shadowRoot.querySelector('.dialog input[name="title"]');
      if (file && title && !title.value && !this._dialog.replace) {
        title.value = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
      }
      this._dialogError(file ? this._checkFile(file) : "");
    } else if (el.name === "add-model") {
      if (el.value === "__custom") {
        this._dialog.custom = true;
      } else if (el.value) {
        const tag = this._knownModels[Number(el.value)];
        this._addTag(tag);
      }
      this._renderDialog();
    } else if (el.name === "add-device" && el.value) {
      if (!this._dialog.devices.includes(el.value)) this._dialog.devices.push(el.value);
      this._renderDialog();
    }
  }

  // ------------------------------------------------------------- actions

  async _openFile(manual, download) {
    if (!manual) return;
    // open the window synchronously so popup blockers allow it
    const win = download ? null : window.open("", "_blank");
    try {
      let path = `/api/manual_vault/file/${manual.id}`;
      if (download) path += "?download=1";
      const signed = await this._hass.callWS({ type: "auth/sign_path", path, expires: 300 });
      const url = this._hass.hassUrl ? this._hass.hassUrl(signed.path) : signed.path;
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = manual.file;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      if (win) win.close();
      this._toast(this._errorText(err), true);
    }
  }

  async _unlinkDevice(device) {
    const changes = this._data.manuals.filter((m) => m.devices.includes(device.id));
    try {
      for (const m of changes) {
        await this._hass.callWS({
          type: "manual_vault/update",
          manual_id: m.id,
          devices: m.devices.filter((id) => id !== device.id),
        });
      }
      this._toast(this._t.saved);
      await this._load();
    } catch (err) {
      this._toast(this._errorText(err), true);
    }
  }

  async _setHidden(target, hidden) {
    try {
      await this._hass.callWS({ type: "manual_vault/hide", hidden, ...target });
      this._closeDialog();
      this._toast(this._t.saved);
      await this._load();
    } catch (err) {
      this._toast(this._errorText(err), true);
    }
  }

  _checkFile(file) {
    const t = this._t;
    if (!/\.pdf$/i.test(file.name)) return t.not_pdf;
    if (file.size > this._data.max_size) return t.too_large(Math.round(this._data.max_size / 1048576));
    return "";
  }

  // ------------------------------------------------------------- dialogs

  _openUpload({ tags = [], devices = [], replace = null }) {
    this._dialog = {
      kind: "upload",
      replace,
      tags: replace ? [] : tags.map((x) => ({ ...x })),
      devices: replace ? [] : [...devices],
      file: null,
      custom: false,
      showDevices: devices.length > 0,
    };
    this._renderDialog();
  }

  _openEdit(manual) {
    this._dialog = {
      kind: "edit",
      manual,
      title: manual.title,
      tags: manual.tags.map((x) => ({ ...x })),
      devices: [...manual.devices],
      custom: false,
      showDevices: manual.devices.length > 0,
    };
    this._renderDialog();
  }

  _openLink({ group = null, device = null }) {
    this._dialog = { kind: "link", group, device };
    this._renderDialog();
  }

  _openDelete(manual) {
    this._dialog = { kind: "delete", manual };
    this._renderDialog();
  }

  _closeDialog() {
    this._dialog = null;
    this.shadowRoot.querySelector(".dialog-host").innerHTML = "";
  }

  _addTag(tag) {
    const key = `${norm(tag.manufacturer)}|${norm(tag.model)}`;
    if (!tag.model || this._dialog.tags.some((x) => `${norm(x.manufacturer)}|${norm(x.model)}` === key)) return;
    this._dialog.tags.push({ manufacturer: tag.manufacturer || "", model: tag.model });
  }

  _readTitle() {
    const input = this.shadowRoot.querySelector('.dialog input[name="title"]');
    return input ? input.value : undefined;
  }

  _renderDialog() {
    const host = this.shadowRoot.querySelector(".dialog-host");
    const d = this._dialog;
    if (!d) {
      host.innerHTML = "";
      return;
    }
    // keep what the user typed across re-renders
    const typed = this._readTitle();
    if (typed !== undefined) d.title = typed;
    const t = this._t;
    let heading = "";
    let body = "";
    let footer = "";

    if (d.kind === "upload" || d.kind === "edit") {
      const isUpload = d.kind === "upload";
      heading = isUpload ? (d.replace ? `${t.replace}: ${d.replace.title}` : t.upload_manual) : t.edit;
      body = `
        ${isUpload ? `
          <label class="field">${esc(t.file)}
            <input type="file" name="file" accept="application/pdf,.pdf" />
            ${d.file ? `<span class="help">${esc(d.file.name)} · ${formatSize(d.file.size)}</span>` : ""}
          </label>` : ""}
        ${d.replace ? "" : `
          <label class="field">${esc(t.title)}
            <input type="text" name="title" maxlength="200" value="${esc(d.title ?? "")}" />
          </label>
          ${this._renderTagEditor()}
          ${this._renderDeviceEditor()}`}
        <div class="dialog-error" hidden></div>`;
      footer = `
        <button class="btn" data-action="dlg-cancel">${esc(t.cancel)}</button>
        <button class="btn primary" data-action="${isUpload ? "dlg-upload" : "dlg-save"}">${esc(isUpload ? t.upload : t.save)}</button>`;
    } else if (d.kind === "link") {
      const subject = d.group
        ? t.link_model_help(tagLabel({ manufacturer: d.group.manufacturer, model: d.group.model }))
        : t.link_device_help(d.device.name || t.unknown);
      heading = d.group ? t.link_existing : t.link_device;
      const options = this._data.manuals
        .map((m) => `<button class="pick" data-action="dlg-pick" data-manual="${esc(m.id)}">${icon("book")}<span>${esc(m.title)}</span><span class="secondary-line">${esc(m.tags.map(tagLabel).join(", "))}</span></button>`)
        .join("");
      body = `<p class="muted">${esc(subject)}</p>
        <div class="pick-list">${options || `<div class="empty">${esc(t.empty_manuals)}</div>`}</div>
        <div class="dialog-error" hidden></div>`;
      footer = `<button class="btn" data-action="dlg-cancel">${esc(t.cancel)}</button>`;
    } else if (d.kind === "hide") {
      const g = d.group;
      heading = t.hide_title;
      const options = [];
      if (g.model || g.manufacturer) {
        options.push(`<button class="pick" data-action="dlg-hide-model">${icon("eyeOff")}<span>${esc(t.hide_model(tagLabel(g) || t.unknown))}</span><span class="secondary-line">${esc(t.hide_model_help)}</span></button>`);
      }
      for (const integ of g.integrations) {
        options.push(`<button class="pick" data-action="dlg-hide-integration" data-integration="${esc(integ)}">${icon("eyeOff")}<span>${esc(t.hide_integration(integ))}</span><span class="secondary-line">${esc(t.hide_integration_help)}</span></button>`);
      }
      body = `<div class="pick-list">${options.join("")}</div><p class="muted">${esc(t.hide_help)}</p><div class="dialog-error" hidden></div>`;
      footer = `<button class="btn" data-action="dlg-cancel">${esc(t.cancel)}</button>`;
    } else if (d.kind === "delete") {
      heading = t.delete;
      body = `<p>${esc(t.confirm_delete(d.manual.title))}</p><div class="dialog-error" hidden></div>`;
      footer = `
        <button class="btn" data-action="dlg-cancel">${esc(t.cancel)}</button>
        <button class="btn danger-fill" data-action="dlg-delete">${esc(t.delete)}</button>`;
    }

    host.innerHTML = `
      <div class="scrim" data-action="dlg-cancel"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(heading)}">
        <div class="dialog-head">
          <div class="dialog-title">${esc(heading)}</div>
          <button class="icon-btn" data-action="dlg-cancel" title="${esc(t.close)}">${icon("close")}</button>
        </div>
        <div class="dialog-body">${body}</div>
        <div class="dialog-foot">${footer}</div>
      </div>`;
  }

  _renderTagEditor() {
    const t = this._t;
    const d = this._dialog;
    const chips = d.tags
      .map((tag, i) => `<span class="tag removable">${esc(tagLabel(tag))}<button data-action="dlg-remove-tag" data-index="${i}" title="${esc(t.delete)}">${icon("close")}</button></span>`)
      .join("");
    const taken = new Set(d.tags.map((x) => `${norm(x.manufacturer)}|${norm(x.model)}`));
    const options = this._knownModels
      .map((m, i) => (taken.has(`${norm(m.manufacturer)}|${norm(m.model)}`) ? "" : `<option value="${i}">${esc(tagLabel(m))}</option>`))
      .join("");
    const custom = d.custom
      ? `<div class="custom-tag">
          <input type="text" name="custom-manufacturer" placeholder="${esc(t.manufacturer)}" />
          <input type="text" name="custom-model" placeholder="${esc(t.model)}" />
          <button class="btn small" data-action="dlg-add-custom">${esc(t.add)}</button>
        </div>`
      : "";
    return `
      <div class="field">${esc(t.tags)}
        <div class="help">${esc(t.tags_help)}</div>
        <div class="tags">${chips}</div>
        <select name="add-model">
          <option value="">${esc(t.add_model)}</option>
          ${options}
          <option value="__custom">${esc(t.custom_model)}</option>
        </select>
        ${custom}
      </div>`;
  }

  _renderDeviceEditor() {
    const t = this._t;
    const d = this._dialog;
    if (!d.showDevices) {
      return `<button class="link-btn" data-action="dlg-show-devices">${icon("link")}<span>${esc(t.specific_devices)}…</span></button>`;
    }
    const chips = d.devices
      .map((id) => this._deviceById.get(id))
      .filter(Boolean)
      .map((dev) => `<span class="tag removable">${esc(dev.name)}<button data-action="dlg-remove-device" data-device="${esc(dev.id)}" title="${esc(t.delete)}">${icon("close")}</button></span>`)
      .join("");
    const options = this._data.devices
      .filter((dev) => !d.devices.includes(dev.id))
      .map((dev) => `<option value="${esc(dev.id)}">${esc(dev.name || t.unknown)} — ${esc(tagLabel(dev) || t.unknown)}</option>`)
      .join("");
    return `
      <div class="field">${esc(t.specific_devices)}
        <div class="help">${esc(t.devices_help)}</div>
        <div class="tags">${chips}</div>
        <select name="add-device">
          <option value="">${esc(t.add_device)}</option>
          ${options}
        </select>
      </div>`;
  }

  _dialogError(message) {
    const box = this.shadowRoot.querySelector(".dialog-error");
    if (!box) return;
    box.textContent = message || "";
    box.hidden = !message;
  }

  _dialogBusy(busy, label) {
    this.shadowRoot.querySelectorAll(".dialog-foot .btn").forEach((b) => (b.disabled = busy));
    const primary = this.shadowRoot.querySelector(".dialog-foot .btn.primary");
    if (primary && label) primary.textContent = label;
  }

  async _onDialogClick(action, el) {
    const d = this._dialog;
    if (!d) return;
    const t = this._t;
    switch (action) {
      case "dlg-cancel":
        this._closeDialog();
        break;
      case "dlg-remove-tag":
        d.tags.splice(Number(el.dataset.index), 1);
        this._renderDialog();
        break;
      case "dlg-remove-device":
        d.devices = d.devices.filter((id) => id !== el.dataset.device);
        this._renderDialog();
        break;
      case "dlg-show-devices":
        d.showDevices = true;
        this._renderDialog();
        break;
      case "dlg-add-custom": {
        const root = this.shadowRoot;
        const model = root.querySelector('input[name="custom-model"]').value.trim();
        const manufacturer = root.querySelector('input[name="custom-manufacturer"]').value.trim();
        if (!model) return;
        this._addTag({ manufacturer, model });
        d.custom = false;
        this._renderDialog();
        break;
      }
      case "dlg-upload":
        await this._submitUpload();
        break;
      case "dlg-hide-model":
        await this._setHidden({ kind: "model", manufacturer: d.group.manufacturer || "", model: d.group.model || "" }, true);
        break;
      case "dlg-hide-integration":
        await this._setHidden({ kind: "integration", integration: el.dataset.integration }, true);
        break;
      case "dlg-save":
        await this._submitEdit();
        break;
      case "dlg-delete":
        await this._submit(
          () => this._hass.callWS({ type: "manual_vault/delete", manual_id: d.manual.id }),
          t.deleted
        );
        break;
      case "dlg-pick": {
        const manual = this._manualById.get(el.dataset.manual);
        if (!manual) return;
        const msg = { type: "manual_vault/update", manual_id: manual.id };
        if (d.group) {
          msg.tags = [...manual.tags, { manufacturer: d.group.manufacturer || "", model: d.group.model }];
        } else {
          msg.devices = [...new Set([...manual.devices, d.device.id])];
        }
        await this._submit(() => this._hass.callWS(msg), t.saved);
        break;
      }
      default:
        break;
    }
  }

  async _submit(fn, success) {
    this._dialogBusy(true);
    try {
      await fn();
      this._closeDialog();
      this._toast(success);
      await this._load();
    } catch (err) {
      this._dialogBusy(false);
      this._dialogError(this._errorText(err));
    }
  }

  async _submitEdit() {
    const d = this._dialog;
    const title = this._readTitle()?.trim();
    if (!title) {
      this._dialogError(this._t.title);
      return;
    }
    await this._submit(
      () =>
        this._hass.callWS({
          type: "manual_vault/update",
          manual_id: d.manual.id,
          title,
          tags: d.tags,
          devices: d.devices,
        }),
      this._t.saved
    );
  }

  async _submitUpload() {
    const t = this._t;
    const d = this._dialog;
    if (!d.file) {
      this._dialogError(t.choose_file);
      return;
    }
    const problem = this._checkFile(d.file);
    if (problem) {
      this._dialogError(problem);
      return;
    }
    const form = new FormData();
    const title = this._readTitle()?.trim();
    if (title) form.append("title", title);
    form.append("tags", JSON.stringify(d.tags));
    form.append("devices", JSON.stringify(d.devices));
    if (d.replace) form.append("replace", d.replace.id);
    form.append("file", d.file, d.file.name);
    this._dialogBusy(true, t.uploading);
    try {
      await this._upload(form, (pct) => this._dialogBusy(true, `${t.uploading} ${pct}%`));
      this._closeDialog();
      this._toast(t.uploaded);
      await this._load();
    } catch (err) {
      this._dialogBusy(false, t.upload);
      this._dialogError(this._errorText(err));
    }
  }

  async _upload(form, onProgress) {
    const auth = this._hass.auth;
    if (auth.expired) await auth.refreshAccessToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this._hass.hassUrl ? this._hass.hassUrl("/api/manual_vault/upload") : "/api/manual_vault/upload";
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${auth.accessToken}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch (_e) {
          body = { message: xhr.statusText };
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(body);
      };
      xhr.onerror = () => reject({ message: this._t.error });
      xhr.send(form);
    });
  }

  // --------------------------------------------------------------- toast

  _toast(message, error = false) {
    const el = this.shadowRoot.querySelector(".toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", error);
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (el.hidden = true), error ? 6000 : 3000);
  }
}

const STYLES = `
  :host {
    display: block;
    min-height: 100vh;
    background: var(--primary-background-color);
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
    --mv-ok: var(--success-color, #43a047);
    --mv-warn: var(--warning-color, #ffa600);
    --mv-err: var(--error-color, #db4437);
    --mv-radius: var(--ha-card-border-radius, 12px);
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  svg { width: 20px; height: 20px; fill: currentColor; flex: none; }
  button { font: inherit; color: inherit; }
  .toolbar {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; gap: 8px;
    height: var(--header-height, 56px); padding: 0 12px;
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, var(--text-primary-color, #fff));
    border-bottom: var(--app-header-border-bottom, none);
  }
  .main-title { flex: 1; font-size: 20px; margin-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .menu { display: none; }
  :host([narrow]) .menu { display: inline-flex; }
  .progress { height: 3px; background: linear-gradient(90deg, transparent, var(--primary-color), transparent); background-size: 200% 100%; animation: slide 1s linear infinite; }
  @keyframes slide { from { background-position: 100% 0; } to { background-position: -100% 0; } }
  .content { max-width: 960px; margin: 0 auto; padding: 16px; }
  .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--divider-color); margin-bottom: 12px; }
  .tab { background: none; border: none; padding: 10px 14px; cursor: pointer; color: var(--secondary-text-color); border-bottom: 2px solid transparent; font-weight: 500; }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
  .readonly { padding: 10px 12px; margin-bottom: 12px; border-radius: 8px; background: var(--secondary-background-color); color: var(--secondary-text-color); font-size: 14px; }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  .search { flex: 1 1 220px; min-width: 0; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font: inherit; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { border: 1px solid var(--divider-color); background: var(--card-background-color); border-radius: 16px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
  .chip.active { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .card { background: var(--card-background-color); border-radius: var(--mv-radius); box-shadow: var(--ha-card-box-shadow, none); border: 1px solid var(--divider-color); margin-bottom: 8px; overflow: hidden; }
  .group-head { display: flex; align-items: center; gap: 8px; padding: 12px 12px 4px; cursor: pointer; }
  .group-title { min-width: 0; flex: 1; }
  .group-body { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 4px 12px 12px 56px; }
  .chev svg { transition: transform .15s; color: var(--secondary-text-color); }
  .chev.open svg { transform: rotate(90deg); }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--mv-err); }
  .dot.ok { background: var(--mv-ok); }
  .dot.partial { background: var(--mv-warn); }
  .primary-line { overflow-wrap: anywhere; }
  .secondary-line { color: var(--secondary-text-color); font-size: 13px; margin-top: 2px; overflow-wrap: anywhere; }
  .mono { font-family: var(--code-font-family, monospace); font-size: 12px; color: var(--secondary-text-color); }
  .muted { color: var(--secondary-text-color); font-size: 14px; }
  .manual-links { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
  .manual-link { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 16px; border: 1px solid var(--primary-color); background: none; color: var(--primary-color); cursor: pointer; font-size: 13px; max-width: 100%; }
  .manual-link span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .manual-link svg { width: 16px; height: 16px; }
  .manual-link.broken { border-color: var(--mv-err); color: var(--mv-err); cursor: default; }
  .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .device-list { border-top: 1px solid var(--divider-color); }
  .device { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px 10px 56px; border-bottom: 1px solid var(--divider-color); }
  .device:last-child { border-bottom: none; }
  .device.highlight { background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12); box-shadow: inset 3px 0 0 var(--primary-color); }
  .dot.hidden-dot { background: var(--disabled-text-color, #9e9e9e); }
  .group-head.static { cursor: default; padding-bottom: 8px; }
  .hidden-group .device { padding-left: 12px; }
  .note { padding: 10px 12px; margin-bottom: 12px; border-radius: 8px; background: var(--secondary-background-color); color: var(--secondary-text-color); font-size: 13px; }
  .device .dot { margin-top: 6px; }
  .device-main { flex: 1; min-width: 0; }
  .device-main .manual-links { margin-top: 6px; }
  .device-actions { display: flex; gap: 2px; }
  .manual-head { display: flex; gap: 12px; align-items: center; padding: 12px; }
  .manual-icon { color: var(--primary-color); display: flex; }
  .manual-main { flex: 1; min-width: 0; }
  .manual-actions { display: flex; gap: 2px; flex-wrap: wrap; justify-content: flex-end; }
  .card.manual.missing { border-color: var(--mv-err); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 12px 48px; }
  .dialog .tags { padding: 6px 0; }
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; background: var(--secondary-background-color); font-size: 13px; }
  .tag svg { width: 14px; height: 14px; }
  .tag.removable { padding-right: 4px; }
  .tag.removable button { display: inline-flex; border: none; background: none; cursor: pointer; padding: 2px; border-radius: 50%; color: var(--secondary-text-color); }
  .badge { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 10px; background: var(--secondary-background-color); color: var(--secondary-text-color); vertical-align: middle; margin-left: 4px; }
  .badge.error { background: var(--mv-err); color: #fff; }
  .badge.warn { background: var(--mv-warn); color: #000; }
  .empty { padding: 32px 16px; text-align: center; color: var(--secondary-text-color); }
  .btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 8px 14px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer; font-weight: 500; }
  .btn.small { padding: 5px 10px; font-size: 13px; }
  .btn.small svg { width: 16px; height: 16px; }
  .btn.primary { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .toolbar .btn.primary { background: rgba(255,255,255,.15); border-color: transparent; color: inherit; }
  .btn.danger-fill { background: var(--mv-err); border-color: var(--mv-err); color: #fff; }
  .btn:disabled { opacity: .6; cursor: default; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: none; background: none; cursor: pointer; color: inherit; }
  .card .icon-btn, .dialog .icon-btn { color: var(--secondary-text-color); }
  .icon-btn.small { width: 32px; height: 32px; }
  .icon-btn:hover:not(:disabled) { background: rgba(127,127,127,.15); }
  .icon-btn:disabled { opacity: .35; cursor: default; }
  .icon-btn.danger:hover { color: var(--mv-err); }
  .link-btn { display: inline-flex; align-items: center; gap: 6px; border: none; background: none; color: var(--primary-color); cursor: pointer; padding: 4px 0; }
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 10; }
  .dialog { position: fixed; z-index: 11; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--card-background-color); border-radius: var(--mv-radius); box-shadow: 0 10px 40px rgba(0,0,0,.4); }
  .dialog-head { display: flex; align-items: center; padding: 12px 8px 4px 20px; }
  .dialog-title { flex: 1; font-size: 18px; font-weight: 500; overflow-wrap: anywhere; }
  .dialog-body { padding: 8px 20px; overflow: auto; }
  .dialog-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; }
  .field { display: block; margin-bottom: 16px; font-size: 14px; font-weight: 500; }
  .field input[type=text], .field select, .custom-tag input { display: block; width: 100%; margin-top: 6px; padding: 9px 10px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--primary-background-color); color: var(--primary-text-color); font: inherit; font-weight: normal; }
  .field input[type=file] { display: block; margin-top: 6px; font-weight: normal; max-width: 100%; }
  .help { font-weight: normal; color: var(--secondary-text-color); font-size: 13px; margin-top: 2px; }
  .custom-tag { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
  .custom-tag input { margin-top: 0; }
  .dialog-error { color: var(--mv-err); font-size: 14px; margin-bottom: 8px; }
  .pick-list { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow: auto; }
  .pick { display: grid; grid-template-columns: 24px 1fr; column-gap: 8px; text-align: left; padding: 10px; border-radius: 8px; border: 1px solid var(--divider-color); background: none; cursor: pointer; }
  .pick svg { color: var(--primary-color); grid-row: span 2; }
  .pick:hover { background: var(--secondary-background-color); }
  .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 12; padding: 12px 18px; border-radius: 8px; background: var(--primary-text-color); color: var(--primary-background-color); box-shadow: 0 4px 16px rgba(0,0,0,.3); max-width: calc(100vw - 32px); }
  .toast.error { background: var(--mv-err); color: #fff; }
  @media (max-width: 600px) {
    .content { padding: 12px 8px; }
    .group-body, .device { padding-left: 12px; }
    .tags { padding-left: 12px; }
    .toolbar .btn.primary span { display: none; }
  }
`;

if (!customElements.get("manual-vault-panel")) {
  customElements.define("manual-vault-panel", ManualVaultPanel);
}
