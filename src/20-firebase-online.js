const FIREBASE_SDK_VERSION = "11.10.0";
const FIREBASE_CONFIG_CANDIDATES = [
  "/__/firebase/init.json",
  "src/firebase-config.local.json"
];

let app = null;
let auth = null;
let db = null;
let functionsApi = null;
let leaderboardUnsubscribe = null;

const GLORY_RANK_NAMES = [
  "Rookie Pilot",
  "Star Cadet",
  "Strike Pilot",
  "Void Runner",
  "Ace",
  "Elite Ace",
  "Phantom Hunter",
  "Wraithbreaker",
  "Solar Legend",
  "Star Eternal"
];

const online = {
  ready: false,
  user: null,
  profileCallSign: "",
  profileHandle: "",
  profileMeta: null,
  weeklyLeague: null,
  competitionBackend: "unknown",
  leaderboard: [],
  achievements: [],
  lastStatus: "Connecting Firebase...",
  lastError: ""
};

function clonePublicUser(user) {
  if (!user) return null;
  return { uid: user.uid };
}

function getState() {
  return {
    ready: online.ready,
    user: clonePublicUser(online.user),
    profileCallSign: online.profileCallSign,
    profileHandle: online.profileHandle,
    profileMeta: online.profileMeta ? { ...online.profileMeta } : null,
    weeklyLeague: online.weeklyLeague ? {
      ...online.weeklyLeague,
      members: Array.isArray(online.weeklyLeague.members) ? online.weeklyLeague.members.map((member) => ({ ...member })) : []
    } : null,
    competitionBackend: online.competitionBackend,
    leaderboard: online.leaderboard.map((row) => ({ ...row })),
    achievements: online.achievements.slice(),
    lastStatus: online.lastStatus,
    lastError: online.lastError
  };
}

function setStatus(message) {
  online.lastStatus = message || "";
  online.lastError = "";
}

function setError(error, fallback = "Firebase sync failed.") {
  const message = error && error.message ? error.message : fallback;
  online.lastError = String(message).replace(/^Firebase:\s*/i, "").slice(0, 120);
}

function setCompetitionBackendUnavailable(_error, fallback = "Competition services are unavailable.") {
  online.competitionBackend = "unavailable";
  online.lastError = String(fallback).slice(0, 120);
}

function notify(message) {
  if (typeof window.showMessage === "function") window.showMessage(message, 90);
}

async function loadFirebaseConfig() {
  if (window.STAR_STRIKE_FIREBASE_CONFIG && window.STAR_STRIKE_FIREBASE_CONFIG.apiKey) {
    return { ...window.STAR_STRIKE_FIREBASE_CONFIG };
  }
  for (const url of FIREBASE_CONFIG_CANDIDATES) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const config = await response.json();
      if (config && config.apiKey && config.projectId) return config;
    } catch {}
  }
  throw new Error("Firebase config is not configured.");
}

function safeText(value, fallback, maxLength) {
  const text = String(value || fallback || "")
    .replace(/[^\w .'-]/g, "")
    .trim();
  return text.slice(0, maxLength);
}

function safeCallSign(value) {
  if (typeof window.sanitizeCallSign === "function") {
    return window.sanitizeCallSign(value || "");
  }
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 12);
}

function safeHandle(value) {
  return typeof window.normalizePublicHandle === "function"
    ? window.normalizePublicHandle(value || "")
    : String(value || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16);
}

function safeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^https?:\/\//i.test(text)) return "";
  return text.slice(0, 300);
}

function safeEmail(value) {
  return String(value || "")
    .replace(/[^\w.@+-]/g, "")
    .slice(0, 120);
}

function numberOrZero(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function boundedNumber(value, max) {
  return Math.min(numberOrZero(value), max);
}

function safeId(value, fallback = "item") {
  const text = String(value || fallback)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 40);
  return text || fallback;
}

function safeGloryRank(value) {
  const text = String(value || "");
  return GLORY_RANK_NAMES.includes(text) ? text : GLORY_RANK_NAMES[0];
}

