const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

const {
  ACHIEVEMENTS,
  publicProfileFromPrivate,
  safeCallSign,
  safeDocId,
  safeText,
  sanitizeRunReceipt,
  validateRunPlausibility
} = require("./progression");
const {
  normalizeHandle,
  publicLeagueMember,
  requireCompetitionEnabled,
  validateHandle,
  weekWindow
} = require("./competition");
const { SERVER_APP_CHECK_ENFORCED } = require("./release-config");
const { BACKEND_RELEASE_IDENTITY } = require("./release-identity");
const {
  accountArchiveMeta,
  buildPublicProfileMigration,
  legacyRecord,
  publicPilotIdFor
} = require("./profile-archive");
const { enforceUidThrottle, requirePayloadWithin } = require("./callable-security");

admin.initializeApp();

const db = admin.firestore();
const REGION = "us-central1";
const CALLABLE_OPTIONS = Object.freeze({
  region: REGION,
  maxInstances: 10,
  concurrency: 40,
  timeoutSeconds: 30,
  memory: "256MiB",
  enforceAppCheck: SERVER_APP_CHECK_ENFORCED
});

function neutralPilotCallSign(uid) {
  let hash = 2166136261;
  for (const char of String(uid || "pilot")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `PILOT_${(hash >>> 0).toString(36).toUpperCase().slice(0, 5)}`;
}

function authContext(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Sign in is required.", { release: BACKEND_RELEASE_IDENTITY });
  }
  return { uid: request.auth.uid };
}

function profileFromSnapshots(privateSnap) {
  return accountArchiveMeta(privateSnap.exists ? privateSnap.data() : {});
}

function legacyArchiveFromSnapshots(publicSnap, leaderboardSnap) {
  return legacyRecord(
    publicSnap && publicSnap.exists ? publicSnap.data() : {},
    leaderboardSnap && leaderboardSnap.exists ? leaderboardSnap.data() : {}
  );
}

function publicIdentityPayloadFor(auth, callSign, achievementArchiveCount, legacyRecord, existing = {}) {
  const now = FieldValue.serverTimestamp();
  const sanitizedCallSign = safeCallSign(callSign || existing.callSign || "");
  const canonical = buildPublicProfileMigration(existing, {}, {
    uid: auth.uid,
    requestedCallSign: sanitizedCallSign,
    achievementArchiveCount,
    publicPilotId: publicPilotIdFor(auth.uid)
  }).canonical;
  return {
    publicPilotId: canonical.publicPilotId,
    callSign: sanitizedCallSign.length >= 3 ? sanitizedCallSign : neutralPilotCallSign(auth.uid),
    handle: normalizeHandle(existing.handle || ""),
    legacyBestScore: legacyRecord.legacyBestScore,
    legacyPhase: legacyRecord.legacyPhase,
    verifiedBestScore: legacyRecord.verifiedBestScore,
    verifiedPhase: legacyRecord.verifiedPhase,
    recordTrust: legacyRecord.recordTrust,
    achievementArchiveCount,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    email: FieldValue.delete(),
    displayName: FieldValue.delete(),
    photoURL: FieldValue.delete(),
    uid: FieldValue.delete(),
    bestScore: FieldValue.delete(),
    phase: FieldValue.delete(),
    glory: FieldValue.delete(),
    gloryRank: FieldValue.delete(),
    gloryRankIndex: FieldValue.delete(),
    seasonTier: FieldValue.delete(),
    achievementsCount: FieldValue.delete()
  };
}

async function leagueResponse(leagueId) {
  const leagueRef = db.doc(`weekly_leagues/${leagueId}`);
  const [leagueSnap, memberSnaps] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("members").orderBy("weeklyPoints", "desc").limit(30).get()
  ]);
  if (!leagueSnap.exists) throw new HttpsError("not-found", "Weekly league not found.");
  const data = leagueSnap.data();
  return {
    id: leagueSnap.id,
    weekId: data.weekId,
    weekLabel: String(data.weekLabel || "CURRENT WEEK").slice(0, 40),
    division: String(data.division || "ROOKIE").slice(0, 20),
    band: Number(data.band || 0),
    memberCount: Number(data.memberCount || memberSnaps.size),
    capacity: Number(data.capacity || 30),
    closesAtMs: Number(data.closesAtMs || 0),
    recordTrust: "preseason_unverified",
    members: memberSnaps.docs.map((snapshot) => publicLeagueMember(snapshot.data()))
  };
}

