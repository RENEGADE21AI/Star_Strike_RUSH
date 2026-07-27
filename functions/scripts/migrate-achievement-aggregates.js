const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { aggregateFromUnlockDocuments } = require("../achievement-migration");

function parseArguments(argv) {
  const options = { apply: false, uid: "", projectId: process.env.GCLOUD_PROJECT || "star-strike-rush" };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === "--apply") options.apply = true;
    else if (value === "--uid") options.uid = String(argv[++index] || "").trim();
    else if (value === "--project") options.projectId = String(argv[++index] || "").trim();
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (options.projectId !== "star-strike-rush" && options.projectId !== "demo-star-strike-rush") {
    throw new Error(`Refusing unexpected Firebase project ${options.projectId}`);
  }
  return options;
}

async function migrateAccount(db, uid, apply) {
  const aggregateRef = db.doc(`player_achievement_state/${uid}`);
  const unlockQuery = db.collection(`player_achievements/${uid}/items`);
  const [aggregateSnapshot, unlockSnapshot] = await Promise.all([
    aggregateRef.get(),
    unlockQuery.get()
  ]);
  const existing = aggregateSnapshot.exists ? aggregateSnapshot.data() : {};
  const unlockDocuments = unlockSnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    achievementId: snapshot.data().achievementId,
    unlockedAt: snapshot.data().unlockedAt || null
  }));
  const migration = aggregateFromUnlockDocuments(existing, unlockDocuments, FieldValue.serverTimestamp());
  if (apply && migration.changed) {
    await aggregateRef.set(migration.aggregate, { merge: true });
  }
  return {
    uid,
    changed: migration.changed,
    applied: apply && migration.changed,
    aggregateCount: migration.aggregate.count,
    sourceCount: migration.aggregate.sourceCount,
    ignoredSourceCount: migration.ignoredSourceCount
  };
}

async function accountIds(db, requestedUid) {
  if (requestedUid) return [requestedUid];
  const [snapshots, achievementAccountRefs] = await Promise.all([
    Promise.all([
    db.collection("players_private").select().get(),
    db.collection("players_public").select().get(),
    db.collection("player_achievement_state").select().get()
    ]),
    db.collection("player_achievements").listDocuments()
  ]);
  const ids = new Set(snapshots.flatMap((snapshot) => snapshot.docs.map((document) => document.id)));
  for (const reference of achievementAccountRefs) ids.add(reference.id);
  return Array.from(ids).sort();
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: options.projectId });
  }
  const db = getFirestore();
  const uids = await accountIds(db, options.uid);
  console.log(`${options.apply ? "APPLY" : "DRY RUN"} achievement aggregate migration for ${uids.length} account(s)`);
  let changed = 0;
  for (const uid of uids) {
    const result = await migrateAccount(db, uid, options.apply);
    if (result.changed) changed++;
    console.log(JSON.stringify(result));
  }
  console.log(JSON.stringify({ ok: true, apply: options.apply, accounts: uids.length, changed }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = { accountIds, migrateAccount, parseArguments };
