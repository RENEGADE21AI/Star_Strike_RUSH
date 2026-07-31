const FIREBASE_SDK_VERSION = "12.16.0";
const FIREBASE_CONFIG_CANDIDATES = [
  "/__/firebase/init.json",
  "src/firebase-config.local.json"
];
const PROGRESSION_MODE = window.PROGRESSION_AUTHORITY || "device_local_preseason";
const competitiveModeEnabled = window.CLIENT_COMPETITION_WRITES_ENABLED === true;
const developmentHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const emulatorMode = developmentHost && new URLSearchParams(window.location.search).get("firebaseEmulators") === "1";
const REFRESH_DEBOUNCE_MS = 1200;

let app = null;
let auth = null;
let db = null;
let functionsApi = null;
let archiveUnsubscribe = null;
let archiveListenerUid = "";
let authGeneration = 0;
let lastAuthTransitionUid = "";
let refreshAvailableAtMs = 0;
const hydrationPromises = new Map();
const authTransitionWaiters = new Set();

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
  publicPilotId: "",
  profileCallSign: "",
  profileHandle: "",
  profileMeta: null,
  onlineArchiveMeta: null,
  legacyRecord: null,
  weeklyLeague: null,
  identityService: "connecting",
  accountArchive: "not_loaded",
  progressionMode: PROGRESSION_MODE,
  competitionMode: competitiveModeEnabled ? "unknown" : "paused",
  networkState: navigator.onLine === false ? "offline" : "online",
  leaderboard: [],
  achievements: [],
  backendRelease: null,
  pendingCallSign: false,
  lastStatus: "Connecting Firebase...",
  lastError: "",
  developmentCounters: {
    authTransitions: 0,
    hydrationSequences: 0,
    profileCallableCalls: 0,
    achievementAggregateLoads: 0,
    archiveListenerSubscriptions: 0,
    redirectResults: 0,
    signInStarts: 0
  }
};

function clonePublicUser(user) {
  return user ? { uid: String(user.uid || "").slice(0, 128) } : null;
}

function cloneMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  return JSON.parse(JSON.stringify(meta));
}

function getState() {
  return {
    ready: online.ready,
    user: clonePublicUser(online.user),
    publicPilotId: online.publicPilotId,
    profileCallSign: online.profileCallSign,
    profileHandle: online.profileHandle,
    profileMeta: cloneMeta(online.profileMeta),
    onlineArchiveMeta: cloneMeta(online.onlineArchiveMeta),
    legacyRecord: online.legacyRecord ? { ...online.legacyRecord } : null,
    weeklyLeague: null,
    identityService: online.identityService,
    accountArchive: online.accountArchive,
    progressionMode: online.progressionMode,
    competitionMode: online.competitionMode,
    networkState: online.networkState,
    competitiveModeEnabled,
    leaderboard: online.leaderboard.map((row) => ({ ...row })),
    achievements: online.achievements.slice(),
    backendRelease: online.backendRelease ? { ...online.backendRelease } : null,
    pendingCallSign: online.pendingCallSign,
    lastStatus: online.lastStatus,
    lastError: online.lastError,
    developmentCounters: { ...online.developmentCounters }
  };
}

function getAccessibilityKey() {
  return `${online.user ? "signed-in" : "signed-out"}|${safeHandle(online.profileHandle)}`;
}

function setStatus(message) {
  online.lastStatus = String(message || "");
  online.lastError = "";
}

function setError(error, fallback = "Firebase account service failed.") {
  const message = error && error.message ? error.message : fallback;
  online.lastError = String(message).replace(/^Firebase:\s*/i, "").slice(0, 140);
}

function notify(message) {
  if (typeof window.showMessage === "function") window.showMessage(message, 90);
}