function safeGloryRankIndex(value, rankName = "") {
  const n = numberOrZero(value);
  if (n >= 0 && n < GLORY_RANK_NAMES.length) return n;
  const idx = GLORY_RANK_NAMES.indexOf(rankName);
  return idx >= 0 ? idx : 0;
}

function gloryRankNameForIndex(index) {
  return GLORY_RANK_NAMES[Math.max(0, Math.min(GLORY_RANK_NAMES.length - 1, numberOrZero(index)))] || GLORY_RANK_NAMES[0];
}

function localMetaSnapshot() {
  if (typeof window.currentMetaSnapshot === "function") return window.currentMetaSnapshot();
  return null;
}

function normalizeMetaSnapshot(meta) {
  const rankName = safeGloryRank(meta && meta.gloryRank);
  return {
    totalGlory: boundedNumber(meta && meta.totalGlory, 999999999),
    gloryRank: rankName,
    gloryRankIndex: safeGloryRankIndex(meta && meta.gloryRankIndex, rankName),
    seasonId: safeId(meta && meta.seasonId, "season_01"),
    seasonName: safeText(meta && meta.seasonName, "Launch Flight", 60),
    seasonXP: boundedNumber(meta && meta.seasonXP, 999999999),
    seasonTier: Math.max(1, Math.min(50, numberOrZero(meta && meta.seasonTier) || 1)),
    seasonClaimedRewardIds: Array.isArray(meta && meta.seasonClaimedRewardIds)
      ? meta.seasonClaimedRewardIds.map((id) => safeId(id, "")).filter(Boolean).slice(0, 220)
      : [],
    credits: boundedNumber(meta && meta.credits, 999999999),
    lifetime: {
      runs: boundedNumber(meta && meta.lifetime && meta.lifetime.runs, 1000000),
      score: boundedNumber(meta && meta.lifetime && meta.lifetime.score, 999999999),
      kills: boundedNumber(meta && meta.lifetime && meta.lifetime.kills, 1000000),
      powerups: boundedNumber(meta && meta.lifetime && meta.lifetime.powerups, 1000000),
      ghostUses: boundedNumber(meta && meta.lifetime && meta.lifetime.ghostUses, 1000000),
      bosses: boundedNumber(meta && meta.lifetime && meta.lifetime.bosses, 1000000),
      damageTaken: boundedNumber(meta && meta.lifetime && meta.lifetime.damageTaken, 1000000),
      highestCombo: boundedNumber(meta && meta.lifetime && meta.lifetime.highestCombo, 1000000),
      bestScore: boundedNumber(meta && meta.lifetime && meta.lifetime.bestScore, 999999999),
      bestPhase: Math.max(1, boundedNumber(meta && meta.lifetime && meta.lifetime.bestPhase, 9999) || 1)
    }
  };
}

function normalizeRunMeta(meta) {
  const rankName = safeGloryRank(meta && meta.rankAfter);
  return {
    gloryGained: boundedNumber(meta && meta.gloryGained, 999999999),
    gloryAfter: boundedNumber(meta && meta.gloryAfter, 999999999),
    seasonXPGained: boundedNumber(meta && meta.seasonXPGained, 2500),
    creditsEarned: boundedNumber(meta && meta.creditsEarned, 1500),
    rankAfter: rankName,
    rankIndexAfter: safeGloryRankIndex(meta && meta.rankIndexAfter, rankName),
    seasonTier: Math.max(1, Math.min(50, numberOrZero(meta && meta.seasonTier) || 1))
  };
}

function achievementDefinitions() {
  if (typeof window.getAchievementDefinitions === "function") return window.getAchievementDefinitions();
  return [];
}

function achievementTitle(id) {
  const item = achievementDefinitions().find((achievement) => achievement.id === id);
  return safeText(item ? item.name : id, "Achievement", 40);
}

function knownAchievementIds() {
  return new Set(achievementDefinitions().map((achievement) => achievement.id));
}

