const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function api() {
  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../src/00-trusted-run.js"), "utf8"), context);
  return context.globalThis;
}

test("client run ledger keeps ordered canonical events and excludes any client score", () => {
  const client = api();
  const ledger = client.createTrustedRunLedger();
  client.appendTrustedRunEvent(ledger, 20, "kill", { kind: "red", entityId: "enemy_1" });
  client.appendTrustedRunEvent(ledger, 21, "ghost", {});
  const evidence = client.trustedRunEvidence(ledger, { id: "s1", challenge: "c1" });
  assert.deepEqual(JSON.parse(JSON.stringify(evidence)), {
    sessionId: "s1",
    challenge: "c1",
    events: [
      { seq: 1, tick: 20, type: "kill", kind: "red", entityId: "enemy_1" },
      { seq: 2, tick: 21, type: "ghost" }
    ]
  });
  assert.equal("score" in evidence, false);
});

test("client run ledger refuses malformed and duplicate scoring events", () => {
  const client = api();
  const ledger = client.createTrustedRunLedger();
  assert.equal(client.appendTrustedRunEvent(ledger, 10, "kill", { kind: "red", entityId: "same" }), true);
  assert.equal(client.appendTrustedRunEvent(ledger, 11, "kill", { kind: "red", entityId: "same" }), false);
  assert.equal(client.appendTrustedRunEvent(ledger, 9, "ghost", {}), false);
});

