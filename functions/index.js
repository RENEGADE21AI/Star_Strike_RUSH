const admin = require("firebase-admin");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

const {
  ACHIEVEMENTS,
  CURRENT_SEASON_ID,
  achievementTitle,
  applyRunToProfile,
  applySeasonRewardToProfile,
  normalizeProfile,
  publicProfileFromPrivate,
  rankForGlory,
  safeCallSign,
  safeDocId,
  safeText,
  sanitizeRunReceipt,
  validateRunPlausibility
} = require("./progression");
const {
  divisionName,
  competitionWritesEnabled,
  normalizeHandle,
  performanceBand,
  publicLeagueMember,
  requireCompetitionEnabled,
  validateHandle,
  weekWindow
} = require("./competition");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const REGION = "us-central1";
const CALLABLE_OPTIONS = Object.freeze({
  region: REGION,
  maxInstances: 10,
  concurrency: 40,
  timeoutSeconds: 30,
  memory: "256MiB"
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
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }
  return { uid: request.auth.uid };
}

function profileFromSnapshots(privateSnap, publicSnap, leaderboardSnap) {
  const privateData = privateSnap.exists ? privateSnap.data() : {};
  const publicData = publicSnap.exists ? publicSnap.data() : {};
  const leaderboardData = leaderboardSnap && leaderboardSnap.exists ? leaderboardSnap.data() : {};
  return normalizeProfile({
    ...privateData,
    bestScore: Math.max(Number(publicData.bestScore || 0), Number(leaderboardData.bestScore || 0)),
    phase: Math.max(Number(publicData.phase || 1), Number(leaderboardData.phase || 1)),
    seasonClaimedRewardIds: privateData.seasonClaimedRewardIds || []
  });
}

function privatePayloadFor(auth, profile, existing = {}) {
  const rank = rankForGlory(profile.glory);
  const now = FieldValue.serverTimestamp();
  return {
    uid: auth.uid,
    email: FieldValue.delete(),
    displayName: FieldValue.delete(),
    photoURL: FieldValue.delete(),
    glory: profile.glory,
    gloryRank: rank.name,
    gloryRankIndex: rank.index,
    currentSeasonId: CURRENT_SEASON_ID,
    currentSeasonXP: profile.currentSeasonXP,
    currentSeasonTier: profile.currentSeasonTier,
    credits: profile.credits,
    lifetimeRuns: profile.lifetimeRuns,
    lifetimeScore: profile.lifetimeScore,
    lifetimeKills: profile.lifetimeKills,
    lifetimePowerups: profile.lifetimePowerups,
    lifetimeGhostUses: profile.lifetimeGhostUses,
    lifetimeBosses: profile.lifetimeBosses,
    lifetimeDamageTaken: profile.lifetimeDamageTaken,
    highestCombo: profile.highestCombo,
    seasonClaimedRewardIds: profile.seasonClaimedRewardIds || [],
    createdAt: existing.createdAt || now,
    lastSeenAt: now,
    updatedAt: now
  };
}

function publicPayloadFor(auth, profile, callSign, achievementsCount, existing = {}) {
  const rank = rankForGlory(profile.glory);
  const now = FieldValue.serverTimestamp();
  const sanitizedCallSign = safeCallSign(callSign || existing.callSign || "");
  return {
    uid: auth.uid,
    callSign: sanitizedCallSign.length >= 3 ? sanitizedCallSign : neutralPilotCallSign(auth.uid),
    handle: normalizeHandle(existing.handle || ""),
    bestScore: profile.bestScore,
    phase: profile.phase,
    achievementsCount,
    glory: profile.glory,
    gloryRank: rank.name,
    gloryRankIndex: rank.index,
    seasonTier: profile.currentSeasonTier,
    createdAt: existing.createdAt || now,
    updatedAt: now
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
    members: memberSnaps.docs.map((snapshot) => publicLeagueMember(snapshot.data()))
  };
}

