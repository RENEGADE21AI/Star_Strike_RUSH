const admin = require("firebase-admin");
const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const {
  ACHIEVEMENTS,
  applyRunToProfile,
  normalizeProfile,
  publicProfileFromPrivate,
  safeCallSign,
  safeDocId,
  safeText,
  sanitizeRunReceipt,
  validateRunPlausibility
} = require("./progression");
const {
  divisionName,
  normalizeHandle,
  performanceBand,
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
const { accountProfileFromClient, bestProgressionSource } = require("./account-progression-choice");
const { ACCOUNT_DELETION_GRACE_MS } = require("./account-deletion");
const {
  TRUSTED_RUN_MAX_DURATION_MS,
  reusableVerifiedRunSession,
  validateTrustedRunSubmission
} = require("./trusted-run");

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
    recordTrust: "verified_run_session",
    members: memberSnaps.docs.map((snapshot) => publicLeagueMember(snapshot.data()))
  };
}

async function weeklyLeagueCatalog(uid) {
  const week = weekWindow();
  const [leagueSnaps, enrollmentSnap] = await Promise.all([
    db.collection("weekly_leagues")
      .where("weekId", "==", week.id)
      .orderBy("band", "asc")
      .orderBy("memberCount", "desc")
      .limit(50)
      .get(),
    db.doc(`weekly_enrollments/${week.id}_${uid}`).get()
  ]);
  return {
    activeLeagueId: enrollmentSnap.exists ? String(enrollmentSnap.data().leagueId || "") : "",
    leagues: await Promise.all(leagueSnaps.docs.map((snapshot) => leagueResponse(snapshot.id)))
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
  const deletionRef = db.doc(`account_deletion_requests/${auth.uid}`);
  const worldRecordRef = db.doc(`world_records/${auth.uid}`);
  const currentWeek = weekWindow();
  const enrollmentRef = db.doc(`weekly_enrollments/${currentWeek.id}_${auth.uid}`);

  const result = await db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap, achievementStateSnap, deletionSnap, worldRecordSnap, enrollmentSnap] = await Promise.all([
      tx.get(privateRef), tx.get(publicRef), tx.get(leaderboardRef), tx.get(achievementStateRef), tx.get(deletionRef), tx.get(worldRecordRef), tx.get(enrollmentRef)
    ]);
    const leagueMemberRef = enrollmentSnap.exists && enrollmentSnap.data().leagueId
      ? db.doc(`weekly_leagues/${String(enrollmentSnap.data().leagueId)}/members/${auth.uid}`)
      : null;
    const leagueMemberSnap = leagueMemberRef ? await tx.get(leagueMemberRef) : null;
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
    if (worldRecordSnap.exists) tx.update(worldRecordRef, { callSign: publicPayload.callSign, updatedAt: FieldValue.serverTimestamp() });
    if (leagueMemberRef && leagueMemberSnap && leagueMemberSnap.exists) {
      tx.update(leagueMemberRef, { callSign: publicPayload.callSign, updatedAt: FieldValue.serverTimestamp() });
    }
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
      },
      accountDeletion: deletionSnap.exists && deletionSnap.data().status === "pending" ? {
        status: "pending",
        requestedAtMs: Math.max(0, Number(deletionSnap.data().requestedAtMs || 0)),
        deletesAfterMs: Math.max(0, Number(deletionSnap.data().deletesAfterMs || 0))
      } : null
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
  const worldRecordRef = db.doc(`world_records/${auth.uid}`);
  const currentWeek = weekWindow();
  const enrollmentRef = db.doc(`weekly_enrollments/${currentWeek.id}_${auth.uid}`);

  await db.runTransaction(async (tx) => {
    const [publicSnap, worldRecordSnap, enrollmentSnap] = await Promise.all([
      tx.get(publicRef), tx.get(worldRecordRef), tx.get(enrollmentRef)
    ]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Activate pilot identity before claiming a handle.");
    const current = normalizeHandle(publicSnap.data().handle || "");
    const currentRegistryRef = current ? db.doc(`handle_registry/${current}`) : null;
    const leagueMemberRef = enrollmentSnap.exists && enrollmentSnap.data().leagueId
      ? db.doc(`weekly_leagues/${String(enrollmentSnap.data().leagueId)}/members/${auth.uid}`)
      : null;
    const [registrySnap, currentRegistrySnap, leagueMemberSnap] = await Promise.all([
      tx.get(registryRef),
      currentRegistryRef && currentRegistryRef.path !== registryRef.path ? tx.get(currentRegistryRef) : Promise.resolve(null),
      leagueMemberRef ? tx.get(leagueMemberRef) : Promise.resolve(null)
    ]);
    if (registrySnap.exists && registrySnap.data().uid !== auth.uid) throw new HttpsError("already-exists", "That handle is already claimed.");
    const now = FieldValue.serverTimestamp();
    tx.set(registryRef, { uid: auth.uid, handle, claimedAt: registrySnap.exists ? registrySnap.data().claimedAt : now, updatedAt: now });
    if (currentRegistryRef && currentRegistryRef.path !== registryRef.path && currentRegistrySnap && currentRegistrySnap.exists && currentRegistrySnap.data().uid === auth.uid) {
      tx.delete(currentRegistryRef);
    }
    tx.update(publicRef, { handle, updatedAt: now });
    if (worldRecordSnap.exists) tx.update(worldRecordRef, { handle, updatedAt: now });
    if (leagueMemberRef && leagueMemberSnap && leagueMemberSnap.exists) tx.update(leagueMemberRef, { handle, updatedAt: now });
  });

  return { ok: true, handle, release: BACKEND_RELEASE_IDENTITY };
});

