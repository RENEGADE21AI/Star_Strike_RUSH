import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const admin = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../functions/node_modules/firebase-admin"));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "star-strike-rush";
const functionsBase = `http://127.0.0.1:5101/${projectId}/us-central1`;
const authBase = "http://127.0.0.1:9199";
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"], [".png", "image/png"], [".svg", "image/svg+xml"], [".webp", "image/webp"]
]);

let server;
let baseUrl;
let browser;
let db;

function localMetaSeed() {
  return {
    schemaVersion: 3,
    totalGlory: 4321,
    lifetime: {
      runs: 12, score: 98765, kills: 444, powerups: 33, ghostUses: 22,
      bosses: 11, damageTaken: 55, highestCombo: 19, bestScore: 32100, bestPhase: 17
    },
    recentReceipts: [{ receiptId: "device_receipt", score: 32100, gloryGained: 3210 }],
    lastUpdatedAtMs: 1720000000000
  };
}

async function createEmulatorAccount(name) {
  const email = `${name}@star-strike.test`;
  const response = await fetch(`${authBase}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-star-strike-rush`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "StarStrike-Test-Only-2026", returnSecureToken: true })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Auth emulator account creation failed: ${JSON.stringify(body)}`);
  return { uid: body.localId, email, idToken: body.idToken };
}

async function seedAccount(account, options = {}) {
  await Promise.all([
    db.doc(`players_private/${account.uid}`).set({
      totalGlory: options.glory ?? 999999,
      lifetimeRuns: options.runs ?? 8,
      lifetimeScore: options.score ?? 777777,
      lifetimeKills: 666,
      lifetimePowerups: 55,
      lifetimeGhostUses: 44,
      lifetimeBosses: 33,
      lifetimeDamageTaken: 22,
      highestCombo: 11,
      bestScore: options.accountBest ?? 555555,
      phase: options.accountPhase ?? 88
    }),
    db.doc(`players_public/${account.uid}`).set({
      uid: account.uid,
      callSign: options.callSign || "ARCHIVE_A",
      bestScore: options.publicBest ?? 555555,
      phase: options.publicPhase ?? 88,
      glory: 1234,
      gloryRank: "Ace",
      gloryRankIndex: 4,
      seasonTier: 12,
      achievementsCount: 1,
      verifiedBestScore: 0,
      verifiedPhase: 1
    }),
    db.doc(`leaderboard_scores/${account.uid}`).set({
      uid: account.uid,
      callSign: options.callSign || "ARCHIVE_A",
      bestScore: options.leaderboardBest ?? 999999,
      phase: options.leaderboardPhase ?? 99,
      achievementsCount: 2
    }),
    db.doc(`player_achievement_state/${account.uid}`).set({ ids: ["first_sortie", "mythic_score"], count: 2, schemaVersion: 2 })
  ]);
}

async function debugSnapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

async function waitForOnlineState(page, predicateSource, argument, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await page.evaluate(() => window.starStrikeOnline?.getState() || null);
    if (latest && predicateSource(latest, argument)) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for Firebase client state: ${JSON.stringify(latest)}`);
}