exports.syncPilotProfile = onCall(CALLABLE_OPTIONS, async (request) => {
  const auth = authContext(request);
  const requestedCallSign = safeCallSign(request.data && request.data.callSign);
  const privateRef = db.doc(`players_private/${auth.uid}`);
  const publicRef = db.doc(`players_public/${auth.uid}`);
  const leaderboardRef = db.doc(`leaderboard_scores/${auth.uid}`);

  const result = await db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap] = await Promise.all([
      tx.get(privateRef), tx.get(publicRef), tx.get(leaderboardRef)
    ]);
    const profile = profileFromSnapshots(privateSnap, publicSnap, leaderboardSnap);
    const privateData = privateSnap.exists ? privateSnap.data() : {};
    const publicData = publicSnap.exists ? publicSnap.data() : {};
    const achievementsCount = Math.max(
      Number(publicData.achievementsCount || 0),
      Number((leaderboardSnap.exists && leaderboardSnap.data().achievementsCount) || 0)
    );
    const publicPayload = publicPayloadFor(auth, profile, requestedCallSign || publicData.callSign, achievementsCount, publicData);
    tx.set(privateRef, privatePayloadFor(auth, profile, privateData), { merge: true });
    tx.set(publicRef, publicPayload);
    if (competitionWritesEnabled()) tx.set(leaderboardRef, publicPayload);
    return { callSign: publicPayload.callSign, handle: publicPayload.handle, profile: clientProfile(profile) };
  });

  return { ok: true, ...result };
});

exports.claimPilotHandle = onCall(CALLABLE_OPTIONS, async (request) => {
  const auth = authContext(request);
  const validation = validateHandle(request.data && request.data.handle);
  if (!validation.ok) throw new HttpsError("invalid-argument", `Handle is invalid: ${validation.reason}.`);
  const handle = validation.handle;
  const registryRef = db.doc(`handle_registry/${handle}`);
  const publicRef = db.doc(`players_public/${auth.uid}`);
  const leaderboardRef = db.doc(`leaderboard_scores/${auth.uid}`);

  await db.runTransaction(async (tx) => {
    const [registrySnap, publicSnap, leaderboardSnap] = await Promise.all([
      tx.get(registryRef), tx.get(publicRef), tx.get(leaderboardRef)
    ]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Sync your pilot profile before claiming a handle.");
    const current = normalizeHandle(publicSnap.data().handle || "");
    if (current && current !== handle) throw new HttpsError("failed-precondition", "Your handle is already locked to this account.");
    if (registrySnap.exists && registrySnap.data().uid !== auth.uid) throw new HttpsError("already-exists", "That handle is already claimed.");
    const now = FieldValue.serverTimestamp();
    tx.set(registryRef, { uid: auth.uid, handle, claimedAt: registrySnap.exists ? registrySnap.data().claimedAt : now, updatedAt: now });
    tx.update(publicRef, { handle, updatedAt: now });
    if (competitionWritesEnabled() && leaderboardSnap.exists) tx.update(leaderboardRef, { handle, updatedAt: now });
  });

  return { ok: true, handle };
});

exports.joinWeeklyLeague = onCall(CALLABLE_OPTIONS, async (request) => {
  requireCompetitionEnabled();
  const auth = authContext(request);
  const week = weekWindow();
  const publicRef = db.doc(`players_public/${auth.uid}`);
  const enrollmentRef = db.doc(`weekly_enrollments/${week.id}_${auth.uid}`);

  const assignment = await db.runTransaction(async (tx) => {
    const [publicSnap, enrollmentSnap] = await Promise.all([tx.get(publicRef), tx.get(enrollmentRef)]);
    if (!publicSnap.exists) throw new HttpsError("failed-precondition", "Sync your pilot profile before entering a league.");
    const publicData = publicSnap.data();
    const handle = normalizeHandle(publicData.handle || "");
    if (!handle) throw new HttpsError("failed-precondition", "Claim a unique handle before entering a weekly league.");

    if (enrollmentSnap.exists) return { leagueId: enrollmentSnap.data().leagueId };

    const band = performanceBand(publicData.bestScore);
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
      uid: auth.uid,
      callSign: safeCallSign(publicData.callSign) || neutralPilotCallSign(auth.uid),
      handle,
      weeklyPoints: 0,
      previousBestScore: Number(publicData.bestScore || 0),
      joinedAt: now,
      updatedAt: now
    });
    tx.create(enrollmentRef, { uid: auth.uid, weekId: week.id, leagueId: leagueRef.id, joinedAt: now });
    return { leagueId: leagueRef.id };
  });

  return { ok: true, league: await leagueResponse(assignment.leagueId) };
});