function normalizeRun(run) {
  const validAchievements = knownAchievementIds();
  const rawAchievements = Array.isArray(run && run.achievements) ? run.achievements : [];
  const meta = normalizeMetaSnapshot(run && run.meta);
  const runMeta = normalizeRunMeta(run && run.runMeta);
  const rawReceipt = run && run.receipt ? run.receipt : {};
  const score = numberOrZero(run && run.score);
  const phase = Math.max(1, numberOrZero(run && (run.phaseReached || run.phase)) || 1);
  const receipt = {
    clientReceiptId: safeId(rawReceipt.receiptId, "local_receipt"),
    score: boundedNumber(rawReceipt.score || score, 999999999),
    phaseReached: Math.max(1, boundedNumber(rawReceipt.phaseReached || phase, 9999) || 1),
    runDurationMs: boundedNumber(rawReceipt.runDurationMs, 86400000),
    enemiesKilled: boundedNumber(rawReceipt.enemiesKilled, 1000000),
    bossesKilled: boundedNumber(rawReceipt.bossesKilled, 1000000),
    powerupsCollected: boundedNumber(rawReceipt.powerupsCollected, 1000000),
    ghostUses: boundedNumber(rawReceipt.ghostUses, 1000000),
    damageTaken: boundedNumber(rawReceipt.damageTaken, 1000000),
    highestCombo: boundedNumber(rawReceipt.highestCombo, 1000000),
    gloryGained: runMeta.gloryGained || Math.floor(score / 10),
    seasonXPGained: runMeta.seasonXPGained,
    creditsEarned: runMeta.creditsEarned,
    clientVersion: safeText(rawReceipt.clientVersion || (run && run.clientVersion), "web-v1", 20),
    endedAtMs: boundedNumber(rawReceipt.endedAtMs || (run && run.completedAtMs), 9999999999999)
  };
  return {
    score,
    highScore: numberOrZero(run && run.highScore),
    phase,
    callSign: safeCallSign(run && run.callSign),
    stats: {
      kills: numberOrZero(run && run.stats && run.stats.kills),
      powerups: numberOrZero(run && run.stats && run.stats.powerups),
      ghostUses: numberOrZero(run && run.stats && run.stats.ghostUses),
      bosses: numberOrZero(run && run.stats && run.stats.bosses),
      damageTaken: numberOrZero(run && run.stats && run.stats.damageTaken),
      highestCombo: numberOrZero(run && run.stats && run.stats.highestCombo),
      runDurationMs: boundedNumber(run && run.stats && run.stats.runDurationMs, 86400000)
    },
    meta,
    runMeta,
    receipt,
    achievements: rawAchievements.filter((id) => validAchievements.has(id))
  };
}

async function syncProfile(callSignOverride = "") {
  if (!auth || !auth.currentUser || !functionsApi || !window.starStrikeFirebaseApi) return null;
  try {
    const syncPilotProfile = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "syncPilotProfile");
    const response = await syncPilotProfile({ callSign: safeCallSign(callSignOverride || online.profileCallSign) });
    const result = response && response.data ? response.data : {};
    online.profileCallSign = safeCallSign(result.callSign || callSignOverride || online.profileCallSign);
    online.profileHandle = safeHandle(result.handle || "");
    online.competitionBackend = "ready";
    applyServerProfile(result.profile);
    setStatus("Profile synced.");
    return result;
  } catch (error) {
    online.profileCallSign = safeCallSign(callSignOverride || online.profileCallSign);
    setCompetitionBackendUnavailable(error, "Competition services are awaiting deployment. Local play remains available.");
    return { ok: false, unavailable: true, callSign: online.profileCallSign };
  }
}

function applyLeaderboardSnapshot(snapshot) {
  online.leaderboard = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const candidate = {
      uid: data.uid || docSnapshot.id,
      callSign: safeCallSign(data.callSign || ""),
      handle: safeHandle(data.handle || ""),
      bestScore: numberOrZero(data.bestScore),
      phase: Math.max(1, numberOrZero(data.phase) || 1),
      achievementsCount: numberOrZero(data.achievementsCount),
      glory: numberOrZero(data.glory),
      gloryRank: safeGloryRank(data.gloryRank),
      gloryRankIndex: safeGloryRankIndex(data.gloryRankIndex, data.gloryRank),
      seasonTier: Math.max(1, numberOrZero(data.seasonTier) || 1)
    };
    return typeof window.publicPilotRecord === "function" ? window.publicPilotRecord(candidate) : candidate;
  });
}