async function callableError(name, data = {}, idToken = "") {
  const response = await fetch(`${functionsBase}/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify({ data })
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8180");
  if (!admin.apps.length) admin.initializeApp({ projectId });
  db = admin.firestore();
  server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    const relative = requestUrl.pathname === "/" ? "index.html" : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const resolved = path.resolve(repoRoot, relative);
    if (!resolved.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "cache-control": "no-store", "content-type": mimeTypes.get(path.extname(resolved).toLowerCase()) || "application/octet-stream" });
    fs.createReadStream(resolved).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (admin.apps.length) await Promise.all(admin.apps.map((app) => app.delete()));
});

test("real Firebase client replaces rather than merges progression while competition remains fail-closed", { timeout: 360_000 }, async () => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`.slice(-12);
  const accountAName = `a-${suffix}`;
  const accountBName = `b-${suffix}`;
  const [accountA, accountB] = await Promise.all([createEmulatorAccount(accountAName), createEmulatorAccount(accountBName)]);
  await Promise.all([
    seedAccount(accountA, { callSign: "ARCHIVE_A", glory: 1000 }),
    seedAccount(accountB, { callSign: "ARCHIVE_B", glory: 1200, accountBest: 900 })
  ]);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((seed) => {
    localStorage.setItem("star_strike_rush_meta_v1", JSON.stringify(seed));
    localStorage.setItem("star_strike_rush_high_score_v1", "32100");
    localStorage.setItem("star_strike_rush_callsign_v1", "GUEST_ONLY");
    localStorage.setItem("star_strike_rush_achievements_v1", JSON.stringify(["first_sortie"]));
    localStorage.setItem("star_strike_rush_codex_v1", JSON.stringify({ red: true }));
  }, localMetaSeed());
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(`${baseUrl}/?debug=1&firebaseEmulators=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.starStrikeOnline?.getState().ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90000 });

  const deviceBefore = await debugSnapshot(page);
  assert.equal(deviceBefore.deviceProgress.totalGlory, 4321);
  assert.equal("credits" in deviceBefore.deviceProgress, false);

  await page.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountAName);
  await waitForOnlineState(page, (state, uid) => state.user?.uid === uid && state.accountArchive === "loaded", accountA.uid);
  await page.waitForFunction(() => {
    const state = window.starStrikeOnline.getState();
    return state.developmentCounters.progressionResolutions >= 1 && state.progressionResolution === null;
  });
  let online = await page.evaluate(() => window.starStrikeOnline.getState());
  assert.equal(online.progressionResolution, null);
  assert.equal((await debugSnapshot(page)).deviceProgress.totalGlory, 4321, "automatic comparison did not retain the stronger device save");
  assert.equal(online.onlineArchiveMeta.totalGlory, 4321, "stronger device save was not assigned to the account");
  assert.equal(online.progressionMode, "automatic_best_account_or_device");
  assert.equal(online.competitionMode, "paused");
  assert.equal(online.backendRelease.progressionAuthority, "automatic_best_account_or_device");
  assert.equal(typeof await page.evaluate(() => window.starStrikeOnline.chooseProgression), "undefined", "manual progression choice remained exposed");
  assert.notEqual((await debugSnapshot(page)).deviceProgress.totalGlory, 5321, "progression was combined");

  const cleaned = await db.doc(`players_public/${accountA.uid}`).get().then((snapshot) => snapshot.data());
  assert.equal(cleaned.legacyBestScore, 999999);
  assert.equal(cleaned.legacyPhase, 99);
  assert.equal(cleaned.verifiedBestScore, 0);
  for (const field of ["uid", "bestScore", "phase", "glory", "gloryRank", "gloryRankIndex", "seasonTier", "achievementsCount"]) {
    assert.equal(field in cleaned, false, `obsolete public field remained: ${field}`);
  }

  const published = await page.evaluate(() => window.starStrikeOnline.updateCallSign("ACCOUNT_A"));
  assert.equal(published.published, true);
  assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_callsign_v1")), "GUEST_ONLY");

  const handleOne = `p${suffix}`.slice(0, 16);
  const handleTwo = `q${suffix}`.slice(0, 16);
  assert.deepEqual(await page.evaluate((value) => window.starStrikeOnline.claimHandle(value), handleOne), { ok: true, handle: handleOne });
  assert.deepEqual(await page.evaluate((value) => window.starStrikeOnline.claimHandle(value), handleTwo), { ok: true, handle: handleTwo });
  assert.equal((await db.doc(`handle_registry/${handleOne}`).get()).exists, false, "old handle stayed reserved after change");
  assert.equal((await db.doc(`handle_registry/${handleTwo}`).get()).data().uid, accountA.uid);

  const leagueJoin = await page.evaluate(() => window.starStrikeOnline.joinWeeklyLeague());
  assert.equal(leagueJoin.ok, false);
  assert.equal(leagueJoin.reason, "competition_paused");
  assert.equal((await page.evaluate(() => window.starStrikeOnline.getState().weeklyLeagues)).length, 0);
  assert.deepEqual(await page.evaluate(() => window.starStrikeOnline.startVerifiedRun()), { ok: false, reason: "competition_paused" });
  assert.equal((await page.evaluate(() => window.starStrikeOnline.submitRun({ evidence: { sessionId: "forged", challenge: "forged", events: [] } }))).ok, false);
  assert.equal((await db.doc(`world_records/${accountA.uid}`).get()).exists, false);

  const deletion = await page.evaluate(() => window.starStrikeOnline.requestAccountDeletion());
  assert.equal(deletion.status, "pending");
  assert.equal(deletion.deletesAfterMs - deletion.requestedAtMs, 72 * 60 * 60 * 1000);
  await page.evaluate(() => window.starStrikeOnline.cancelAccountDeletion());
  assert.equal((await db.doc(`account_deletion_requests/${accountA.uid}`).get()).exists, false);

  await page.evaluate(() => window.starStrikeOnline.signOut());
  await page.waitForFunction(() => window.starStrikeOnline.getState().user === null);
  assert.equal((await debugSnapshot(page)).deviceProgress.totalGlory, 0, "sign-out retained account progression locally");
  assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_callsign_v1")), "GUEST_ONLY");

  await page.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountBName);
  await waitForOnlineState(page, (state, uid) => state.user?.uid === uid && state.accountArchive === "loaded", accountB.uid);
  await page.waitForFunction(() => window.starStrikeOnline.getState().progressionResolution === null && window.starStrikeOnline.getState().developmentCounters.progressionResolutions >= 2);
  assert.equal((await debugSnapshot(page)).deviceProgress.totalGlory, 1200);
  assert.deepEqual(await page.evaluate((value) => window.starStrikeOnline.claimHandle(value), handleOne), { ok: true, handle: handleOne });
  await assert.rejects(page.evaluate((value) => window.starStrikeOnline.claimHandle(value), handleTwo), /already claimed/i);
  assert.notEqual(await page.evaluate(() => window.starStrikeOnline.getState().profileCallSign), "ACCOUNT_A");

  await page.evaluate(() => window.starStrikeOnline.signOut());
  await page.waitForFunction(() => window.starStrikeOnline.getState().user === null);
  assert.equal((await debugSnapshot(page)).deviceProgress.totalGlory, 0);
  await page.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountAName);
  await waitForOnlineState(page, (state, uid) => state.user?.uid === uid && state.accountArchive === "loaded", accountA.uid);
  assert.equal((await debugSnapshot(page)).deviceProgress.totalGlory, 4321, "account progression did not return exactly");
  assert.equal(await page.evaluate(() => window.starStrikeOnline.getState().profileHandle), handleTwo);

  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await secondContext.addInitScript((uid) => {
    localStorage.setItem(`star_strike_rush_account_identity_v1:${uid}`, JSON.stringify({
      uid, desiredCallSign: "STALE_A", publishedCallSign: "STALE_A", pending: false, status: "published", updatedAtMs: 1
    }));
  }, accountA.uid);
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${baseUrl}/?debug=1&firebaseEmulators=1`, { waitUntil: "domcontentloaded" });
  await secondPage.waitForFunction(() => window.starStrikeOnline?.getState().ready === true, null, { timeout: 90000 });
  await secondPage.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountAName);
  await waitForOnlineState(secondPage, (state, uid) => state.user?.uid === uid && state.accountArchive === "loaded", accountA.uid);
  assert.equal(await secondPage.evaluate(() => window.starStrikeOnline.getState().profileCallSign), "ACCOUNT_A");
  assert.equal(await secondPage.evaluate((uid) => window.readAccountIdentityState(localStorage, uid).publishedCallSign, accountA.uid), "ACCOUNT_A");
  await secondContext.close();

  const retiredOverride = await callableError("chooseProgressionSource", { choice: "device" }, accountA.idToken);
  assert.equal(retiredOverride.body.error.status, "INVALID_ARGUMENT");
  assert.match(retiredOverride.body.error.message, /resolution mode/i);

  for (const endpoint of ["chooseProgressionSource", "requestAccountDeletion"]) {
    const rejection = await callableError(endpoint, {});
    assert.equal(rejection.body.error.status, "UNAUTHENTICATED", endpoint);
  }
  for (const endpoint of ["startVerifiedRun", "submitRunReceipt", "joinWeeklyLeague", "listWeeklyLeagues"]) {
    const rejection = await callableError(endpoint, {});
    assert.equal(rejection.body.error.status, "FAILED_PRECONDITION", endpoint);
    assert.match(rejection.body.error.message, /authoritative run verifier/i);
  }
  const retired = await callableError("claimSeasonReward", {});
  assert.equal(retired.body.error.status, "FAILED_PRECONDITION");
  assert.match(retired.body.error.message, /retired/i);

  assert.deepEqual(runtimeErrors, []);
  await context.close();
});
