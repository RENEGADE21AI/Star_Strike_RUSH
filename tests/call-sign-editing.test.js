const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const saved = new Map();
const canvas = { getContext: () => ({}), addEventListener() {} };
const input = { value: "", addEventListener() {}, focus() {}, blur() {} };
const context = {
  console,
  Math,
  Date,
  JSON,
  Number,
  String,
  Set,
  localStorage: {
    getItem: (key) => saved.has(key) ? saved.get(key) : null,
    setItem: (key, value) => saved.set(key, String(value)),
    removeItem: (key) => saved.delete(key)
  },
  document: { getElementById: (id) => id === "game" ? canvas : input },
  window: { addEventListener() {}, location: { search: "" } }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", "00-identity.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", "01-core.js"), "utf8"), context);

vm.runInContext("callSignDraft = 'nova-7'; commitCallSignDraft();", context);
assert.equal(saved.get("star_strike_rush_callsign_v1"), "NOVA_7");
assert.equal(vm.runInContext("callSign", context), "NOVA_7");

vm.runInContext("callSignDraft = 'x'; commitCallSignDraft();", context);
assert.equal(saved.get("star_strike_rush_callsign_v1"), "NOVA_7");
assert.equal(vm.runInContext("callSignEditing", context), true);
console.log("PASS explicit call-sign editor persists valid values and rejects short values");