function safeText(value, fallback, maxLength) {
  return String(value || fallback || "")
    .replace(/[^\w .'-]/g, "")
    .trim()
    .slice(0, maxLength);
}

function safeCallSign(value) {
  return typeof window.normalizeCallSign === "function"
    ? window.normalizeCallSign(value || "")
    : String(value || "").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 12);
}

function safeHandle(value) {
  return typeof window.normalizePublicHandle === "function"
    ? window.normalizePublicHandle(value || "")
    : String(value || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16);
}

function numberOrZero(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function boundedNumber(value, max) {
  return Math.min(numberOrZero(value), max);
}

function safeId(value, fallback = "item") {
  const text = String(value || fallback)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 80);
  return text || fallback;
}

function safeGloryRank(value) {
  return GLORY_RANK_NAMES.includes(String(value || "")) ? String(value) : GLORY_RANK_NAMES[0];
}

function safeGloryRankIndex(value, rankName = "") {
  const number = numberOrZero(value);
  if (number < GLORY_RANK_NAMES.length) return number;
  const index = GLORY_RANK_NAMES.indexOf(rankName);
  return index >= 0 ? index : 0;
}

function normalizeArchiveMeta(meta) {
  const rankName = safeGloryRank(meta && (meta.gloryRank || meta.rankAfter));
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

function normalizeLegacyRecord(record) {
  return {
    legacyBestScore: boundedNumber(record && record.legacyBestScore, 999999999),
    verifiedBestScore: boundedNumber(record && record.verifiedBestScore, 999999999),
    legacyPhase: Math.max(1, boundedNumber(record && record.legacyPhase, 9999) || 1),
    verifiedPhase: Math.max(1, boundedNumber(record && record.verifiedPhase, 9999) || 1),
    recordTrust: record && record.recordTrust === "legacy_unverified" ? "legacy_unverified" : "no_record"
  };
}

function knownAchievementIds() {
  const definitions = typeof window.getAchievementDefinitions === "function"
    ? window.getAchievementDefinitions()
    : [];
  return new Set(definitions.map((achievement) => achievement.id));
}

function normalizeAchievementArchive(archive) {
  const known = knownAchievementIds();
  return Array.from(new Set(
    (Array.isArray(archive && archive.ids) ? archive.ids : [])
      .map((id) => safeId(id, ""))
      .filter((id) => known.has(id))
  ));
}

function normalizeBackendRelease(release) {
  if (!release || typeof release !== "object") return null;
  return {
    commitSha: /^[0-9a-f]{40}$/i.test(String(release.commitSha || ""))
      ? String(release.commitSha).toLowerCase()
      : "development",
    packageVersion: safeText(release.packageVersion, "development", 30),
    progressionAuthority: release.progressionAuthority === "device_local_preseason"
      ? "device_local_preseason"
      : "unknown",
    competitionWritesEnabled: release.competitionWritesEnabled === true,
    serverProgressionWritesEnabled: release.serverProgressionWritesEnabled === true,
    appCheckEnforced: release.appCheckEnforced === true
  };
}

async function loadFirebaseConfig() {
  if (emulatorMode) {
    return {
      apiKey: "demo-star-strike-rush",
      authDomain: "star-strike-rush.firebaseapp.com",
      projectId: "star-strike-rush",
      appId: "1:000000000000:web:star-strike-rush-emulator"
    };
  }
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

function beginAuthTransitionGeneration() {
  authGeneration++;
  // Every promise created before this auth transition is now stale. Removing
  // only the registry entries lets the guarded promises finish harmlessly
  // while allowing a returning UID to start current-generation hydration.
  hydrationPromises.clear();
  return authGeneration;
}

function isHydrationCurrent(uid, generation) {
  return (
    authGeneration === generation &&
    auth &&
    auth.currentUser &&
    auth.currentUser.uid === uid
  );
}

function resolveAuthTransition(user) {
  for (const resolve of authTransitionWaiters) resolve(user || null);
  authTransitionWaiters.clear();
}

function waitForAuthTransition(timeoutMs = 15000) {
  if (auth && auth.currentUser && lastAuthTransitionUid === auth.currentUser.uid) {
    return Promise.resolve(auth.currentUser);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      authTransitionWaiters.delete(finish);
      resolve(user || null);
    };
    const timer = setTimeout(() => finish(auth && auth.currentUser), timeoutMs);
    authTransitionWaiters.add(finish);
  });
}

function teardownArchiveListener() {
  if (archiveUnsubscribe) archiveUnsubscribe();
  archiveUnsubscribe = null;
  archiveListenerUid = "";
}

function applyArchiveSnapshot(snapshot) {
  online.leaderboard = snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    return {
      uid: String(data.uid || documentSnapshot.id).slice(0, 128),
      callSign: safeCallSign(data.callSign || ""),
      handle: safeHandle(data.handle || ""),
      legacyBestScore: boundedNumber(data.legacyBestScore || data.bestScore, 999999999),
      verifiedBestScore: boundedNumber(data.verifiedBestScore, 999999999),
      legacyPhase: Math.max(1, boundedNumber(data.legacyPhase || data.phase, 9999) || 1),
      verifiedPhase: Math.max(1, boundedNumber(data.verifiedPhase, 9999) || 1),
      achievementsCount: boundedNumber(data.achievementArchiveCount || data.achievementsCount, 79),
      recordTrust: "legacy_unverified"
    };
  });
}

