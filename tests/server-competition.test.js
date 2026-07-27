const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  competitionActivationState,
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
  const member = publicLeagueMember({ uid: "u1", publicPilotId: "pilot_0123456789abcdefabcd", callSign: "Nova 7", handle: "Nova-Pilot", weeklyPoints: 42, email: "private@example.test" });
  assert.deepEqual(member, { publicPilotId: "pilot_0123456789abcdefabcd", callSign: "NOVA7", handle: "nova_pilot", weeklyPoints: 42 });
  assert.equal("email" in member, false);
  assert.equal("uid" in member, false);
});

test("future leagues require progression writes, competition writes, and verified run sessions", () => {
  for (const progressionWritesEnabled of [false, true]) {
    for (const competitionWritesEnabled of [false, true]) {
      for (const verifiedRunSessionsEnabled of [false, true]) {
        const active = competitionActivationState({
          progressionWritesEnabled,
          competitionWritesEnabled,
          verifiedRunSessionsEnabled
        });
        assert.equal(
          active,
          progressionWritesEnabled && competitionWritesEnabled && verifiedRunSessionsEnabled
        );
      }
    }
  }
  const indexSource = fs.readFileSync(path.resolve(__dirname, "../functions/index.js"), "utf8");
  assert.match(indexSource, /performanceBand\(publicData\.verifiedBestScore\)/);
  assert.doesNotMatch(indexSource, /performanceBand\(publicData\.(?:bestScore|legacyBestScore)\)/);
  assert.match(indexSource, /recordTrust\s*!==\s*"verified_run_session"/);
});