function clientProfile(profile) {
  const publicProfile = publicProfileFromPrivate(profile);
  return {
    totalGlory: publicProfile.totalGlory,
    gloryRank: publicProfile.gloryRank,
    gloryRankIndex: publicProfile.gloryRankIndex,
    seasonId: CURRENT_SEASON_ID,
    seasonName: publicProfile.currentSeasonName,
    seasonXP: publicProfile.currentSeasonXP,
    seasonTier: publicProfile.currentSeasonTier,
    seasonClaimedRewardIds: publicProfile.seasonClaimedRewardIds || [],
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
  const auth = authContext(request);
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
  const privateRef = db.doc(`players_private/${uid}`);
  const publicRef = db.doc(`players_public/${uid}`);
  const leaderboardRef = db.doc(`leaderboard_scores/${uid}`);
  const receiptRef = db.doc(`run_receipts/${uid}/items/${receiptId}`);
  const currentWeek = weekWindow();
  const enrollmentRef = db.doc(`weekly_enrollments/${currentWeek.id}_${uid}`);
  const achievementRefs = ACHIEVEMENTS.map((achievement) => ({
    achievement,
    ref: db.doc(`player_achievements/${uid}/items/${achievement.id}`)
  }));

  return db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap, receiptSnap, enrollmentSnap, ...achievementSnaps] = await Promise.all([
      tx.get(privateRef),
      tx.get(publicRef),
      tx.get(leaderboardRef),
      tx.get(receiptRef),
      tx.get(enrollmentRef),
      ...achievementRefs.map((item) => tx.get(item.ref))
    ]);
    const baseProfile = profileFromSnapshots(privateSnap, publicSnap, leaderboardSnap);
    if (receiptSnap.exists) {
      return {
        ok: true,
        alreadyProcessed: true,
        receiptId,
        profile: clientProfile(baseProfile)
      };
    }

    const nextProfile = applyRunToProfile(baseProfile, run);
    const existingAchievementIds = new Set(
      achievementRefs
        .filter((_, index) => achievementSnaps[index] && achievementSnaps[index].exists)
        .map((item) => item.achievement.id)
    );
    const earned = new Set(nextProfile.earnedAchievementIds || []);
    const newAchievementRefs = achievementRefs.filter((item) => earned.has(item.achievement.id) && !existingAchievementIds.has(item.achievement.id));
    const existingPublicCount = Math.max(
      Number((publicSnap.exists && publicSnap.data().achievementsCount) || 0),
      Number((leaderboardSnap.exists && leaderboardSnap.data().achievementsCount) || 0)
    );
    const achievementsCount = Math.min(ACHIEVEMENTS.length, existingPublicCount + newAchievementRefs.length);
    const publicData = publicSnap.exists ? publicSnap.data() : {};
    const privateData = privateSnap.exists ? privateSnap.data() : {};
    const publicPayload = publicPayloadFor(auth, nextProfile, run.callSign, achievementsCount, publicData);
    const privatePayload = privatePayloadFor(auth, nextProfile, privateData);
    let weeklyMemberRef = null;
    let weeklyMemberData = null;
    if (enrollmentSnap.exists && enrollmentSnap.data().leagueId) {
      weeklyMemberRef = db.doc(`weekly_leagues/${enrollmentSnap.data().leagueId}/members/${uid}`);
      const weeklyMemberSnap = await tx.get(weeklyMemberRef);
      if (weeklyMemberSnap.exists) weeklyMemberData = weeklyMemberSnap.data();
    }
    const receiptPayload = {
      uid,
      receiptId,
      clientReceiptId: run.clientReceiptId,
      score: run.score,
      phaseReached: run.phaseReached,
      runDurationMs: run.runDurationMs,
      enemiesKilled: run.enemiesKilled,
      bossesKilled: run.bossesKilled,
      powerupsCollected: run.powerupsCollected,
      ghostUses: run.ghostUses,
      damageTaken: run.damageTaken,
      highestCombo: run.highestCombo,
      gloryGained: nextProfile.grants.gloryGained,
      seasonXPGained: nextProfile.grants.seasonXPGained,
      creditsEarned: nextProfile.grants.creditsEarned,
      clientVersion: run.clientVersion,
      endedAtMs: Date.now(),
      submittedAt: FieldValue.serverTimestamp()
    };

    tx.set(privateRef, privatePayload, { merge: true });
    tx.set(publicRef, publicPayload);
    if (competitionWritesEnabled()) tx.set(leaderboardRef, publicPayload);
    tx.create(receiptRef, receiptPayload);
    for (const item of newAchievementRefs) {
      tx.set(item.ref, {
        uid,
        achievementId: item.achievement.id,
        title: achievementTitle(item.achievement.id),
        unlockedAt: FieldValue.serverTimestamp()
      });
    }
    if (weeklyMemberRef && weeklyMemberData) {
      tx.update(weeklyMemberRef, {
        callSign: publicPayload.callSign,
        handle: publicPayload.handle,
        weeklyPoints: Math.min(999999999, Number(weeklyMemberData.weeklyPoints || 0) + Number(nextProfile.grants.gloryGained || 0)),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    return {
      ok: true,
      alreadyProcessed: false,
      receiptId,
      grants: nextProfile.grants,
      newAchievementIds: newAchievementRefs.map((item) => item.achievement.id),
      profile: clientProfile(nextProfile)
    };
  });
});