exports.syncPilotProfile = onCall(CALLABLE_OPTIONS, async (request) => {
  requirePayloadWithin(request.data, 1024);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "syncPilotProfile",
    uid: auth.uid,
    maximumCalls: 8,
    windowMs: 10000
  });
  const requestedCallSign = safeCallSign(request.data && request.data.callSign);
  const privateRef = db.doc(`players_private/${auth.uid}`);
  const publicRef = db.doc(`players_public/${auth.uid}`);
  const leaderboardRef = db.doc(`leaderboard_scores/${auth.uid}`);
  const achievementStateRef = db.doc(`player_achievement_state/${auth.uid}`);

  const result = await db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap, achievementStateSnap] = await Promise.all([
      tx.get(privateRef), tx.get(publicRef), tx.get(leaderboardRef), tx.get(achievementStateRef)
    ]);
    const accountArchiveMeta = profileFromSnapshots(privateSnap);
    const publicData = publicSnap.exists ? publicSnap.data() : {};
    const legacyRecord = legacyArchiveFromSnapshots(publicSnap, leaderboardSnap);
    const achievementState = achievementStateSnap.exists ? achievementStateSnap.data() : {};
    const validAchievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
    const achievementIds = Array.from(new Set(
      (Array.isArray(achievementState.ids) ? achievementState.ids : [])
        .map((id) => safeDocId(id, ""))
        .filter((id) => validAchievementIds.has(id))
    )).slice(0, ACHIEVEMENTS.length);
    const achievementArchiveCount = Math.min(
      ACHIEVEMENTS.length,
      Math.max(
        achievementIds.length,
        Number(achievementState.count || 0),
        Number(publicData.achievementArchiveCount || publicData.achievementsCount || 0),
        Number((leaderboardSnap.exists && leaderboardSnap.data().achievementsCount) || 0)
      )
    );
    const publicPayload = publicIdentityPayloadFor(
      auth,
      requestedCallSign || publicData.callSign,
      achievementArchiveCount,
      legacyRecord,
      publicData
    );
    if (privateSnap.exists) {
      tx.set(privateRef, {
        email: FieldValue.delete(),
        displayName: FieldValue.delete(),
        photoURL: FieldValue.delete()
      }, { merge: true });
    }
    tx.set(publicRef, publicPayload, { merge: true });
    return {
      publicPilotId: publicPayload.publicPilotId,
      callSign: publicPayload.callSign,
      handle: publicPayload.handle,
      accountArchiveMeta: clientProfile(accountArchiveMeta),
      legacyRecord,
      achievementArchive: {
        ids: achievementIds,
        count: achievementArchiveCount,
        schemaVersion: Math.max(0, Math.floor(Number(achievementState.schemaVersion || 0)))
      }
    };
  });

  return { ok: true, ...result, release: BACKEND_RELEASE_IDENTITY };
});

exports.claimPilotHandle = onCall(CALLABLE_OPTIONS, async (request) => {
  requirePayloadWithin(request.data, 512);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "claimPilotHandle",
    uid: auth.uid,
    maximumCalls: 4,
    windowMs: 30000
  });
  const validation = validateHandle(request.data && request.data.handle);
  if (!validation.ok) throw new HttpsError("invalid-argument", `Handle is invalid: ${validation.reason}.`);
  const handle = validation.handle;
  const registryRef = db.doc(`handle_registry/${handle}`);
  const publicRef = db.doc(`players_public/${auth.uid}`);

  await db.runTransaction(async (tx) => {
    const [registrySnap, publicSnap] = await Promise.all([
      tx.get(registryRef), tx.get(publicRef)
    ]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Activate pilot identity before claiming a handle.");
    const current = normalizeHandle(publicSnap.data().handle || "");
    if (current && current !== handle) throw new HttpsError("failed-precondition", "Your handle is already locked to this account.");
    if (registrySnap.exists && registrySnap.data().uid !== auth.uid) throw new HttpsError("already-exists", "That handle is already claimed.");
    const now = FieldValue.serverTimestamp();
    tx.set(registryRef, { uid: auth.uid, handle, claimedAt: registrySnap.exists ? registrySnap.data().claimedAt : now, updatedAt: now });
    tx.update(publicRef, { handle, updatedAt: now });
  });

  return { ok: true, handle, release: BACKEND_RELEASE_IDENTITY };
});

