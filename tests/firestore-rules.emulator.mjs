import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc
} from "firebase/firestore";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "star-strike-rush-rules-test";
let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(path.join(repoRoot, "firestore.rules"), "utf8")
    }
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "players_private/alice"), { uid: "alice", credits: 10 }),
      setDoc(doc(db, "players_private/bob"), { uid: "bob", credits: 20 }),
      setDoc(doc(db, "players_public/alice"), { uid: "alice", callSign: "ALPHA", bestScore: 100 }),
      setDoc(doc(db, "players_public/bob"), { uid: "bob", callSign: "BRAVO", bestScore: 200 }),
      setDoc(doc(db, "leaderboard_scores/alice"), { uid: "alice", callSign: "ALPHA", bestScore: 100 }),
      setDoc(doc(db, "leaderboard_scores/bob"), { uid: "bob", callSign: "BRAVO", bestScore: 200 }),
      setDoc(doc(db, "player_achievements/alice/items/first_run"), { achievementId: "first_run" }),
      setDoc(doc(db, "run_receipts/alice/items/run_1"), { receiptId: "run_1" }),
      setDoc(doc(db, "season_reward_claims/alice/items/reward_1"), { rewardId: "reward_1" }),
      setDoc(doc(db, "handle_registry/alpha"), { uid: "alice" }),
      setDoc(doc(db, "weekly_enrollments/week_alice"), { uid: "alice" }),
      setDoc(doc(db, "weekly_leagues/league_1"), { memberCount: 1 })
    ]);
  });
});

after(async () => {
  if (environment) {
    await environment.clearFirestore();
    await environment.cleanup();
  }
});

test("unauthenticated browsers cannot read or write game data", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "players_public/alice")));
  await assertFails(getDoc(doc(db, "leaderboard_scores/alice")));
  await assertFails(getDoc(doc(db, "players_private/alice")));
  await assertFails(setDoc(doc(db, "players_public/attacker"), { callSign: "ATTACKER" }));
});

test("authenticated users can read bounded public records but cannot mutate them", async () => {
  const db = environment.authenticatedContext("alice").firestore();
  await assertSucceeds(getDoc(doc(db, "players_public/bob")));
  await assertSucceeds(getDoc(doc(db, "leaderboard_scores/bob")));
  const publicRows = await assertSucceeds(getDocs(query(collection(db, "players_public"), limit(25))));
  assert.equal(publicRows.size, 2);
  await assertFails(getDocs(collection(db, "players_public")));
  await assertFails(getDocs(query(collection(db, "leaderboard_scores"), limit(26))));
  await assertFails(setDoc(doc(db, "players_public/alice"), { callSign: "FORGED" }));
  await assertFails(updateDoc(doc(db, "leaderboard_scores/alice"), { bestScore: 999999999 }));
  await assertFails(deleteDoc(doc(db, "players_public/bob")));
});

test("private progression and receipts are owner-readable and browser-immutable", async () => {
  const aliceDb = environment.authenticatedContext("alice").firestore();
  const bobDb = environment.authenticatedContext("bob").firestore();
  await assertSucceeds(getDoc(doc(aliceDb, "players_private/alice")));
  await assertFails(getDoc(doc(aliceDb, "players_private/bob")));
  await assertFails(getDocs(collection(aliceDb, "players_private")));
  await assertSucceeds(getDoc(doc(aliceDb, "player_achievements/alice/items/first_run")));
  await assertSucceeds(getDoc(doc(aliceDb, "run_receipts/alice/items/run_1")));
  await assertSucceeds(getDoc(doc(aliceDb, "season_reward_claims/alice/items/reward_1")));
  await assertFails(getDoc(doc(bobDb, "player_achievements/alice/items/first_run")));
  await assertFails(updateDoc(doc(aliceDb, "players_private/alice"), { credits: 999999999 }));
  await assertFails(setDoc(doc(aliceDb, "run_receipts/alice/items/forged"), { score: 999999999 }));
});

test("handle and league internals remain callable-only", async () => {
  const db = environment.authenticatedContext("alice").firestore();
  await assertFails(getDoc(doc(db, "handle_registry/alpha")));
  await assertFails(setDoc(doc(db, "handle_registry/attacker"), { uid: "alice" }));
  await assertFails(getDoc(doc(db, "weekly_enrollments/week_alice")));
  await assertFails(getDoc(doc(db, "weekly_leagues/league_1")));
});