exports.requestAccountDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  requirePayloadWithin(request.data, 128);
  const auth = authContext(request);
  await enforceUidThrottle(db, { endpoint: "requestAccountDeletion", uid: auth.uid, maximumCalls: 3, windowMs: 60000 });
  if (!request.data || request.data.confirm !== "DELETE MY PILOT ACCOUNT") {
    throw new HttpsError("invalid-argument", "Type DELETE MY PILOT ACCOUNT to confirm the request.");
  }
  const nowMs = Date.now();
  const deletesAfterMs = nowMs + ACCOUNT_DELETION_GRACE_MS;
  await db.doc(`account_deletion_requests/${auth.uid}`).set({
    uid: auth.uid,
    status: "pending",
    requestedAtMs: nowMs,
    deletesAfterMs,
    updatedAt: FieldValue.serverTimestamp()
  });
  return { ok: true, status: "pending", requestedAtMs: nowMs, deletesAfterMs, release: BACKEND_RELEASE_IDENTITY };
});

exports.cancelAccountDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  requirePayloadWithin(request.data, 64);
  const auth = authContext(request);
  await enforceUidThrottle(db, { endpoint: "cancelAccountDeletion", uid: auth.uid, maximumCalls: 5, windowMs: 60000 });
  const ref = db.doc(`account_deletion_requests/${auth.uid}`);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data().status !== "pending") return;
    if (Date.now() >= Number(snapshot.data().deletesAfterMs || 0)) {
      throw new HttpsError("failed-precondition", "The 72-hour cancellation period has ended.");
    }
    tx.delete(ref);
  });
  return { ok: true, status: "cancelled", release: BACKEND_RELEASE_IDENTITY };
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
    const band = performanceBand(publicData.verifiedBestScore || 0);
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
        division: divisionName(band),
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
      recordTrust: "verified_run_session",
      joinedAt: now,
      updatedAt: now
    });
    tx.create(enrollmentRef, { uid: auth.uid, weekId: week.id, leagueId: leagueRef.id, joinedAt: now });
    return { leagueId: leagueRef.id };
  });

  return {
    ok: true,
    mode: "verified_world_records",
    league: assignment.leagueId ? await leagueResponse(assignment.leagueId) : null,
    ...(await weeklyLeagueCatalog(auth.uid)),
    release: BACKEND_RELEASE_IDENTITY
  };
});