exports.claimSeasonReward = onCall(CALLABLE_OPTIONS, async (request) => {
  const auth = authContext(request);
  const rewardId = safeDocId(request.data && request.data.rewardId, "");
  if (!rewardId) throw new HttpsError("invalid-argument", "Reward id is required.");

  const uid = auth.uid;
  const privateRef = db.doc(`players_private/${uid}`);
  const publicRef = db.doc(`players_public/${uid}`);
  const leaderboardRef = db.doc(`leaderboard_scores/${uid}`);
  const claimRef = db.doc(`season_reward_claims/${uid}/items/${rewardId}`);

  return db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap, claimSnap] = await Promise.all([
      tx.get(privateRef),
      tx.get(publicRef),
      tx.get(leaderboardRef),
      tx.get(claimRef)
    ]);
    const baseProfile = profileFromSnapshots(privateSnap, publicSnap, leaderboardSnap);
    if (claimSnap.exists) {
      return {
        ok: false,
        reason: "already_claimed",
        rewardId,
        profile: clientProfile(baseProfile)
      };
    }

    const claim = applySeasonRewardToProfile(baseProfile, rewardId);
    if (!claim.ok) {
      return {
        ok: false,
        reason: claim.reason,
        rewardId,
        profile: clientProfile(claim.profile)
      };
    }

    const publicData = publicSnap.exists ? publicSnap.data() : {};
    const privateData = privateSnap.exists ? privateSnap.data() : {};
    const existingPublicCount = Math.max(
      Number(publicData.achievementsCount || 0),
      Number((leaderboardSnap.exists && leaderboardSnap.data().achievementsCount) || 0)
    );
    const publicPayload = publicPayloadFor(auth, claim.profile, publicData.callSign || "", existingPublicCount, publicData);
    const privatePayload = privatePayloadFor(auth, claim.profile, privateData);

    tx.set(privateRef, privatePayload, { merge: true });
    tx.set(publicRef, publicPayload);
    if (competitionWritesEnabled()) tx.set(leaderboardRef, publicPayload);
    tx.create(claimRef, {
      uid,
      rewardId,
      rewardType: claim.reward.type,
      amount: claim.reward.amount,
      tier: claim.tier,
      lane: claim.lane,
      claimedAt: FieldValue.serverTimestamp()
    });

    return {
      ok: true,
      reason: "claimed",
      rewardId,
      reward: claim.reward,
      profile: clientProfile(claim.profile)
    };
  });
});
