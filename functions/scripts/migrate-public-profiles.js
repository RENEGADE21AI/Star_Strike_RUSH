"use strict";

const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const {
  buildPublicProfileMigration,
  publicPilotIdFor
} = require("../profile-archive");

function parseArguments(argv) {
  const options = { apply: false, projectId: process.env.GCLOUD_PROJECT || "star-strike-rush" };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--apply") options.apply = true;
    else if (argv[index] === "--project") options.projectId = String(argv[++index] || "").trim();
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!["star-strike-rush", "demo-star-strike-rush"].includes(options.projectId)) {
    throw new Error(`Refusing unexpected Firebase project ${options.projectId}`);
  }
  return options;
}

function writePatch(migration) {
  const patch = {
    ...migration.canonical,
    createdAt: migration.canonical.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  for (const field of migration.obsoleteFields) patch[field] = FieldValue.delete();
  return patch;
}

async function migratePublicProfiles(db, apply) {
  const publicSnapshot = await db.collection("players_public").get();
  let accountsNeedingChange = 0;
  let preservedLegacyScoreCount = 0;
  for (const publicDocument of publicSnapshot.docs) {
    const leaderboardSnapshot = await db.doc(`leaderboard_scores/${publicDocument.id}`).get();
    const migration = buildPublicProfileMigration(
      publicDocument.data(),
      leaderboardSnapshot.exists ? leaderboardSnapshot.data() : {},
      {
        uid: publicDocument.id,
        publicPilotId: publicPilotIdFor(publicDocument.id)
      }
    );
    if (!migration.changed) continue;
    accountsNeedingChange++;
    if (migration.canonical.legacyBestScore > 0 || migration.canonical.legacyPhase > 1) {
      preservedLegacyScoreCount++;
    }
    if (apply) await publicDocument.ref.set(writePatch(migration), { merge: true });
  }
  return {
    ok: true,
    apply,
    accountCount: publicSnapshot.size,
    accountsNeedingChange,
    preservedLegacyScoreCount
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: options.projectId });
  }
  const summary = await migratePublicProfiles(getFirestore(), options.apply);
  console.log(JSON.stringify(summary));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  migratePublicProfiles,
  parseArguments,
  writePatch
};