exports.listWeeklyLeagues = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  requirePayloadWithin(request.data, 64);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "listWeeklyLeagues",
    uid: auth.uid,
    maximumCalls: 12,
    windowMs: 30000
  });
  return {
    ok: true,
    mode: "verified_world_records",
    ...(await weeklyLeagueCatalog(auth.uid)),
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
    codexDiscoveries: Array.isArray(profile && profile.codexDiscoveries) ? profile.codexDiscoveries.slice(0, 100) : [],
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

exports.chooseProgressionSource = onCall(CALLABLE_OPTIONS, async (request) => {
  requirePayloadWithin(request.data, 8192);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "chooseProgressionSource",
    uid: auth.uid,
    maximumCalls: 4,
    windowMs: 60000
  });
  const choice = String(request.data && request.data.choice || "best");
  if (choice !== "best") {
    throw new HttpsError("invalid-argument", "Progression resolution mode is invalid.");
  }
  const privateRef = db.doc(`players_private/${auth.uid}`);
  const bindingId = String(request.data && request.data.deviceBindingId || "");
  const bindingIsValid = /^[A-Za-z0-9_-]{8,128}$/.test(bindingId);
  const bindingHash = bindingIsValid ? crypto.createHash("sha256").update(bindingId).digest("hex") : "";
  const bindingRef = bindingIsValid ? db.doc(`device_progress_bindings/${bindingHash}`) : null;
  const selectedProfile = accountProfileFromClient(request.data && request.data.deviceProgress);
  const validAchievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
  const achievementIds = Array.from(new Set(
    (Array.isArray(request.data && request.data.achievementIds) ? request.data.achievementIds : [])
      .map((id) => safeDocId(id, ""))
      .filter((id) => validAchievementIds.has(id))
  )).slice(0, ACHIEVEMENTS.length);
  const codexDiscoveries = Array.from(new Set(
    (Array.isArray(request.data && request.data.codexDiscoveries) ? request.data.codexDiscoveries : [])
      .map((id) => String(id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40))
      .filter(Boolean)
  )).slice(0, 100);
  const achievementStateRef = db.doc(`player_achievement_state/${auth.uid}`);
  const resolution = await db.runTransaction(async (tx) => {
    const reads = [tx.get(privateRef), tx.get(achievementStateRef)];
    if (bindingIsValid) reads.push(tx.get(bindingRef));
    const [privateSnap, achievementStateSnap, bindingSnap = null] = await Promise.all(reads);
    const accountProfile = privateSnap.exists ? privateSnap.data() : {};
    const accountAchievementIds = achievementStateSnap && achievementStateSnap.exists && Array.isArray(achievementStateSnap.data().ids)
      ? achievementStateSnap.data().ids.filter((id) => validAchievementIds.has(id)).slice(0, ACHIEVEMENTS.length)
      : [];
    const accountCodexDiscoveries = Array.isArray(accountProfile.codexDiscoveries)
      ? accountProfile.codexDiscoveries.slice(0, 100)
      : [];
    const bindingOwnedElsewhere = Boolean(bindingSnap && bindingSnap.exists && bindingSnap.data().uid !== auth.uid);
    const selectedSource = !bindingIsValid || bindingOwnedElsewhere
      ? "account"
      : bestProgressionSource(selectedProfile, accountProfile, {
        deviceAchievementCount: achievementIds.length,
        accountAchievementCount: accountAchievementIds.length,
        deviceCodexCount: codexDiscoveries.length,
        accountCodexCount: accountCodexDiscoveries.length
      });
    if (selectedSource === "account") {
      return {
        selectedSource,
        profile: accountProfile,
        achievementIds: accountAchievementIds,
        codexDiscoveries: accountCodexDiscoveries,
        bindingProtected: bindingOwnedElsewhere
      };
    }
    if (bindingOwnedElsewhere) {
      throw new HttpsError("failed-precondition", "This device save has already been assigned to another pilot account.");
    }
    const now = FieldValue.serverTimestamp();
    tx.set(bindingRef, { uid: auth.uid, bindingHash, assignedAt: bindingSnap.exists ? bindingSnap.data().assignedAt : now, updatedAt: now });
    tx.set(privateRef, {
      ...selectedProfile,
      codexDiscoveries,
      progressionSource: "device_replacement",
      progressionSelectedAt: now,
      createdAt: privateSnap.exists && privateSnap.data().createdAt ? privateSnap.data().createdAt : now,
      updatedAt: now
    });
    tx.set(achievementStateRef, {
      ids: achievementIds,
      count: achievementIds.length,
      schemaVersion: 2,
      sourceCount: achievementIds.length,
      updatedAt: now
    });
    return {
      selectedSource: "device",
      profile: { ...selectedProfile, codexDiscoveries },
      achievementIds,
      codexDiscoveries,
      bindingProtected: false
    };
  });
  return {
    ok: true,
    choice,
    selectedSource: resolution.selectedSource,
    bindingProtected: resolution.bindingProtected,
    accountProgression: clientProfile(resolution.profile),
    achievementIds: resolution.achievementIds,
    codexDiscoveries: resolution.codexDiscoveries,
    release: BACKEND_RELEASE_IDENTITY
  };
});

