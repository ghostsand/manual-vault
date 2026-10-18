const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("assert");
const SRC = fs.readFileSync(process.argv[2], "utf8");
const tick = () => new Promise((r) => setTimeout(r, 10));

function env(lang = "en", admin = true) {
  const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://ha/lovelace/0" });
  const w = dom.window;
  const opened = [];
  w.open = () => ({ close() {}, location: { set href(v) { opened.push(v); } } });
  w.eval(SRC);
  const calls = [];
  const hass = {
    language: lang,
    locale: { language: lang },
    user: { is_admin: admin },
    devices: { d1: { name: "Kitchen switch" } },
    areas: { kitchen: { name: "Kitchen" } },
    hassUrl: (p) => "http://ha" + p,
    callWS: async (msg) => {
      calls.push(msg);
      if (msg.type === "auth/sign_path") return { path: msg.path + "?authSig=x" };
      if (msg.device_id === "d1")
        return { devices: [{ id: "d1", name: "Kitchen switch", manuals: [{ id: "m1", title: "Moes <switch>", file: "moes.pdf", missing: false }, { id: "m2", title: "Gone", file: "g.pdf", missing: true }] }] };
      if (msg.device_id === "d2") return { devices: [{ id: "d2", name: "Thermo", manuals: [] }] };
      if (msg.area_id === "kitchen")
        return { devices: [{ id: "d1", name: "Kitchen switch", manuals: [{ id: "m1", title: "Moes", file: "moes.pdf", missing: false }] }, { id: "d2", name: "Thermo", manuals: [] }] };
      return { devices: [] };
    },
  };
  return { w, hass, calls, opened };
}

(async () => {
  let { w, hass, calls, opened } = env();
  assert(w.customCards.some((c) => c.type === "manual-vault-card"));
  const Card = w.customElements.get("manual-vault-card");
  assert(Card && w.customElements.get("manual-vault-card-editor"));
  assert.strictEqual(JSON.stringify(Card.getStubConfig(hass)), "{}");

  // no target -> hint
  let card = w.document.createElement("manual-vault-card");
  w.document.body.appendChild(card);
  card.setConfig({});
  card.hass = hass;
  await tick();
  assert(card.shadowRoot.textContent.includes("Choose a device or an area"));

  // device card
  card = w.document.createElement("manual-vault-card");
  w.document.body.appendChild(card);
  card.setConfig({ device_id: "d1" });
  card.hass = hass;
  await tick();
  const root = card.shadowRoot;
  assert(root.querySelector(".title").textContent.includes("Kitchen switch"));
  assert(root.innerHTML.includes("Moes &lt;switch&gt;"), "escaped");
  const buttons = root.querySelectorAll("button.open");
  assert.strictEqual(buttons.length, 2);
  assert(buttons[1].disabled, "missing file disabled");
  buttons[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  await tick();
  assert.strictEqual(opened[0], "http://ha/api/manual_vault/file/m1?authSig=x");
  assert(calls.some((c) => c.type === "manual_vault/card" && c.device_id === "d1"));

  // device without manual: admin gets deep link to the panel
  card = w.document.createElement("manual-vault-card");
  w.document.body.appendChild(card);
  card.setConfig({ device_id: "d2" });
  card.hass = hass;
  await tick();
  const add = card.shadowRoot.querySelector("a.add");
  assert(add && add.getAttribute("href") === "/manual-vault?device=d2");
  let navigated = false;
  w.addEventListener("location-changed", () => (navigated = true));
  add.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert(navigated && w.location.pathname === "/manual-vault" && w.location.search === "?device=d2");

  // area card, hide empty devices, Dutch
  ({ w, hass } = env("nl", false));
  card = w.document.createElement("manual-vault-card");
  w.document.body.appendChild(card);
  card.setConfig({ area_id: "kitchen", show_empty: false });
  card.hass = hass;
  await tick();
  assert(card.shadowRoot.querySelector(".title").textContent.includes("Handleidingen · Kitchen"));
  assert.strictEqual(card.shadowRoot.querySelectorAll(".group").length, 1);
  // show empty: Thermo shown without add link (not admin)
  card.setConfig({ area_id: "kitchen" });
  await tick();
  assert.strictEqual(card.shadowRoot.querySelectorAll(".group").length, 2);
  assert(!card.shadowRoot.querySelector("a.add"));
  assert(card.shadowRoot.textContent.includes("Nog geen handleiding"));

  // editor: device and area are mutually exclusive
  const editor = w.document.createElement("manual-vault-card-editor");
  editor.setConfig({ area_id: "kitchen" });
  editor.hass = hass;
  const form = editor.querySelector("ha-form");
  assert(form && form.schema.length === 4);
  let config;
  editor.addEventListener("config-changed", (e) => (config = e.detail.config));
  form.dispatchEvent(new w.CustomEvent("value-changed", { detail: { value: { area_id: "kitchen", device_id: "d1", title: "" } } }));
  assert.strictEqual(JSON.stringify(config), JSON.stringify({ device_id: "d1" }));

  console.log("CARD TESTS PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