async function updateCallSign(callSign) {
  const validation = typeof window.validateCallSign === "function"
    ? window.validateCallSign(callSign)
    : { ok: safeCallSign(callSign).length >= 3, callSign: safeCallSign(callSign) };
  if (!validation.ok) throw new Error(validation.message || "Call sign must be 3-12 characters.");
  const normalized = validation.callSign;
  online.profileCallSign = normalized;
  if (!online.ready || !auth || !auth.currentUser) {
    setStatus("Call sign saved locally. Sign in to sync it.");
    return { ok: true, localOnly: true, callSign: normalized };
  }
  const syncResult = await syncProfile(normalized);
  subscribeLeaderboard();
  return { ok: true, localOnly: !!(syncResult && syncResult.unavailable), callSign: normalized };
}

async function joinWeeklyLeague() {
  if (!online.ready || !auth || !auth.currentUser || !functionsApi || !window.starStrikeFirebaseApi) {
    setStatus("Sign in to enter a weekly league.");
    return { ok: false, reason: "signed_out" };
  }
  if (online.competitionBackend === "unavailable") {
    setStatus("Competition services are awaiting deployment.");
    return { ok: false, reason: "unavailable", message: online.lastStatus };
  }
  try {
    const join = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "joinWeeklyLeague");
    const response = await join({});
    const result = response && response.data ? response.data : {};
    online.competitionBackend = "ready";
    online.weeklyLeague = result.league || null;
    setStatus(online.weeklyLeague ? "Weekly standings refreshed." : "Weekly league unavailable.");
    return result;
  } catch (error) {
    setCompetitionBackendUnavailable(error, "Competition services are awaiting deployment.");
    return { ok: false, reason: "unavailable", message: online.lastError };
  }
}

async function claimHandle(handle) {
  const validation = typeof window.validatePublicHandle === "function"
    ? window.validatePublicHandle(handle)
    : { ok: false, handle: "", message: "Handle validation unavailable." };
  if (!validation.ok) throw new Error(validation.message || "Invalid handle.");
  if (!online.ready || !auth || !auth.currentUser || !functionsApi || !window.starStrikeFirebaseApi) throw new Error("Sign in to claim a handle.");
  if (online.competitionBackend === "unavailable") throw new Error("Competition services are awaiting deployment.");
  try {
    const claim = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "claimPilotHandle");
    const response = await claim({ handle: validation.handle });
    const result = response && response.data ? response.data : {};
    online.profileHandle = safeHandle(result.handle);
    online.competitionBackend = "ready";
    setStatus(`@${online.profileHandle} is account-bound.`);
    await joinWeeklyLeague();
    subscribeLeaderboard();
    return { ok: true, handle: online.profileHandle };
  } catch (error) {
    setCompetitionBackendUnavailable(error, "Competition services are awaiting deployment.");
    throw new Error(online.lastError);
  }
}

function subscribeLeaderboard() {
  if (!db || !auth || !auth.currentUser) return;
  const { collection, limit, onSnapshot, orderBy, query } = window.starStrikeFirebaseApi;
  if (leaderboardUnsubscribe) leaderboardUnsubscribe();
  const leaderboardQuery = query(
    collection(db, "leaderboard_scores"),
    orderBy("bestScore", "desc"),
    limit(10)
  );
  leaderboardUnsubscribe = onSnapshot(
    leaderboardQuery,
    (snapshot) => {
      applyLeaderboardSnapshot(snapshot);
      setStatus(online.user ? "World records loaded." : "Sign in to load records.");
    },
    (error) => setError(error, "Could not load world records.")
  );
}