function subscribeLegacyArchive(uid) {
  if (!db || !auth || !auth.currentUser || auth.currentUser.uid !== uid) return;
  if (archiveUnsubscribe && archiveListenerUid === uid) return;
  teardownArchiveListener();
  const { collection, limit, onSnapshot, orderBy, query } = window.starStrikeFirebaseApi;
  const archiveQuery = query(
    collection(db, "leaderboard_scores"),
    orderBy("bestScore", "desc"),
    limit(10)
  );
  archiveListenerUid = uid;
  online.developmentCounters.archiveListenerSubscriptions++;
  archiveUnsubscribe = onSnapshot(
    archiveQuery,
    (snapshot) => {
      if (!auth || !auth.currentUser || auth.currentUser.uid !== uid) return;
      applyArchiveSnapshot(snapshot);
      setStatus("LEGACY/PRESEASON ARCHIVE LOADED");
    },
    (error) => {
      if (!auth || !auth.currentUser || auth.currentUser.uid !== uid) return;
      setError(error, "Legacy archive could not be loaded.");
    }
  );
}

async function syncProfile(explicitCallSign = "", generation = authGeneration) {
  if (!auth || !auth.currentUser || !functionsApi || !window.starStrikeFirebaseApi) {
    throw new Error("Firebase identity service is not ready.");
  }
  const uid = auth.currentUser.uid;
  online.developmentCounters.profileCallableCalls++;
  const callable = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "syncPilotProfile");
  const response = await callable(explicitCallSign ? { callSign: safeCallSign(explicitCallSign) } : {});
  if (!isHydrationCurrent(uid, generation)) return { stale: true };
  const result = response && response.data ? response.data : {};
  const serverCallSign = safeCallSign(result.callSign || "");
  const storedCallSign = typeof window.resolvedAccountCallSign === "function"
    ? window.resolvedAccountCallSign(localStorage, uid, serverCallSign)
    : serverCallSign;
  online.profileCallSign = storedCallSign || serverCallSign;
  online.publicPilotId = safeText(result.publicPilotId, "", 40).replace(/[^a-z0-9_]/gi, "");
  online.profileHandle = safeHandle(result.handle || "");
  online.onlineArchiveMeta = normalizeArchiveMeta(result.accountArchiveMeta || {});
  online.profileMeta = online.onlineArchiveMeta;
  online.legacyRecord = normalizeLegacyRecord(result.legacyRecord || {});
  online.achievements = normalizeAchievementArchive(result.achievementArchive || {});
  online.backendRelease = normalizeBackendRelease(result.release);
  online.developmentCounters.achievementAggregateLoads++;
  online.accountArchive = "loaded";
  online.identityService = "available";
  online.networkState = "online";
  if (explicitCallSign && typeof window.markAccountCallSignPublished === "function") {
    const published = window.markAccountCallSignPublished(localStorage, uid, online.profileCallSign);
    online.pendingCallSign = !published.ok;
  } else {
    const stored = typeof window.readAccountIdentityState === "function"
      ? window.readAccountIdentityState(localStorage, uid)
      : { pending: false };
    online.pendingCallSign = stored.pending === true;
  }
  return result;
}

