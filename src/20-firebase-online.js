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
  profileMeta: null,
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
    profileMeta: online.profileMeta ? { ...online.profileMeta } : null,
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
  if (!auth || !db || !auth.currentUser) return;
  const { doc, getDoc, serverTimestamp, setDoc } = window.starStrikeFirebaseApi;
  const user = auth.currentUser;
  const uid = user.uid;
  const publicRef = doc(db, "players_public", uid);
  const privateRef = doc(db, "players_private", uid);
  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(publicRef),
    getDoc(privateRef)
  ]);
  const publicData = publicSnap.exists() ? publicSnap.data() : {};
  const privateData = privateSnap.exists() ? privateSnap.data() : {};
  const localMeta = normalizeMetaSnapshot(localMetaSnapshot());
  const rawCallSign = safeCallSign(callSignOverride || online.profileCallSign || publicData.callSign || "");
  const requestedCallSign = rawCallSign.length >= 3
    ? rawCallSign
    : (typeof window.neutralPilotCallSign === "function" ? window.neutralPilotCallSign(uid) : `PILOT_${uid.slice(0, 6).toUpperCase()}`.slice(0, 12));
  const displayName = safeText(user.displayName || requestedCallSign, "Pilot", 60);
  const photoURL = safeUrl(user.photoURL);
  const totalGlory = Math.max(localMeta.totalGlory, numberOrZero(publicData.glory), numberOrZero(privateData.glory));
  const gloryRankIndex = Math.max(localMeta.gloryRankIndex, numberOrZero(publicData.gloryRankIndex), numberOrZero(privateData.gloryRankIndex));
  const remoteRank = safeGloryRank(privateData.gloryRank || publicData.gloryRank || gloryRankNameForIndex(gloryRankIndex));
  const gloryRank = localMeta.totalGlory >= totalGlory ? localMeta.gloryRank : (remoteRank === GLORY_RANK_NAMES[0] && gloryRankIndex > 0 ? gloryRankNameForIndex(gloryRankIndex) : remoteRank);
  const currentSeasonXP = Math.max(localMeta.seasonXP, numberOrZero(privateData.currentSeasonXP));
  const currentSeasonTier = Math.max(localMeta.seasonTier, numberOrZero(publicData.seasonTier), numberOrZero(privateData.currentSeasonTier), 1);
  const remoteClaimed = Array.isArray(privateData.seasonClaimedRewardIds) ? privateData.seasonClaimedRewardIds.map((id) => safeId(id, "")).filter(Boolean) : [];
  const seasonClaimedRewardIds = Array.from(new Set([...remoteClaimed, ...localMeta.seasonClaimedRewardIds])).slice(0, 220);
  const credits = Math.max(localMeta.credits, numberOrZero(privateData.credits));
  const timestamp = serverTimestamp();

  const privatePayload = {
    uid,
    email: safeEmail(user.email),
    displayName,
    photoURL,
    glory: totalGlory,
    gloryRank,
    gloryRankIndex,
    currentSeasonId: localMeta.seasonId,
    currentSeasonXP,
    currentSeasonTier,
    credits,
    lifetimeRuns: Math.max(localMeta.lifetime.runs, numberOrZero(privateData.lifetimeRuns)),
    lifetimeScore: Math.max(localMeta.lifetime.score, numberOrZero(privateData.lifetimeScore)),
    lifetimeKills: Math.max(localMeta.lifetime.kills, numberOrZero(privateData.lifetimeKills)),
    lifetimePowerups: Math.max(localMeta.lifetime.powerups, numberOrZero(privateData.lifetimePowerups)),
    lifetimeGhostUses: Math.max(localMeta.lifetime.ghostUses, numberOrZero(privateData.lifetimeGhostUses)),
    lifetimeBosses: Math.max(localMeta.lifetime.bosses, numberOrZero(privateData.lifetimeBosses)),
    lifetimeDamageTaken: Math.max(localMeta.lifetime.damageTaken, numberOrZero(privateData.lifetimeDamageTaken)),
    highestCombo: Math.max(localMeta.lifetime.highestCombo, numberOrZero(privateData.highestCombo)),
    seasonClaimedRewardIds,
    lastSeenAt: timestamp,
    updatedAt: timestamp
  };
  const publicPayload = {
    uid,
    callSign: requestedCallSign,
    bestScore: Math.max(
      numberOrZero(publicData.bestScore),
      localMeta.lifetime.bestScore,
      typeof window.getLocalHighScore === "function" ? window.getLocalHighScore() : 0
    ),
    phase: Math.max(1, numberOrZero(publicData.phase), localMeta.lifetime.bestPhase || 1),
    achievementsCount: numberOrZero(publicData.achievementsCount),
    glory: totalGlory,
    gloryRank,
    gloryRankIndex,
    seasonTier: currentSeasonTier,
    createdAt: publicData.createdAt || timestamp,
    updatedAt: timestamp
  };

  if (!privateSnap.exists()) privatePayload.createdAt = timestamp;

  await Promise.all([
    setDoc(privateRef, privatePayload, { merge: true }),
    setDoc(publicRef, publicPayload)
  ]);

  online.profileCallSign = requestedCallSign;
  online.profileMeta = {
    totalGlory,
    gloryRank,
    gloryRankIndex,
    currentSeasonXP,
    currentSeasonTier,
    seasonClaimedRewardIds,
    credits
  };
  setStatus("Profile synced.");
}

function applyLeaderboardSnapshot(snapshot) {
  online.leaderboard = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const candidate = {
      uid: data.uid || docSnapshot.id,
      callSign: safeCallSign(data.callSign || ""),
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
  await syncProfile(normalized);
  subscribeLeaderboard();
  return { ok: true, localOnly: false, callSign: normalized };
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
    online.profileMeta = null;
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
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      getFirestore: firestoreModule.getFirestore,
      getFunctions: functionsModule.getFunctions,
      httpsCallable: functionsModule.httpsCallable,
      limit: firestoreModule.limit,
      onAuthStateChanged: authModule.onAuthStateChanged,
      onSnapshot: firestoreModule.onSnapshot,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      serverTimestamp: firestoreModule.serverTimestamp,
      setDoc: firestoreModule.setDoc,
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
        online.profileMeta = null;
        setStatus("Sign in to sync records.");
        return;
      }
      try {
        await syncProfile(online.profileCallSign || "");
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