async function loadAchievements() {
  if (!db || !auth || !auth.currentUser) {
    online.achievements = [];
    return;
  }
  const { collection, getDocs } = window.starStrikeFirebaseApi;
  const uid = auth.currentUser.uid;
  const snapshot = await getDocs(collection(db, "player_achievements", uid, "items"));
  const order = new Map(achievementDefinitions().map((item, index) => [item.id, index]));
  online.achievements = snapshot.docs
    .map((docSnapshot) => docSnapshot.id)
    .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

async function refresh() {
  if (!online.ready || !auth || !db) {
    setStatus("Firebase is still connecting.");
    return;
  }
  if (!auth.currentUser) {
    setStatus("Sign in to load records.");
    return;
  }
  try {
    await syncProfile(online.profileCallSign);
    if (online.profileHandle) await joinWeeklyLeague();
    await loadAchievements();
    subscribeLeaderboard();
    notify("ONLINE REFRESHED");
  } catch (error) {
    setError(error, "Refresh failed.");
    notify("ONLINE SYNC FAILED");
  }
}

async function signIn(callSignOverride = "") {
  if (!online.ready || !auth) {
    setStatus("Firebase is still connecting.");
    return;
  }
  const { GoogleAuthProvider, signInWithPopup } = window.starStrikeFirebaseApi;
  try {
    online.profileCallSign = safeCallSign(callSignOverride || online.profileCallSign);
    if (!auth.currentUser) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    }
    await syncProfile(online.profileCallSign);
    if (online.profileHandle) await joinWeeklyLeague();
    await loadAchievements();
    subscribeLeaderboard();
    notify("SIGNED IN");
  } catch (error) {
    setError(error, "Sign-in failed.");
    notify("SIGN IN FAILED");
  }
}

async function signOutOnline() {
  if (!auth || !window.starStrikeFirebaseApi) return;
  try {
    if (leaderboardUnsubscribe) {
      leaderboardUnsubscribe();
      leaderboardUnsubscribe = null;
    }
    const { signOut } = window.starStrikeFirebaseApi;
    await signOut(auth);
    online.user = null;
    online.profileHandle = "";
    online.profileMeta = null;
    online.weeklyLeague = null;
    online.competitionBackend = "unknown";
    online.achievements = [];
    online.leaderboard = [];
    setStatus("Signed out.");
    notify("SIGNED OUT");
  } catch (error) {
    setError(error, "Sign-out failed.");
    notify("SIGN OUT FAILED");
  }
}

function applyServerProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  const snapshot = typeof window.mergeServerMetaProgress === "function"
    ? window.mergeServerMetaProgress(profile)
    : normalizeMetaSnapshot(profile);
  online.profileMeta = {
    totalGlory: snapshot.totalGlory,
    gloryRank: snapshot.gloryRank,
    gloryRankIndex: snapshot.gloryRankIndex,
    currentSeasonXP: snapshot.seasonXP,
    currentSeasonTier: snapshot.seasonTier,
    seasonClaimedRewardIds: snapshot.seasonClaimedRewardIds || [],
    credits: snapshot.credits
  };
  return snapshot;
}

async function submitRun(rawRun) {
  if (!online.ready || !auth || !db) {
    setStatus("Firebase is still connecting.");
    return;
  }
  if (!auth.currentUser) {
    setStatus("Sign in to sync runs.");
    return;
  }
  const run = normalizeRun(rawRun || {});

  try {
    if (!functionsApi || !window.starStrikeFirebaseApi || typeof window.starStrikeFirebaseApi.httpsCallable !== "function") {
      throw new Error("Cloud Functions are not ready.");
    }
    const submitRunReceipt = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "submitRunReceipt");
    const response = await submitRunReceipt({
      callSign: safeCallSign(run.callSign || online.profileCallSign),
      receipt: {
        clientReceiptId: run.receipt.clientReceiptId,
        score: run.receipt.score,
        phaseReached: run.receipt.phaseReached,
        runDurationMs: run.receipt.runDurationMs,
        enemiesKilled: run.receipt.enemiesKilled,
        bossesKilled: run.receipt.bossesKilled,
        powerupsCollected: run.receipt.powerupsCollected,
        ghostUses: run.receipt.ghostUses,
        damageTaken: run.receipt.damageTaken,
        highestCombo: run.receipt.highestCombo,
        clientVersion: run.receipt.clientVersion
      }
    });
    const result = response && response.data ? response.data : {};
    applyServerProfile(result.profile);
    if (online.weeklyLeague) await joinWeeklyLeague();
    await loadAchievements();
    subscribeLeaderboard();
    const newAchievementIds = Array.isArray(result.newAchievementIds) ? result.newAchievementIds : [];
    setStatus(newAchievementIds.length ? "Server run and achievements synced." : "Server run synced.");
    notify(newAchievementIds.length ? "ACHIEVEMENTS SYNCED" : "RUN SYNCED");
  } catch (error) {
    setError(error, "Run sync failed.");
    notify("ONLINE SYNC FAILED");
  }
}