async function hydrateAccount(user, options = {}) {
  const uid = user && user.uid;
  if (!uid) return null;
  // `force` requests a fresh hydration once this UID is idle; it must never
  // create a second callable/read sequence while one is already in flight.
  if (hydrationPromises.has(uid)) return hydrationPromises.get(uid);
  const generation = authGeneration;
  const hydration = (async () => {
    online.developmentCounters.hydrationSequences++;
    online.identityService = "connecting";
    online.accountArchive = "loading";
    const pending = typeof window.readAccountIdentityState === "function"
      ? window.readAccountIdentityState(localStorage, uid)
      : { pending: false, desiredCallSign: "" };
    if (pending.pending && pending.desiredCallSign) {
      online.profileCallSign = pending.desiredCallSign;
      online.pendingCallSign = true;
    }
    const result = await syncProfile(pending.pending ? pending.desiredCallSign : "", generation);
    if (!result || result.stale || !isHydrationCurrent(uid, generation)) return { stale: true };
    subscribeLegacyArchive(uid);
    setStatus(pending.pending ? "ACCOUNT UPDATED" : "PILOT IDENTITY ACTIVE");
    return result;
  })().catch((error) => {
    if (isHydrationCurrent(uid, generation)) {
      online.identityService = "unavailable";
      online.accountArchive = "unavailable";
      online.networkState = navigator.onLine === false ? "offline" : "degraded";
      setError(error, "Account archive is temporarily unavailable.");
      if (typeof window.markAccountCallSignFailed === "function") {
        const pending = window.readAccountIdentityState(localStorage, uid);
        if (pending.pending) window.markAccountCallSignFailed(localStorage, uid);
      }
    }
    return { ok: false, error };
  }).finally(() => {
    if (hydrationPromises.get(uid) === hydration) hydrationPromises.delete(uid);
  });
  hydrationPromises.set(uid, hydration);
  return hydration;
}

async function updateCallSign(callSign) {
  const validation = typeof window.validateCallSign === "function"
    ? window.validateCallSign(callSign)
    : { ok: safeCallSign(callSign).length >= 3, callSign: safeCallSign(callSign), message: "Invalid call sign." };
  if (!validation.ok) throw new Error(validation.message || "Call sign must be 3-12 characters.");
  if (!online.ready || !auth || !auth.currentUser) {
    return { ok: false, storageSucceeded: false, reason: "signed_out" };
  }
  const uid = auth.currentUser.uid;
  const normalized = validation.callSign;
  online.profileCallSign = normalized;
  const pending = typeof window.savePendingAccountCallSign === "function"
    ? window.savePendingAccountCallSign(localStorage, uid, normalized)
    : { ok: false };
  if (!pending.ok) {
    online.pendingCallSign = false;
    setStatus("ACCOUNT UPDATE FAILED");
    return { ok: false, storageSucceeded: false, reason: "storage_failed", callSign: normalized };
  }
  online.pendingCallSign = true;
  setStatus("PUBLISHING TO ACCOUNT");
  try {
    const result = await syncProfile(normalized, authGeneration);
    if (result && result.stale) return { ok: false, storageSucceeded: true, pending: true, reason: "account_changed" };
    online.pendingCallSign = false;
    setStatus("ACCOUNT UPDATED");
    return { ok: true, storageSucceeded: true, published: true, pending: false, callSign: normalized };
  } catch (error) {
    if (typeof window.markAccountCallSignFailed === "function") {
      window.markAccountCallSignFailed(localStorage, uid);
    }
    online.pendingCallSign = true;
    online.networkState = navigator.onLine === false ? "offline" : "degraded";
    setError(error, "Account publication is pending.");
    setStatus("SAVED LOCALLY — ACCOUNT UPDATE PENDING");
    return { ok: false, storageSucceeded: true, published: false, pending: true, callSign: normalized };
  }
}