exports.startVerifiedRun = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  requirePayloadWithin(request.data, 256);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "startVerifiedRun",
    uid: auth.uid,
    maximumCalls: 12,
    windowMs: 60000
  });
  const nowMs = Date.now();
  const rootRef = db.doc(`verified_run_sessions/${auth.uid}`);
  const proposedRef = rootRef.collection("verified_sessions").doc();
  const session = await db.runTransaction(async (tx) => {
    const rootSnap = await tx.get(rootRef);
    const root = rootSnap.exists ? rootSnap.data() : {};
    const activeId = safeDocId(root.activeSessionId, "");
    if (activeId && Number(root.activeExpiresAtMs || 0) > nowMs) {
      const activeSnap = await tx.get(rootRef.collection("verified_sessions").doc(activeId));
      const reusable = activeSnap.exists ? reusableVerifiedRunSession(root, activeSnap.data(), nowMs) : null;
      if (reusable) return reusable;
    }
    const created = {
      id: proposedRef.id,
      challenge: crypto.randomBytes(16).toString("hex"),
      startedAtMs: nowMs,
      expiresAtMs: nowMs + TRUSTED_RUN_MAX_DURATION_MS
    };
    tx.set(proposedRef, {
      uid: auth.uid,
      sessionId: created.id,
      challenge: created.challenge,
      status: "active",
      startedAtMs: created.startedAtMs,
      expiresAtMs: created.expiresAtMs,
      clientVersion: safeText(request.data && request.data.clientVersion, "web-v1", 30),
      createdAt: FieldValue.serverTimestamp()
    });
    tx.set(rootRef, {
      uid: auth.uid,
      activeSessionId: created.id,
      activeExpiresAtMs: created.expiresAtMs,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return created;
  });
  return {
    ok: true,
    session,
    release: BACKEND_RELEASE_IDENTITY
  };
});