async function claimSeasonRewardOnline(rewardId) {
  if (!online.ready || !auth || !functionsApi) {
    setStatus("Firebase is still connecting.");
    return { ok: false, reason: "not_ready" };
  }
  if (!auth.currentUser) {
    setStatus("Sign in to claim online rewards.");
    return { ok: false, reason: "signed_out" };
  }
  try {
    const claimSeasonRewardCallable = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "claimSeasonReward");
    const response = await claimSeasonRewardCallable({ rewardId: safeId(rewardId, "") });
    const result = response && response.data ? response.data : {};
    applyServerProfile(result.profile);
    if (result.ok) {
      setStatus("Season reward claimed on server.");
      notify("REWARD CLAIMED");
    } else if (result.reason === "already_claimed") {
      setStatus("Season reward already claimed.");
      notify("ALREADY CLAIMED");
    } else if (result.reason === "locked") {
      setStatus("Season reward is locked.");
      notify("REWARD LOCKED");
    }
    return result;
  } catch (error) {
    setError(error, "Reward claim failed.");
    notify("ONLINE CLAIM FAILED");
    return { ok: false, reason: "error" };
  }
}

window.starStrikeOnline = {
  getState,
  signIn,
  signOut: signOutOnline,
  refresh,
  updateCallSign,
  claimHandle,
  joinWeeklyLeague,
  submitRun,
  claimSeasonReward: claimSeasonRewardOnline
};

async function bootFirebase() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    const [
      appModule,
      authModule,
      firestoreModule,
      functionsModule
    ] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`)
    ]);
    window.starStrikeFirebaseApi = {
      GoogleAuthProvider: authModule.GoogleAuthProvider,
      collection: firestoreModule.collection,
      getDocs: firestoreModule.getDocs,
      getFirestore: firestoreModule.getFirestore,
      getFunctions: functionsModule.getFunctions,
      httpsCallable: functionsModule.httpsCallable,
      limit: firestoreModule.limit,
      onAuthStateChanged: authModule.onAuthStateChanged,
      onSnapshot: firestoreModule.onSnapshot,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      signInWithPopup: authModule.signInWithPopup,
      signOut: authModule.signOut
    };
    app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    functionsApi = functionsModule.getFunctions(app, "us-central1");
    online.ready = true;
    setStatus("Firebase connected.");
    authModule.onAuthStateChanged(auth, async (user) => {
      online.user = user || null;
      online.lastError = "";
      if (!user) {
        online.achievements = [];
        online.leaderboard = [];
        online.profileHandle = "";
        online.profileMeta = null;
        online.weeklyLeague = null;
        online.competitionBackend = "unknown";
        setStatus("Sign in to sync records.");
        return;
      }
      try {
        await syncProfile(online.profileCallSign || "");
        if (online.profileHandle) await joinWeeklyLeague();
        await loadAchievements();
        subscribeLeaderboard();
      } catch (error) {
        setError(error, "Account sync failed.");
      }
    });
  } catch (error) {
    online.ready = false;
    setError(error, "Firebase failed to load.");
  }
}

bootFirebase();