async function refresh() {
  if (!online.ready || !auth || !auth.currentUser) {
    setStatus("Sign in to refresh the account archive.");
    return { ok: false, reason: "signed_out" };
  }
  const now = Date.now();
  if (now < refreshAvailableAtMs) {
    setStatus("ACCOUNT ARCHIVE REFRESH ALREADY REQUESTED");
    return { ok: false, reason: "debounced" };
  }
  refreshAvailableAtMs = now + REFRESH_DEBOUNCE_MS;
  const result = await hydrateAccount(auth.currentUser, { force: true });
  if (result && !result.stale && result.ok !== false) notify("ACCOUNT ARCHIVE REFRESHED");
  return result;
}

async function signIn() {
  if (!online.ready || !auth || !window.starStrikeFirebaseApi) {
    setStatus("Firebase identity is still connecting.");
    return { ok: false, reason: "not_ready" };
  }
  if (auth.currentUser) {
    return { ok: true, user: clonePublicUser(auth.currentUser) };
  }
  online.developmentCounters.signInStarts++;
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = window.starStrikeFirebaseApi;
  const provider = new GoogleAuthProvider();
  setStatus("OPENING GOOGLE SIGN-IN");
  try {
    const result = await window.initiateGoogleAuthFlow({
      popup: () => signInWithPopup(auth, provider),
      redirect: () => signInWithRedirect(auth, provider),
      waitForAuthTransition,
      waitForHydration: (uid) => hydrationPromises.get(uid) || Promise.resolve()
    });
    if (result.redirecting) {
      setStatus("CONTINUING GOOGLE SIGN-IN");
      return result;
    }
    notify("SIGNED IN");
    return { ok: true, user: clonePublicUser(result.user) };
  } catch (error) {
    window.applyIdentityFailure(
      online,
      error,
      "Google sign-in failed. Check the authorized domain and try again.",
      "SIGN IN FAILED"
    );
    notify("SIGN IN FAILED");
    return { ok: false, reason: "sign_in_failed" };
  }
}

async function signOutOnline() {
  if (!auth || !window.starStrikeFirebaseApi) return;
  try {
    teardownArchiveListener();
    await window.starStrikeFirebaseApi.signOut(auth);
    setStatus("Signed out. Device progress is unchanged.");
    notify("SIGNED OUT");
  } catch (error) {
    setError(error, "Sign-out failed.");
    notify("SIGN OUT FAILED");
  }
}

async function claimHandle(handle) {
  const validation = typeof window.validatePublicHandle === "function"
    ? window.validatePublicHandle(handle)
    : { ok: false, handle: "", message: "Handle validation unavailable." };
  if (!validation.ok) throw new Error(validation.message || "Invalid handle.");
  if (!online.ready || !auth || !auth.currentUser || !functionsApi) throw new Error("Sign in to claim a handle.");
  const callable = window.starStrikeFirebaseApi.httpsCallable(functionsApi, "claimPilotHandle");
  try {
    const response = await callable({ handle: validation.handle });
    const result = response && response.data ? response.data : {};
    online.profileHandle = safeHandle(result.handle);
    online.identityService = "available";
    setStatus(`@${online.profileHandle} IS ACCOUNT-BOUND`);
    return { ok: true, handle: online.profileHandle };
  } catch (error) {
    const kind = typeof window.identityErrorKind === "function" ? window.identityErrorKind(error) : "unknown";
    const messages = {
      handle_taken: "That @handle is already claimed.",
      invalid_handle: "That @handle is not valid.",
      account_conflict: "This account already owns a different @handle.",
      signed_out: "Sign in to claim a handle.",
      backend_unavailable: "Identity service is temporarily unavailable."
    };
    throw new Error(messages[kind] || "Handle claim failed.");
  }
}

async function joinWeeklyLeague() {
  online.weeklyLeague = null;
  online.competitionMode = "paused";
  setStatus("PUBLIC COMPETITION PAUSED");
  return { ok: false, reason: "preseason_paused" };
}

async function submitRun() {
  setStatus("Run saved as device progress. Public writes are paused.");
  return { ok: false, reason: "device_local_preseason", localOnly: true };
}

