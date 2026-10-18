/*
 * Manual Vault dashboard card: open the manuals of a device or an area.
 * Loaded automatically by the integration; no resource needed.
 */

const MV_BOOK =
  "M19 2L14 6.5V17.5L19 13V2M6.5 5C4.55 5 2.45 5.4 1 6.5V21.16C1 21.41 1.25 21.66 1.5 21.66C1.6 21.66 1.65 21.59 1.75 21.59C3.1 20.94 5.05 20.5 6.5 20.5C8.45 20.5 10.55 20.9 12 22C13.35 21.15 15.8 20.5 17.5 20.5C19.15 20.5 20.85 20.81 22.25 21.56C22.35 21.61 22.4 21.59 22.5 21.59C22.75 21.59 23 21.34 23 21.09V6.5C22.4 6.05 21.75 5.75 21 5.5V19C19.9 18.65 18.7 18.5 17.5 18.5C15.8 18.5 13.35 19.15 12 20V6.5C10.55 5.4 8.45 5 6.5 5Z";
const MV_DOWNLOAD = "M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z";
const MV_ARROW = "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z";

const MV_CARD_STRINGS = {
  en: {
    name: "Manual Vault",
    description: "Open the manuals of a device or of every device in an area.",
    title: "Manuals",
    pick: "Choose a device or an area in the card settings.",
    none: "No manual yet",
    none_area: "No devices with a manual in this area.",
    add: "Add in Manual Vault",
    missing: "File missing",
    download: "Download",
    error: "Could not load manuals",
    device_id: "Device",
    area_id: "Area (instead of a device)",
    card_title: "Title (optional)",
    show_empty: "Show devices without a manual",
  },
  nl: {
    name: "Manual Vault",
    description: "Open de handleidingen van een apparaat of van alle apparaten in een ruimte.",
    title: "Handleidingen",
    pick: "Kies een apparaat of een ruimte in de kaartinstellingen.",
    none: "Nog geen handleiding",
    none_area: "Geen apparaten met een handleiding in deze ruimte.",
    add: "Toevoegen in Manual Vault",
    missing: "Bestand ontbreekt",
    download: "Downloaden",
    error: "Handleidingen konden niet worden geladen",
    device_id: "Apparaat",
    area_id: "Ruimte (in plaats van een apparaat)",
    card_title: "Titel (optioneel)",
    show_empty: "Apparaten zonder handleiding tonen",
  },
};

const mvLang = (hass) => {
  const lang = (hass?.locale?.language || hass?.language || navigator.language || "en").toLowerCase();
  return lang.startsWith("nl") ? MV_CARD_STRINGS.nl : MV_CARD_STRINGS.en;
};
const mvEsc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const mvIcon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;

class ManualVaultCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("manual-vault-card-editor");
  }

  static getStubConfig(hass) {
    return {};
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._error = null;
    this._key = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { show_empty: true, ...config };
    this._key = null;
    if (this._hass) this._fetch();
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._fetch();
  }

  connectedCallback() {
    if (this._hass && this._config) this._fetch(true);
  }

  getCardSize() {
    const n = this._data?.devices?.reduce((sum, d) => sum + Math.max(1, d.manuals.length), 0) || 1;
    return 1 + n;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 3, min_rows: 2 };
  }

  async _fetch(force = false) {
    const cfg = this._config;
    if (!cfg || !this._hass) return;
    const key = `${cfg.device_id || ""}|${cfg.area_id || ""}`;
    if (!force && key === this._key) return;
    this._key = key;
    if (!cfg.device_id && !cfg.area_id) {
      this._data = null;
      this._render();
      return;
    }
    const msg = { type: "manual_vault/card" };
    if (cfg.device_id) msg.device_id = cfg.device_id;
    else msg.area_id = cfg.area_id;
    try {
      this._data = await this._hass.callWS(msg);
      this._error = null;
    } catch (err) {
      this._error = err?.message || "error";
    }
    this._render();
  }

  _title() {
    const t = mvLang(this._hass);
    const cfg = this._config || {};
    if (cfg.title) return cfg.title;
    if (cfg.device_id) {
      const dev = this._hass?.devices?.[cfg.device_id];
      const name = dev?.name_by_user || dev?.name || this._data?.devices?.[0]?.name;
      return name ? `${t.title} · ${name}` : t.title;
    }
    if (cfg.area_id) {
      const area = this._hass?.areas?.[cfg.area_id];
      return area?.name ? `${t.title} · ${area.name}` : t.title;
    }
    return t.title;
  }

  _render() {
    if (!this._config) return;
    const t = mvLang(this._hass);
    const cfg = this._config;
    let body;
    if (!cfg.device_id && !cfg.area_id) {
      body = `<div class="muted">${mvEsc(t.pick)}</div>`;
    } else if (this._error) {
      body = `<div class="muted error">${mvEsc(t.error)}</div>`;
    } else if (!this._data) {
      body = "";
    } else {
      const devices = this._data.devices.filter((d) => cfg.show_empty || d.manuals.length);
      const single = !!cfg.device_id;
      if (!devices.length) {
        body = `<div class="muted">${mvEsc(single ? t.none : t.none_area)}</div>`;
      } else {
        body = devices
          .map((d) => {
            const head = single ? "" : `<div class="device">${mvEsc(d.name)}</div>`;
            const rows = d.manuals.length
              ? d.manuals
                  .map(
                    (m) => `
                <div class="row ${m.missing ? "missing" : ""}">
                  <button class="open" data-manual="${mvEsc(m.id)}" ${m.missing ? "disabled" : ""}>
                    ${mvIcon(MV_BOOK)}<span class="label">${mvEsc(m.title)}</span>
                    ${m.missing ? `<span class="badge">${mvEsc(t.missing)}</span>` : ""}
                  </button>
                  <button class="dl" data-manual="${mvEsc(m.id)}" data-file="${mvEsc(m.file)}" data-download="1" title="${mvEsc(t.download)}" ${m.missing ? "disabled" : ""}>${mvIcon(MV_DOWNLOAD)}</button>
                </div>`
                  )
                  .join("")
              : `<div class="row empty"><span class="muted">${mvEsc(t.none)}</span>${
                  this._hass?.user?.is_admin
                    ? `<a class="add" href="/manual-vault?device=${encodeURIComponent(d.id)}">${mvEsc(t.add)}${mvIcon(MV_ARROW)}</a>`
                    : ""
                }</div>`;
            return `<div class="group">${head}${rows}</div>`;
          })
          .join("");
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 12px 16px 16px; height: 100%; box-sizing: border-box; }
        .title { font-size: 16px; font-weight: 500; margin-bottom: 8px; color: var(--primary-text-color); }
        .group + .group { margin-top: 10px; }
        .device { font-size: 13px; color: var(--secondary-text-color); margin: 2px 0 4px; }
        .row { display: flex; align-items: center; gap: 4px; }
        .row + .row { margin-top: 4px; }
        button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
        .open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; text-align: left; background: var(--secondary-background-color); color: var(--primary-text-color); }
        .open:hover:not(:disabled) { filter: brightness(0.95); }
        .open svg { color: var(--primary-color); }
        .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dl { display: inline-flex; padding: 8px; border-radius: 50%; color: var(--secondary-text-color); }
        .dl:hover:not(:disabled) { background: var(--secondary-background-color); }
        button:disabled { opacity: .5; cursor: default; }
        svg { width: 20px; height: 20px; fill: currentColor; flex: none; }
        .badge { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: var(--error-color, #db4437); color: #fff; }
        .muted { color: var(--secondary-text-color); font-size: 14px; }
        .muted.error { color: var(--error-color, #db4437); }
        .empty { justify-content: space-between; padding: 4px 0; }
        .add { display: inline-flex; align-items: center; gap: 2px; color: var(--primary-color); text-decoration: none; font-size: 14px; }
        .add svg { width: 18px; height: 18px; }
      </style>
      <ha-card>
        <div class="title">${mvEsc(this._title())}</div>
        ${body}
      </ha-card>`;

    this.shadowRoot.querySelectorAll("button[data-manual]").forEach((btn) =>
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._open(btn.dataset.manual, btn.dataset.download === "1", btn.dataset.file);
      })
    );
    this.shadowRoot.querySelectorAll("a.add").forEach((a) =>
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        history.pushState(null, "", a.getAttribute("href"));
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      })
    );
  }

  async _open(manualId, download, file) {
    const win = download ? null : window.open("", "_blank");
    try {
      let path = `/api/manual_vault/file/${manualId}`;
      if (download) path += "?download=1";
      const signed = await this._hass.callWS({ type: "auth/sign_path", path, expires: 300 });
      const url = this._hass.hassUrl ? this._hass.hassUrl(signed.path) : signed.path;
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file || "manual.pdf";
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
      this._error = err?.message || "error";
      this._render();
    }
  }
}

class ManualVaultCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    const t = mvLang(this._hass);
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => t[schema.name === "title" ? "card_title" : schema.name] || schema.name;
      this._form.addEventListener("value-changed", (ev) => {
        const value = { ...ev.detail.value };
        // device and area are alternatives: keep the one that just changed
        if (value.device_id && value.area_id) {
          if (value.device_id !== this._config.device_id) delete value.area_id;
          else delete value.device_id;
        }
        for (const key of Object.keys(value)) {
          if (value[key] === "" || value[key] === undefined || value[key] === null) delete value[key];
        }
        this._config = value;
        this._form.data = value;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: "device_id", selector: { device: {} } },
      { name: "area_id", selector: { area: {} } },
      { name: "title", selector: { text: {} } },
      { name: "show_empty", selector: { boolean: {} } },
    ];
    this._form.data = { show_empty: true, ...this._config };
  }
}

if (!customElements.get("manual-vault-card")) {
  customElements.define("manual-vault-card", ManualVaultCard);
}
if (!customElements.get("manual-vault-card-editor")) {
  customElements.define("manual-vault-card-editor", ManualVaultCardEditor);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "manual-vault-card")) {
  const t = mvLang(document.querySelector("home-assistant")?.hass);
  window.customCards.push({
    type: "manual-vault-card",
    name: t.name,
    description: t.description,
    preview: false,
    documentationURL: "https://github.com/ghostsand/manual-vault",
  });
}
