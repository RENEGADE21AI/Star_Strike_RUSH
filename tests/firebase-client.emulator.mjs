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
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

let server;
let baseUrl;
let browser;
let db;

function localMetaSeed() {
  return {
    version: 1,
    totalGlory: 4321,
    currentSeason: {
      id: "season_01",
      name: "Launch Flight",
      xp: 6789,
      tier: 7,
      claimedRewardIds: ["season_01_tier_1"]
    },
    credits: 2468,
    lifetime: {
      runs: 12,
      score: 98765,
      kills: 444,
      powerups: 33,
      ghostUses: 22,
      bosses: 11,
      damageTaken: 55,
      highestCombo: 19,
      bestScore: 32100,
      bestPhase: 17
    },
    recentReceipts: [{ receiptId: "device_receipt", score: 32100 }],
    lastUpdatedAtMs: 1720000000000
  };
}

async function createEmulatorAccount(name) {
  const email = `${name}@star-strike.test`;
  const response = await fetch(`${authBase}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-star-strike-rush`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "StarStrike-Test-Only-2026",
      returnSecureToken: true
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Auth emulator account creation failed: ${JSON.stringify(body)}`);
  return { uid: body.localId, email };
}

async function seedAccount(account, options = {}) {
  await Promise.all([
    db.doc(`players_private/${account.uid}`).set({
      uid: account.uid,
      glory: options.glory ?? 999999,
      currentSeasonXP: options.seasonXP ?? 999999,
      currentSeasonTier: 50,
      credits: 999999,
      lifetimeRuns: 888,
      lifetimeScore: 777777,
      lifetimeKills: 666,
      lifetimePowerups: 555,
      lifetimeGhostUses: 444,
      lifetimeBosses: 333,
      lifetimeDamageTaken: 222,
      highestCombo: 111
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
    db.doc(`player_achievement_state/${account.uid}`).set({
      uid: account.uid,
      ids: ["first_sortie", "mythic_score"],
      count: 2,
      schemaVersion: 2
    })
  ]);
}

async function debugSnapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

async function waitForOnlineState(page, predicateSource, argument, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await page.evaluate(() => window.starStrikeOnline?.getState() || null);
    if (latest && predicateSource(latest, argument)) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for Firebase client state: ${JSON.stringify(latest)}`);
}