async function claimSeasonRewardOnline() {
  setStatus("Season rewards are stored on this device during preseason.");
  return { ok: false, reason: "device_local_preseason", localOnly: true };
}

async function devSignInAccount(accountName = "account-a") {
  if (!emulatorMode || !auth || !window.starStrikeFirebaseApi) {
    throw new Error("Emulator account sign-in is unavailable.");
  }
  const safeName = String(accountName || "account-a").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "account-a";
  const email = `${safeName}@star-strike.test`;
  const password = "StarStrike-Test-Only-2026";
  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
  } = window.starStrikeFirebaseApi;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (String(error && error.code) !== "auth/email-already-in-use") throw error;
    await signInWithEmailAndPassword(auth, email, password);
  }
  const user = await waitForAuthTransition();
  if (user && hydrationPromises.has(user.uid)) await hydrationPromises.get(user.uid);
  return clonePublicUser(user || auth.currentUser);
}

window.starStrikeOnline = {
  getState,
  getAccessibilityKey,
  signIn,
  signOut: signOutOnline,
  refresh,
  updateCallSign,
  claimHandle,
  joinWeeklyLeague,
  submitRun,
  claimSeasonReward: claimSeasonRewardOnline,
  ...(emulatorMode ? { devSignInAccount } : {})
};

async function bootFirebase() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    const [appModule, authModule, firestoreModule, functionsModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`)
    ]);
    window.starStrikeFirebaseApi = {
      GoogleAuthProvider: authModule.GoogleAuthProvider,
      collection: firestoreModule.collection,
      connectAuthEmulator: authModule.connectAuthEmulator,
      connectFirestoreEmulator: firestoreModule.connectFirestoreEmulator,
      connectFunctionsEmulator: functionsModule.connectFunctionsEmulator,
      createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
      getRedirectResult: authModule.getRedirectResult,
      httpsCallable: functionsModule.httpsCallable,
      limit: firestoreModule.limit,
      onSnapshot: firestoreModule.onSnapshot,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
      signInWithPopup: authModule.signInWithPopup,
      signInWithRedirect: authModule.signInWithRedirect,
      signOut: authModule.signOut
    };
    app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    functionsApi = functionsModule.getFunctions(app, "us-central1");
    if (emulatorMode) {
      authModule.connectAuthEmulator(auth, "http://127.0.0.1:9199", { disableWarnings: true });
      firestoreModule.connectFirestoreEmulator(db, "127.0.0.1", 8180);
      functionsModule.connectFunctionsEmulator(functionsApi, "127.0.0.1", 5101);
    }
    online.ready = true;
    online.identityService = "available";
    online.networkState = navigator.onLine === false ? "offline" : "online";
    setStatus("Firebase identity ready.");

    authModule.onAuthStateChanged(auth, (user) => {
      beginAuthTransitionGeneration();
      lastAuthTransitionUid = user && user.uid ? user.uid : "";
      online.developmentCounters.authTransitions++;
      online.user = user || null;
      online.lastError = "";
      resolveAuthTransition(user);
      if (!user) {
        teardownArchiveListener();
        if (typeof window.clearAccountIdentity === "function") {
          window.clearAccountIdentity(online, {
            competitiveModeEnabled,
            progressionMode: PROGRESSION_MODE
          });
        }
        setStatus("SIGN IN FOR ACCOUNT IDENTITY");
        return;
      }
      hydrateAccount(user);
    });

    try {
      const redirectResult = await window.restoreGoogleRedirect(() => authModule.getRedirectResult(auth));
      if (redirectResult.user) online.developmentCounters.redirectResults++;
    } catch (error) {
      setError(error, "Google redirect sign-in could not be restored.");
    }
  } catch (error) {
    online.ready = false;
    online.identityService = "unavailable";
    online.networkState = "offline";
    setError(error, "Firebase identity is unavailable. Device play remains available.");
  }
}

window.addEventListener("online", () => {
  online.networkState = "online";
  if (online.ready && auth && auth.currentUser) hydrateAccount(auth.currentUser, { force: true });
});
window.addEventListener("offline", () => {
  online.networkState = "offline";
});

bootFirebase();
