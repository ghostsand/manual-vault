const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("assert");

const SRC = fs.readFileSync(process.argv[2], "utf8");

function makeEnv(lang = "en", admin = true, url = "http://ha/manual-vault") {
  const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true, url });
  const w = dom.window;
  const opened = [];
  w.open = () => ({ close() {}, location: { set href(v) { opened.push(v); } } });
  w.eval(SRC);
  const calls = [];
  const library = {
    is_admin: admin,
    max_size: 50 * 1048576,
    backup_running: false,
    manuals: [
      { id: "m1", file: "moes.pdf", title: "Moes switch", tags: [{ manufacturer: "Moes", model: "ZBM5-1C" }], devices: [], size: 200000, missing: false },
      { id: "m2", file: "lost.pdf", title: "Lost <b>one</b>", tags: [], devices: [], size: 0, missing: true },
    ],
    devices: [
      { id: "d1", name: "Kitchen", manufacturer: "Moes", model: "ZBM5-1C", model_id: "", integration: "zha", area: "Kitchen", manuals: ["m1"], match: "model" },
      { id: "d2", name: "Thermo", manufacturer: "_TZE200", model: "TS0601", model_id: "", integration: "mqtt", area: "", manuals: [], match: null },
      { id: "d3", name: "Odd", manufacturer: "", model: "", model_id: "", integration: "esphome", area: "", manuals: [], match: null },
      { id: "p1", name: "Phone", manufacturer: "Google", model: "Pixel 9", model_id: "", integration: "mobile_app", area: "", manuals: [], match: null, hidden: "integration" },
      { id: "h1", name: "Hidden switch", manufacturer: "Moes", model: "ZBM5-1C", model_id: "", integration: "zha", area: "", manuals: ["m1"], match: "model", hidden: "device" },
    ],
  };
  const hass = {
    language: lang,
    locale: { language: lang },
    hassUrl: (p) => "http://ha" + p,
    auth: { expired: false, accessToken: "tok" },
    callWS: async (msg) => {
      calls.push(msg);
      if (msg.type === "manual_vault/library") return JSON.parse(JSON.stringify(library));
      if (msg.type === "auth/sign_path") return { path: msg.path + (msg.path.includes("?") ? "&" : "?") + "authSig=x" };
      return {};
    },
  };
  const el = w.document.createElement("manual-vault-panel");
  w.document.body.appendChild(el);
  el.narrow = true;
  el.hass = hass;
  return { w, el, calls, opened, root: el.shadowRoot };
}

const tick = () => new Promise((r) => setTimeout(r, 10));
const click = (root, sel) => {
  const node = root.querySelector(sel);
  assert(node, "missing " + sel);
  node.dispatchEvent(new node.ownerDocument.defaultView.MouseEvent("click", { bubbles: true, composed: true }));
};
const change = (root, sel, value) => {
  const node = root.querySelector(sel);
  assert(node, "missing " + sel);
  node.value = value;
  node.dispatchEvent(new node.ownerDocument.defaultView.Event("change", { bubbles: true }));
};

