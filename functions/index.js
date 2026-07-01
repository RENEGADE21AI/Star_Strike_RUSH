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

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const REGION = "us-central1";

function safeEmail(value) {
  return String(value || "")
    .replace(/[^\w.@+-]/g, "")
    .slice(0, 120);
}

function authContext(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }
  const token = request.auth.token || {};
  return {
    uid: request.auth.uid,
    email: safeEmail(token.email || ""),
    displayName: safeText(token.name || "", "Pilot", 60),
    photoURL: String(token.picture || "").slice(0, 300)
  };
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
    email: auth.email,
    displayName: auth.displayName,
    photoURL: auth.photoURL,
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
  return {
    uid: auth.uid,
    displayName: auth.displayName,
    callSign: safeCallSign(callSign || existing.callSign || ""),
    photoURL: auth.photoURL,
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

exports.submitRunReceipt = onCall({ region: REGION }, async (request) => {
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
  const achievementRefs = ACHIEVEMENTS.map((achievement) => ({
    achievement,
    ref: db.doc(`player_achievements/${uid}/items/${achievement.id}`)
  }));

  return db.runTransaction(async (tx) => {
    const [privateSnap, publicSnap, leaderboardSnap, receiptSnap, ...achievementSnaps] = await Promise.all([
      tx.get(privateRef),
      tx.get(publicRef),
      tx.get(leaderboardRef),
      tx.get(receiptRef),
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
    tx.set(publicRef, publicPayload, { merge: true });
    tx.set(leaderboardRef, publicPayload, { merge: true });
    tx.create(receiptRef, receiptPayload);
    for (const item of newAchievementRefs) {
      tx.set(item.ref, {
        uid,
        achievementId: item.achievement.id,
        title: achievementTitle(item.achievement.id),
        unlockedAt: FieldValue.serverTimestamp()
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

exports.claimSeasonReward = onCall({ region: REGION }, async (request) => {
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
    tx.set(publicRef, publicPayload, { merge: true });
    tx.set(leaderboardRef, publicPayload, { merge: true });
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