async function callableError(name, data = {}) {
  const response = await fetch(`${functionsBase}/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data })
  });
  const body = await response.json();
  return { status: response.status, body };
}

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8180");
  if (!admin.apps.length) admin.initializeApp({ projectId });
  db = admin.firestore();

  server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const resolved = path.resolve(repoRoot, relative);
    if (!resolved.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes.get(path.extname(resolved).toLowerCase()) || "application/octet-stream"
    });
    fs.createReadStream(resolved).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (admin.apps.length) await Promise.all(admin.apps.map((app) => app.delete()));
});

test("real Firebase client keeps device progression authoritative across account identity flows", async () => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`.slice(-14);
  const accountAName = `a-${suffix}`;
  const accountBName = `b-${suffix}`;
  const [accountA, accountB] = await Promise.all([
    createEmulatorAccount(accountAName),
    createEmulatorAccount(accountBName)
  ]);
  await Promise.all([
    seedAccount(accountA, { callSign: "ARCHIVE_A" }),
    seedAccount(accountB, { callSign: "ARCHIVE_B", publicBest: 222222, leaderboardBest: 333333 })
  ]);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((seed) => {
    if (sessionStorage.getItem("firebase-client-fixture-seeded") === "1") return;
    sessionStorage.setItem("firebase-client-fixture-seeded", "1");
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

  const before = await debugSnapshot(page);
  assert.equal(before.deviceProgress.totalGlory, 4321);
  assert.equal(before.deviceProgress.prestige, 0);
  assert.equal(before.deviceProgress.roadGlory, 4321);
  assert.equal(before.deviceProgress.credits, 2468);
  assert.deepEqual(before.deviceProgress.lifetime, localMetaSeed().lifetime);
  assert.equal(await page.evaluate(() => "currentSeason" in JSON.parse(localStorage.getItem("star_strike_rush_meta_v1"))), false);

  await page.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountAName);
  await waitForOnlineState(
    page,
    (state, uid) => state.user?.uid === uid && state.accountArchive === "loaded",
    accountA.uid,
    45000
  );
  let signedIn = await debugSnapshot(page);
  assert.deepEqual(signedIn.deviceProgress, before.deviceProgress, "account hydration replaced device progression");
  assert.equal(signedIn.highScore, 32100);
  assert.equal(signedIn.ui.account.progressionMode, "device_local_preseason");
  assert.equal(signedIn.ui.account.competitionMode, "preseason_unverified");
  assert.equal(signedIn.ui.account.counters.hydrationSequences, 1);
  assert.equal(signedIn.ui.account.counters.profileCallableCalls, 1);
  assert.equal(signedIn.ui.account.counters.achievementAggregateLoads, 1);
  assert.equal(signedIn.ui.account.counters.archiveListenerSubscriptions, 1);
  assert.equal(
    (await page.evaluate(() => window.starStrikeOnline.getState().backendRelease)).progressionAuthority,
    "device_local_preseason"
  );
  assert.deepEqual(
    await page.evaluate(() => window.starStrikeOnline.getState().achievements),
    ["first_sortie", "mythic_score"]
  );
  const archive = await page.evaluate(() => window.starStrikeOnline.getState());
  assert.equal(archive.onlineArchiveMeta.totalGlory, 999999);
  assert.equal(archive.onlineArchiveMeta.prestige, 3);
  assert.equal(archive.onlineArchiveMeta.roadGlory, 99999);
  assert.equal(archive.legacyRecord.legacyBestScore, 999999);
  assert.equal(archive.legacyRecord.verifiedBestScore, 0);
  assert.equal(archive.legacyRecord.recordTrust, "legacy_unverified");
  const cleanedPublicProfile = await db.doc(`players_public/${accountA.uid}`).get().then((snapshot) => snapshot.data());
  assert.equal(cleanedPublicProfile.legacyBestScore, 999999);
  assert.equal(cleanedPublicProfile.legacyPhase, 99);
  assert.equal(cleanedPublicProfile.verifiedBestScore, 0);
  assert.equal(cleanedPublicProfile.verifiedPhase, 1);
  assert.equal(cleanedPublicProfile.recordTrust, "legacy_unverified");
  for (const field of [
    "uid",
    "bestScore",
    "phase",
    "glory",
    "gloryRank",
    "gloryRankIndex",
    "seasonTier",
    "achievementsCount"
  ]) {
    assert.equal(field in cleanedPublicProfile, false, `obsolete public field remained: ${field}`);
  }

  await page.evaluate(() => window.starStrikeOnline.refresh());
  await page.waitForTimeout(200);
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress, "account refresh replaced device progression");

  const published = await page.evaluate(() => window.starStrikeOnline.updateCallSign("ACCOUNT_A"));
  assert.equal(published.published, true);
  assert.equal(await db.doc(`players_public/${accountA.uid}`).get().then((snapshot) => snapshot.data().callSign), "ACCOUNT_A");
  assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_callsign_v1")), "GUEST_ONLY");
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress, "call-sign publication replaced device progression");

  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await secondContext.addInitScript(({ uid, seed }) => {
    localStorage.setItem("star_strike_rush_meta_v1", JSON.stringify(seed));
    localStorage.setItem(`star_strike_rush_account_identity_v1:${uid}`, JSON.stringify({
      uid,
      desiredCallSign: "STALE_A",
      publishedCallSign: "STALE_A",
      pending: false,
      status: "published",
      updatedAtMs: 1
    }));
  }, { uid: accountA.uid, seed: localMetaSeed() });
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${baseUrl}/?debug=1&firebaseEmulators=1`, { waitUntil: "domcontentloaded" });
  await secondPage.waitForFunction(() => window.starStrikeOnline?.getState().ready === true, null, { timeout: 90000 });
  await secondPage.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountAName);
  await secondPage.waitForFunction(
    (uid) => window.starStrikeOnline?.getState().user?.uid === uid
      && window.starStrikeOnline?.getState().accountArchive === "loaded",
    accountA.uid,
    { timeout: 90000 }
  );
  assert.equal(await secondPage.evaluate(() => window.starStrikeOnline.getState().profileCallSign), "ACCOUNT_A");
  assert.equal(
    await secondPage.evaluate((uid) => window.readAccountIdentityState(localStorage, uid).publishedCallSign, accountA.uid),
    "ACCOUNT_A",
    "server call sign did not replace the stale second-device cache"
  );
  const secondDevicePublished = await secondPage.evaluate(() => window.starStrikeOnline.updateCallSign("STARFOX"));
  assert.equal(secondDevicePublished.published, true);
  await page.evaluate(() => window.starStrikeOnline.refresh());
  await page.waitForFunction(() => window.starStrikeOnline.getState().profileCallSign === "STARFOX", null, { timeout: 90000 });
  assert.equal(
    await page.evaluate((uid) => window.readAccountIdentityState(localStorage, uid).publishedCallSign, accountA.uid),
    "STARFOX",
    "first device did not accept the newer server-confirmed call sign"
  );
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress);
  await secondContext.close();

  const handle = `p${suffix.replace(/[^a-z0-9]/g, "").slice(-12)}`.slice(0, 16);
  const handleResult = await page.evaluate((value) => window.starStrikeOnline.claimHandle(value), handle);
  assert.deepEqual(handleResult, { ok: true, handle });
  const privateBeforeWeekly = await db.doc(`players_private/${accountA.uid}`).get().then((snapshot) => snapshot.data());
  const weeklyJoin = await page.evaluate(() => window.starStrikeOnline.joinWeeklyLeague());
  assert.equal(weeklyJoin.ok, true);
  assert.equal(weeklyJoin.league.recordTrust, "preseason_unverified");
  assert.equal(weeklyJoin.league.members.length, 1);
  const weeklyRun = {
    score: 12000,
    phaseReached: 3,
    stats: {
      enemiesKilled: 24,
      bossesKilled: 1,
      powerupsCollected: 2,
      ghostUses: 3,
      damageTaken: 1,
      highestCombo: 8,
      runDurationMs: 60000
    },
    receipt: { receiptId: `weekly_${suffix}` }
  };
  const weeklySubmit = await page.evaluate((run) => window.starStrikeOnline.submitRun(run), weeklyRun);
  assert.equal(weeklySubmit.ok, true);
  assert.equal(weeklySubmit.league.members[0].weeklyPoints, 1200);
  const weeklyDuplicate = await page.evaluate((run) => window.starStrikeOnline.submitRun(run), weeklyRun);
  assert.equal(weeklyDuplicate.ok, true);
  assert.equal(weeklyDuplicate.alreadyProcessed, true);
  assert.deepEqual(
    await db.doc(`players_private/${accountA.uid}`).get().then((snapshot) => snapshot.data()),
    privateBeforeWeekly,
    "weekly publication mutated account progression"
  );
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress, "weekly publication mutated device progression");

  await page.route("**/syncPilotProfile", (route) => route.abort("failed"));
  const pending = await page.evaluate(() => window.starStrikeOnline.updateCallSign("PENDING_A"));
  assert.equal(pending.storageSucceeded, true);
  assert.equal(pending.pending, true);
  assert.equal((await page.evaluate((uid) => window.readAccountIdentityState(localStorage, uid), accountA.uid)).desiredCallSign, "PENDING_A");
  await page.unroute("**/syncPilotProfile");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => window.starStrikeOnline.getState().pendingCallSign === false);
  assert.equal(await db.doc(`players_public/${accountA.uid}`).get().then((snapshot) => snapshot.data().callSign), "PENDING_A");
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction((uid) => {
    const state = window.starStrikeOnline?.getState();
    return state?.user?.uid === uid && state.accountArchive === "loaded";
  }, accountA.uid, { timeout: 90000 });
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress, "restored auth replaced device progression");
  assert.equal((await debugSnapshot(page)).ui.account.counters.hydrationSequences, 1);

  await page.evaluate((name) => window.starStrikeOnline.devSignInAccount(name), accountBName);
  await page.waitForFunction((uid) => window.starStrikeOnline.getState().user?.uid === uid, accountB.uid);
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, before.deviceProgress, "account switch replaced device progression");
  assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_callsign_v1")), "GUEST_ONLY");
  assert.equal((await page.evaluate((uid) => window.readAccountIdentityState(localStorage, uid), accountA.uid)).publishedCallSign, "PENDING_A");
  assert.notEqual((await page.evaluate((uid) => window.readAccountIdentityState(localStorage, uid), accountB.uid)).publishedCallSign, "PENDING_A");

  assert.equal(await page.evaluate(() => typeof window.starStrikeOnline.claimSeasonReward), "undefined");
  for (const endpoint of ["submitRunReceipt", "joinWeeklyLeague", "claimSeasonReward"]) {
    const rejection = await callableError(endpoint, endpoint === "claimSeasonReward" ? { rewardId: "season_01_tier_1" } : {});
    assert.equal(rejection.body.error.status, endpoint === "claimSeasonReward" ? "FAILED_PRECONDITION" : "UNAUTHENTICATED", endpoint);
    assert.match(rejection.body.error.message, endpoint === "claimSeasonReward" ? /retired/i : /sign in/i, endpoint);
  }
  const invariantProgress = (await debugSnapshot(page)).deviceProgress;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction((uid) => window.starStrikeOnline?.getState().user?.uid === uid, accountB.uid, { timeout: 90000 });
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, invariantProgress);

  await page.evaluate(() => window.starStrikeOnline.signOut());
  await page.waitForFunction(() => window.starStrikeOnline.getState().user === null);
  const signedOut = await page.evaluate(() => window.starStrikeOnline.getState());
  assert.equal(signedOut.leaderboard.length, 0);
  assert.equal(signedOut.achievements.length, 0);
  assert.equal(signedOut.profileCallSign, "");
  assert.deepEqual((await debugSnapshot(page)).deviceProgress, invariantProgress);
  assert.deepEqual(runtimeErrors, []);
  await context.close();
});