exports.joinWeeklyLeague = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  requirePayloadWithin(request.data, 256);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "joinWeeklyLeague",
    uid: auth.uid,
    maximumCalls: 6,
    windowMs: 30000
  });
  const shouldJoin = request.data && request.data.join === true;
  const week = weekWindow();
  const publicRef = db.doc(`players_public/${auth.uid}`);
  const enrollmentRef = db.doc(`weekly_enrollments/${week.id}_${auth.uid}`);

  const assignment = await db.runTransaction(async (tx) => {
    const [publicSnap, enrollmentSnap] = await Promise.all([tx.get(publicRef), tx.get(enrollmentRef)]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Activate pilot identity before entering the weekly board.");
    const publicData = publicSnap.data();
    if (enrollmentSnap.exists) return { leagueId: enrollmentSnap.data().leagueId };
    if (!shouldJoin) return { leagueId: "" };
    const handle = normalizeHandle(publicData.handle || "");
    if (!handle) throw new HttpsError("failed-precondition", "Claim a unique handle before entering the weekly board.");
    const band = 0;
    const availableQuery = db.collection("weekly_leagues")
      .where("weekId", "==", week.id)
      .where("band", "==", band)
      .where("memberCount", "<", 30)
      .orderBy("memberCount", "desc")
      .limit(1);
    const available = await tx.get(availableQuery);
    const leagueRef = available.empty ? db.collection("weekly_leagues").doc() : available.docs[0].ref;
    const existingLeague = available.empty ? null : available.docs[0].data();
    const memberRef = leagueRef.collection("members").doc(auth.uid);
    const now = FieldValue.serverTimestamp();
    const memberCount = existingLeague ? Number(existingLeague.memberCount || 0) + 1 : 1;
    if (existingLeague) {
      tx.update(leagueRef, { memberCount, updatedAt: now });
    } else {
      tx.create(leagueRef, {
        weekId: week.id,
        weekLabel: "MONDAY — SUNDAY UTC",
        division: "OPEN",
        band,
        memberCount,
        capacity: 30,
        opensAtMs: week.startMs,
        closesAtMs: week.endMs,
        createdAt: now,
        updatedAt: now
      });
    }
    tx.create(memberRef, {
      publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(auth.uid)),
      callSign: safeCallSign(publicData.callSign) || neutralPilotCallSign(auth.uid),
      handle,
      weeklyPoints: 0,
      bestRunScore: 0,
      recordTrust: "preseason_unverified",
      joinedAt: now,
      updatedAt: now
    });
    tx.create(enrollmentRef, { uid: auth.uid, weekId: week.id, leagueId: leagueRef.id, joinedAt: now });
    return { leagueId: leagueRef.id };
  });

  return {
    ok: true,
    mode: "preseason_unverified",
    league: assignment.leagueId ? await leagueResponse(assignment.leagueId) : null,
    release: BACKEND_RELEASE_IDENTITY
  };
});

function clientProfile(profile) {
  const publicProfile = publicProfileFromPrivate(profile);
  return {
    totalGlory: publicProfile.totalGlory,
    prestige: publicProfile.prestige,
    roadGlory: publicProfile.roadGlory,
    gloryRank: publicProfile.gloryRank,
    gloryRankDisplay: publicProfile.gloryRankDisplay,
    gloryRankIndex: publicProfile.gloryRankIndex,
    credits: publicProfile.credits,
    lifetime: {
      runs: publicProfile.lifetimeRuns,
      score: publicProfile.lifetimeScore,
      kills: publicProfile.lifetimeKills,
      powerups: publicProfile.lifetimePowerups,
      ghostUses: publicProfile.lifetimeGhostUses,
      bosses: publicProfile.lifetimeBosses,
      damageTaken: publicProfile.lifetimeDamageTaken,
      highestCombo: publicProfile.highestCombo,
      bestScore: publicProfile.bestScore,
      bestPhase: publicProfile.phase
    }
  };
}