exports.submitRunReceipt = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  requirePayloadWithin(request.data, 524288);
  const auth = authContext(request);
  await enforceUidThrottle(db, {
    endpoint: "submitRunReceipt",
    uid: auth.uid,
    maximumCalls: 8,
    windowMs: 60000
  });
  const uid = auth.uid;
  const evidence = request.data && request.data.evidence && typeof request.data.evidence === "object"
    ? request.data.evidence
    : {};
  const sessionId = safeDocId(evidence.sessionId, "");
  if (!sessionId) throw new HttpsError("invalid-argument", "A verified run session is required.");
  const sessionRef = db.doc(`verified_run_sessions/${uid}/verified_sessions/${sessionId}`);
  const publicRef = db.doc(`players_public/${uid}`);
  const privateRef = db.doc(`players_private/${uid}`);
  const worldRecordRef = db.doc(`world_records/${uid}`);
  const receiptRef = db.doc(`run_receipts/${uid}/items/${sessionId}`);
  const achievementStateRef = db.doc(`player_achievement_state/${uid}`);
  const currentWeek = weekWindow();
  const enrollmentRef = db.doc(`weekly_enrollments/${currentWeek.id}_${uid}`);
  const submission = await db.runTransaction(async (tx) => {
    const [sessionSnap, publicSnap, privateSnap, worldRecordSnap, enrollmentSnap, achievementStateSnap] = await Promise.all([
      tx.get(sessionRef), tx.get(publicRef), tx.get(privateRef), tx.get(worldRecordRef), tx.get(enrollmentRef), tx.get(achievementStateRef)
    ]);
    if (!sessionSnap.exists) throw new HttpsError("not-found", "Verified run session not found.");
    const session = sessionSnap.data();
    if (session.status === "submitted" && session.result) {
      return { ...session.result, alreadyProcessed: true };
    }
    const validation = validateTrustedRunSubmission(session, evidence, Date.now());
    if (!validation.ok) throw new HttpsError("failed-precondition", `Verified run rejected: ${validation.reason}.`, { reason: validation.reason });
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Activate pilot identity before publishing a verified run.");
    const run = sanitizeRunReceipt({ ...validation.run, clientReceiptId: sessionId, clientVersion: session.clientVersion });
    const publicData = publicSnap.data();
    const previousProfile = normalizeProfile(privateSnap.exists ? privateSnap.data() : {});
    const nextProfile = applyRunToProfile(previousProfile, run);
    const accountProgression = clientProfile(nextProfile);
    const existingWorld = worldRecordSnap.exists ? worldRecordSnap.data() : {};
    // The public identity document and dedicated record document are both
    // historical server-owned stores. Never let a partially migrated record
    // lower either verified maximum when a new receipt is accepted.
    const verifiedBestScore = Math.max(
      Number(existingWorld.verifiedBestScore || 0),
      Number(publicData.verifiedBestScore || 0),
      run.score
    );
    const verifiedPhase = Math.max(
      Number(existingWorld.verifiedPhase || 1),
      Number(publicData.verifiedPhase || 1),
      run.phaseReached
    );
    const flightPoints = Math.min(999999999, Math.floor(run.score / 10));
    let leagueId = enrollmentSnap.exists ? String(enrollmentSnap.data().leagueId || "") : "";
    let weeklyPoints = 0;
    let memberRef = null;
    let memberSnap = null;
    if (leagueId) {
      memberRef = db.doc(`weekly_leagues/${leagueId}/members/${uid}`);
      memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) leagueId = "";
    }
    if (leagueId && memberRef && memberSnap) weeklyPoints = Math.max(Number(memberSnap.data().weeklyPoints || 0), flightPoints);
    const now = FieldValue.serverTimestamp();
    tx.set(privateRef, {
      ...normalizeProfile(nextProfile),
      updatedAt: now
    }, { merge: true });
    tx.set(receiptRef, {
      receiptId: sessionId,
      uid,
      publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(uid)),
      score: run.score,
      flightPoints,
      phaseReached: run.phaseReached,
      runDurationMs: run.runDurationMs,
      clientVersion: run.clientVersion,
      recordTrust: "verified_run_session",
      submittedAt: now
    });
    tx.set(worldRecordRef, {
      publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(uid)),
      callSign: safeCallSign(publicData.callSign) || neutralPilotCallSign(uid),
      handle: normalizeHandle(publicData.handle || ""),
      verifiedBestScore,
      verifiedPhase,
      recordTrust: "verified_run_session",
      updatedAt: now,
      createdAt: existingWorld.createdAt || now
    }, { merge: true });
    tx.update(publicRef, { verifiedBestScore, verifiedPhase, recordTrust: "verified_run_session", updatedAt: now });
    if (leagueId && memberRef && memberSnap) {
      tx.update(memberRef, {
        publicPilotId: String(publicData.publicPilotId || publicPilotIdFor(uid)),
        callSign: safeCallSign(publicData.callSign) || neutralPilotCallSign(uid),
        handle: normalizeHandle(publicData.handle || ""),
        weeklyPoints,
        bestRunScore: Math.max(Number(memberSnap.data().bestRunScore || 0), run.score),
        recordTrust: "verified_run_session",
        updatedAt: now
      });
      const weeklyReceiptRef = db.doc(`weekly_run_receipts/${currentWeek.id}/members/${uid}/items/${sessionId}`);
      tx.set(weeklyReceiptRef, {
        receiptId: sessionId,
        uid,
        score: run.score,
        flightPoints,
        recordTrust: "verified_run_session",
        submittedAt: now
      });
    }
    const priorAchievementIds = Array.isArray(achievementStateSnap.data() && achievementStateSnap.data().ids)
      ? achievementStateSnap.data().ids
      : [];
    const achievementIds = Array.from(new Set([...priorAchievementIds, ...nextProfile.earnedAchievementIds])).slice(0, ACHIEVEMENTS.length);
    tx.set(achievementStateRef, {
      ids: achievementIds,
      count: achievementIds.length,
      schemaVersion: 2,
      sourceCount: achievementIds.length,
      updatedAt: now
    }, { merge: true });
    for (const achievementId of nextProfile.earnedAchievementIds) {
      tx.set(db.doc(`player_achievements/${uid}/items/${safeDocId(achievementId)}`), {
        achievementId,
        unlockedAt: now,
        source: "verified_run_session"
      }, { merge: true });
    }
    const result = { leagueId, weeklyPoints, score: run.score, verifiedBestScore, accountProgression };
    tx.update(sessionRef, { status: "submitted", submittedAt: now, result });
    tx.set(db.doc(`verified_run_sessions/${uid}`), {
      activeSessionId: FieldValue.delete(),
      activeExpiresAtMs: FieldValue.delete(),
      updatedAt: now
    }, { merge: true });
    return { ...result, alreadyProcessed: false };
  });
  return {
    ok: true,
    ...submission,
    mode: "verified_world_records",
    league: submission.leagueId ? await leagueResponse(submission.leagueId) : null,
    release: BACKEND_RELEASE_IDENTITY
  };
});

