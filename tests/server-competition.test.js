const assert = require("node:assert/strict");
const {
  divisionName,
  normalizeHandle,
  performanceBand,
  publicLeagueMember,
  validateHandle,
  weekWindow
} = require("../functions/competition");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("server handle claims use the same stable public format", () => {
  assert.equal(normalizeHandle(" @Nova-Pilot "), "nova_pilot");
  assert.equal(validateHandle("@nova_pilot").ok, true);
  assert.equal(validateHandle("@admin").reason, "reserved");
  assert.equal(validateHandle("22pilot").reason, "invalid_format");
});

test("weekly windows begin on Monday UTC", () => {
  const window = weekWindow(Date.UTC(2026, 6, 21, 12));
  assert.equal(window.id, "week_2026_07_20");
  assert.equal(window.endMs - window.startMs, 7 * 24 * 60 * 60 * 1000);
});

test("performance bands create understandable divisions", () => {
  assert.equal(divisionName(performanceBand(0)), "ROOKIE");
  assert.equal(divisionName(performanceBand(75000)), "GOLD");
  assert.equal(divisionName(performanceBand(999999)), "NOVA");
});

test("league member payloads expose only public game identity", () => {
  const member = publicLeagueMember({ uid: "u1", callSign: "Nova 7", handle: "Nova-Pilot", weeklyPoints: 42, email: "private@example.test" });
  assert.deepEqual(member, { uid: "u1", callSign: "NOVA7", handle: "nova_pilot", weeklyPoints: 42 });
  assert.equal("email" in member, false);
});