exports.submitRunReceipt = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  requirePayloadWithin(request.data, 2048);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "submitRunReceipt",
    uid: auth.uid,
    maximumCalls: 8,
    windowMs: 60000
  });
  const run = sanitizeRunReceipt({
    ...(request.data && request.data.receipt ? request.data.receipt : request.data || {}),
    callSign: request.data && request.data.callSign
  });
  const validation = validateRunPlausibility(run);
  if (!validation.ok) {
    throw new HttpsError("failed-precondition", `Run receipt rejected: ${validation.reason}`, { reason: validation.reason });
  }

  const uid = auth.uid;
  const receiptId = safeDocId(run.clientReceiptId, `run_${Date.now()}`);
  const publicRef = db.doc(`players_public/${uid}`);
  const currentWeek = weekWindow();
  const enrollmentRef = db.doc(`weekly_enrollments/${currentWeek.id}_${uid}`);
  const submission = await db.runTransaction(async (tx) => {
    const [publicSnap, enrollmentSnap] = await Promise.all([tx.get(publicRef), tx.get(enrollmentRef)]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Activate pilot identity before publishing weekly Flight Points.");
    if (!enrollmentSnap.exists || !enrollmentSnap.data().leagueId) {
      throw new HttpsError("failed-precondition", "Enter the weekly board before publishing a run.");
    }
    const leagueId = String(enrollmentSnap.data().leagueId);
    const memberRef = db.doc(`weekly_leagues/${leagueId}/members/${uid}`);
    const receiptRef = db.doc(`weekly_run_receipts/${currentWeek.id}/members/${uid}/items/${receiptId}`);
    const [memberSnap, receiptSnap] = await Promise.all([tx.get(memberRef), tx.get(receiptRef)]);
    if (!memberSnap.exists) throw new HttpsError("failed-precondition", "Weekly enrollment is incomplete. Re-enter the board.");
    if (receiptSnap.exists) return { leagueId, alreadyProcessed: true, weeklyPoints: Number(memberSnap.data().weeklyPoints || 0) };
    const publicData = publicSnap.data();
    const flightPoints = Math.min(999999999, Math.floor(run.score / 10));
    const weeklyPoints = Math.max(Number(memberSnap.data().weeklyPoints || 0), flightPoints);
    tx.create(receiptRef, {
      receiptId,
      publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(uid)),
      score: run.score,
      flightPoints,
      phaseReached: run.phaseReached,
      runDurationMs: run.runDurationMs,
      clientVersion: run.clientVersion,
      recordTrust: "preseason_unverified",
      submittedAt: FieldValue.serverTimestamp()
    });
    tx.update(memberRef, {
      publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(uid)),
      callSign: safeCallSign(publicData.callSign) || neutralPilotCallSign(uid),
      handle: normalizeHandle(publicData.handle || ""),
      weeklyPoints,
      bestRunScore: Math.max(Number(memberSnap.data().bestRunScore || 0), run.score),
      recordTrust: "preseason_unverified",
      updatedAt: FieldValue.serverTimestamp()
    });
    return { leagueId, alreadyProcessed: false, weeklyPoints };
  });
  return {
    ok: true,
    ...submission,
    mode: "preseason_unverified",
    league: await leagueResponse(submission.leagueId),
    release: BACKEND_RELEASE_IDENTITY
  };
});

exports.claimSeasonReward = onCall(CALLABLE_OPTIONS, async (request) => {
  throw new HttpsError(
    "failed-precondition",
    "Season Road is retired. Glory Road is the only active progression road, and account progression writes remain paused.",
    { retired: true, release: BACKEND_RELEASE_IDENTITY }
  );
});