(async () => {
  // ---- admin, English
  let { el, root, calls, opened } = makeEnv();
  await tick();
  assert(root.querySelector(".tab.active").textContent.startsWith("Devices (3)"));
  const groups = root.querySelectorAll(".card.group");
  assert.strictEqual(groups.length, 3);
  assert(!root.querySelector('[data-action="upload"]').hidden, "admin sees upload");
  assert(root.querySelector(".readonly").hidden);

  // filter missing -> 2 groups
  click(root, '[data-filter="missing"]');
  assert.strictEqual(root.querySelectorAll(".card.group").length, 2);
  click(root, '[data-filter="all"]');

  // search
  const search = root.querySelector(".search");
  search.value = "ts0601";
  search.dispatchEvent(new el.ownerDocument.defaultView.Event("input"));
  assert.strictEqual(root.querySelectorAll(".card.group").length, 1);
  search.value = "";
  search.dispatchEvent(new el.ownerDocument.defaultView.Event("input"));

  // expand Moes group
  click(root, '.group-head[data-group="moes|zbm5-1c"]');
  assert.strictEqual(root.querySelectorAll(".device").length, 1);

  // upload for TS0601 model: dialog with prefilled tag
  click(root, '[data-action="upload-model"][data-group="_tze200|ts0601"]');
  assert(root.querySelector(".dialog"));
  assert(root.querySelector(".dialog .tag.removable").textContent.includes("_TZE200 TS0601"));
  // add a known model, title preserved across re-render
  root.querySelector('.dialog input[name="title"]').value = "My title";
  const opt = [...root.querySelectorAll('select[name="add-model"] option')].find((o) => o.textContent === "Moes ZBM5-1C");
  assert(!root.querySelector('select[name="add-model"] option[value]') || ![...root.querySelectorAll('select[name="add-model"] option')].some((o) => o.textContent === "_TZE200 TS0601"), "existing tag hidden from picker");
  change(root, 'select[name="add-model"]', opt.value);
  assert.strictEqual(root.querySelectorAll(".dialog .tag.removable").length, 2);
  assert.strictEqual(root.querySelector('.dialog input[name="title"]').value, "My title");
  // custom model
  change(root, 'select[name="add-model"]', "__custom");
  root.querySelector('input[name="custom-model"]').value = "X1";
  click(root, '[data-action="dlg-add-custom"]');
  assert.strictEqual(root.querySelectorAll(".dialog .tag.removable").length, 3);
  // remove one
  click(root, '[data-action="dlg-remove-tag"][data-index="2"]');
  assert.strictEqual(root.querySelectorAll(".dialog .tag.removable").length, 2);
  // device editor
  click(root, '[data-action="dlg-show-devices"]');
  change(root, 'select[name="add-device"]', "d2");
  assert(root.querySelector('[data-action="dlg-remove-device"][data-device="d2"]'));
  // upload without file -> error shown
  click(root, '[data-action="dlg-upload"]');
  assert(!root.querySelector(".dialog-error").hidden);
  click(root, '[data-action="dlg-cancel"]');
  assert(!root.querySelector(".dialog"));

  // group without model: no link-existing button
  assert(!root.querySelector('[data-action="link-model"][data-group="|"]'));
  assert(root.querySelector('[data-action="upload-model"][data-group="|"]'));

  // link existing to TS0601 group -> update adds tag
  click(root, '[data-action="link-model"][data-group="_tze200|ts0601"]');
  click(root, '[data-action="dlg-pick"][data-manual="m1"]');
  await tick();
  const upd = calls.find((c) => c.type === "manual_vault/update");
  assert.strictEqual(JSON.stringify(upd.tags), JSON.stringify([
    { manufacturer: "Moes", model: "ZBM5-1C" },
    { manufacturer: "_TZE200", model: "TS0601" },
  ]));
  assert(!root.querySelector(".dialog"));
  assert(!root.querySelector(".toast").hidden);

  // link to a device
  click(root, '.group-head[data-group="moes|zbm5-1c"]');
  if (!root.querySelector('[data-action="link-device"]')) click(root, '.group-head[data-group="moes|zbm5-1c"]');
  click(root, '[data-action="link-device"][data-device="d1"]');
  click(root, '[data-action="dlg-pick"][data-manual="m2"]');
  await tick();
  const upd2 = calls.filter((c) => c.type === "manual_vault/update").pop();
  assert.strictEqual(JSON.stringify(upd2), JSON.stringify({ type: "manual_vault/update", manual_id: "m2", devices: ["d1"] }));

  // manuals tab
  click(root, '[data-tab="manuals"]');
  assert.strictEqual(root.querySelectorAll(".card.manual").length, 2);
  assert(root.querySelector(".card.manual.missing").innerHTML.includes("Lost &lt;b&gt;one&lt;/b&gt;"), "escaped");
  assert(!root.querySelector(".card.manual.missing b b"), "no injected markup");
  assert(root.querySelector('.card.manual.missing [data-action="open"]').disabled);
  click(root, '[data-filter="untagged"]');
  assert.strictEqual(root.querySelectorAll(".card.manual").length, 1);
  click(root, '[data-filter="all"]');

  // edit
  click(root, '[data-action="edit"][data-manual="m1"]');
  root.querySelector('.dialog input[name="title"]').value = "Renamed";
  click(root, '[data-action="dlg-remove-tag"][data-index="0"]');
  assert.strictEqual(root.querySelector('.dialog input[name="title"]').value, "Renamed");
  click(root, '[data-action="dlg-save"]');
  await tick();
  const upd3 = calls.filter((c) => c.type === "manual_vault/update").pop();
  assert.strictEqual(JSON.stringify(upd3), JSON.stringify({ type: "manual_vault/update", manual_id: "m1", title: "Renamed", tags: [], devices: [] }));

  // replace dialog has no title/tag fields
  click(root, '[data-action="replace"][data-manual="m2"]');
  assert(root.querySelector('.dialog input[name="file"]'));
  assert(!root.querySelector('.dialog input[name="title"]'));
  click(root, '[data-action="dlg-cancel"]');

  // delete
  click(root, '[data-action="delete"][data-manual="m2"]');
  click(root, '[data-action="dlg-delete"]');
  await tick();
  assert(calls.some((c) => c.type === "manual_vault/delete" && c.manual_id === "m2"));

  // open file -> signed path in new window
  click(root, '[data-action="open"][data-manual="m1"]');
  await tick();
  assert.strictEqual(JSON.stringify(opened), JSON.stringify(["http://ha/api/manual_vault/file/m1?authSig=x"]));

  // menu event
  let toggled = false;
  el.addEventListener("hass-toggle-menu", () => (toggled = true));
  click(root, '[data-action="menu"]');
  assert(toggled);

  // ---- read-only, Dutch
  ({ root } = makeEnv("nl", false));
  await tick();
  assert(root.querySelector(".tab.active").textContent.startsWith("Apparaten (3)"));
  assert(root.querySelector('[data-action="upload"]').hidden);
  assert(!root.querySelector(".readonly").hidden);
  assert(!root.querySelector('[data-action="upload-model"]'));
  click(root, '[data-tab="manuals"]');
  assert(!root.querySelector('[data-action="edit"]'));
  assert(root.querySelector('[data-action="open"]'));

  // ---- hiding (admin)
  ({ el, root, calls } = makeEnv());
  await tick();
  // hidden devices are not in the normal list or counts
  assert(root.querySelector(".tab.active").textContent.startsWith("Devices (3)"));
  assert(root.querySelector('[data-filter="hidden"]').textContent.includes("(2)"));
  // eye on a group opens hide dialog with model + integration options
  click(root, '[data-action="hide-menu"][data-group="_tze200|ts0601"]');
  assert(root.querySelector(".dialog"), "hide dialog open");
  assert(root.querySelector('[data-action="dlg-hide-integration"][data-integration="mqtt"]'));
  click(root, '[data-action="dlg-hide-model"]');
  await tick();
  let hide = calls.filter((c) => c.type === "manual_vault/hide").pop();
  assert.strictEqual(JSON.stringify(hide), JSON.stringify({ type: "manual_vault/hide", hidden: true, kind: "model", manufacturer: "_TZE200", model: "TS0601" }));
  // hide one device from the expanded list
  click(root, '.group-head[data-group="moes|zbm5-1c"]');
  click(root, '[data-action="hide-device"][data-device="d1"]');
  await tick();
  hide = calls.filter((c) => c.type === "manual_vault/hide").pop();
  assert.strictEqual(JSON.stringify(hide), JSON.stringify({ type: "manual_vault/hide", hidden: true, kind: "device", device_id: "d1" }));
  // hidden view with reasons + unhide
  click(root, '[data-filter="hidden"]');
  assert.strictEqual(root.querySelectorAll(".hidden-group").length, 2);
  assert(root.querySelector('[data-device-row="p1"]').textContent.includes("mobile_app"));
  click(root, '[data-action="unhide"][data-device="p1"]');
  await tick();
  hide = calls.filter((c) => c.type === "manual_vault/hide").pop();
  assert.strictEqual(JSON.stringify(hide), JSON.stringify({ type: "manual_vault/hide", hidden: false, kind: "integration", integration: "mobile_app" }));
  click(root, '[data-action="unhide"][data-device="h1"]');
  await tick();
  hide = calls.filter((c) => c.type === "manual_vault/hide").pop();
  assert.strictEqual(JSON.stringify(hide), JSON.stringify({ type: "manual_vault/hide", hidden: false, kind: "device", device_id: "h1" }));

  // ---- deep link to a visible and to a hidden device
  ({ root } = makeEnv("en", true, "http://ha/manual-vault?device=d2"));
  await tick();
  const row = root.querySelector('[data-device-row="d2"]');
  assert(row && row.classList.contains("highlight"), "deep-linked device expanded + highlighted");
  ({ root } = makeEnv("en", true, "http://ha/manual-vault?device=h1"));
  await tick();
  assert(root.querySelector('[data-filter="hidden"]').classList.contains("active"));
  assert(root.querySelector('[data-device-row="h1"]').classList.contains("highlight"));

  // read-only: no eye buttons
  ({ root } = makeEnv("en", false));
  await tick();
  assert(!root.querySelector('[data-action="hide-menu"]'));

  console.log("PANEL TESTS PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