exports.claimSeasonReward = onCall(CALLABLE_OPTIONS, async (request) => {
  throw new HttpsError(
    "failed-precondition",
    "Season Road is retired. Glory Road is the only progression road.",
    { retired: true, release: BACKEND_RELEASE_IDENTITY }
  );
});

// Defense in depth for any future authoritative-run implementation: abandoned
// sessions never become an unbounded collection. The public gates remain
// closed until a server-authoritative verifier exists.
exports.purgeExpiredVerifiedRunSessions = onSchedule({
  region: REGION,
  schedule: "every 6 hours",
  timeoutSeconds: 300,
  memory: "256MiB"
}, async () => {
  await deleteQueryDocuments(
    db.collectionGroup("verified_sessions").where("expiresAtMs", "<=", Date.now())
  );
});

async function deleteQueryDocuments(query) {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return deleted;
    const batch = db.batch();
    for (const documentSnapshot of snapshot.docs) batch.delete(documentSnapshot.ref);
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) return deleted;
  }
}

async function purgePilotAccount(uid) {
  const publicRef = db.doc(`players_public/${uid}`);
  const [publicSnap, enrollmentSnaps] = await Promise.all([
    publicRef.get(),
    db.collection("weekly_enrollments").where("uid", "==", uid).get()
  ]);
  const handle = publicSnap.exists ? normalizeHandle(publicSnap.data().handle || "") : "";
  const recursiveRefs = [
    db.doc(`players_private/${uid}`),
    publicRef,
    db.doc(`leaderboard_scores/${uid}`),
    db.doc(`world_records/${uid}`),
    db.doc(`player_achievements/${uid}`),
    db.doc(`player_achievement_state/${uid}`),
    db.doc(`run_receipts/${uid}`),
    db.doc(`verified_run_sessions/${uid}`),
    db.doc(`season_reward_claims/${uid}`)
  ];
  for (const enrollment of enrollmentSnaps.docs) {
    const data = enrollment.data();
    const leagueId = String(data.leagueId || "");
    const weekId = String(data.weekId || "");
    if (weekId) recursiveRefs.push(db.doc(`weekly_run_receipts/${weekId}/members/${uid}`));
  }
  for (const enrollment of enrollmentSnaps.docs) {
    const leagueId = String(enrollment.data().leagueId || "");
    if (!leagueId) continue;
    const leagueRef = db.doc(`weekly_leagues/${leagueId}`);
    const memberRef = leagueRef.collection("members").doc(uid);
    await db.runTransaction(async (tx) => {
      const [leagueSnap, memberSnap] = await Promise.all([tx.get(leagueRef), tx.get(memberRef)]);
      if (!memberSnap.exists) return;
      tx.delete(memberRef);
      if (leagueSnap.exists) {
        tx.update(leagueRef, {
          memberCount: Math.max(0, Number(leagueSnap.data().memberCount || 0) - 1),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });
  }
  for (const ref of recursiveRefs) await db.recursiveDelete(ref);
  await Promise.all([
    deleteQueryDocuments(db.collection("weekly_enrollments").where("uid", "==", uid)),
    deleteQueryDocuments(db.collection("device_progress_bindings").where("uid", "==", uid)),
    deleteQueryDocuments(db.collection("callable_rate_limits").where("uid", "==", uid))
  ]);
  if (handle) {
    const handleRef = db.doc(`handle_registry/${handle}`);
    const handleSnap = await handleRef.get();
    if (handleSnap.exists && handleSnap.data().uid === uid) await handleRef.delete();
  }
  try { await admin.auth().deleteUser(uid); } catch (error) {
    if (error && error.code !== "auth/user-not-found") throw error;
  }
  await db.doc(`account_deletion_requests/${uid}`).delete();
}

exports.purgeExpiredAccounts = onSchedule({ region: REGION, schedule: "every 60 minutes", timeoutSeconds: 540, memory: "512MiB" }, async () => {
  const nowMs = Date.now();
  const pending = await db.collection("account_deletion_requests")
    .where("status", "==", "pending")
    .where("deletesAfterMs", "<=", nowMs)
    .limit(20)
    .get();
  for (const requestSnapshot of pending.docs) await purgePilotAccount(requestSnapshot.id);
});

exports._test = Object.freeze({ purgePilotAccount });
