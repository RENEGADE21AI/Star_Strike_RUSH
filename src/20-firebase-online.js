const FIREBASE_SDK_VERSION = "11.10.0";
const FIREBASE_CONFIG_CANDIDATES = [
  "/__/firebase/init.json",
  "src/firebase-config.local.json"
];

let app = null;
let auth = null;
let db = null;
let leaderboardUnsubscribe = null;

const online = {
  ready: false,
  user: null,
  profileCallSign: "",
  leaderboard: [],
  achievements: [],
  lastStatus: "Connecting Firebase...",
  lastError: ""
};

function clonePublicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || "",
    photoURL: user.photoURL || ""
  };
}

function getState() {
  return {
    ready: online.ready,
    user: clonePublicUser(online.user),
    profileCallSign: online.profileCallSign,
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
  return {
    score: numberOrZero(run && run.score),
    highScore: numberOrZero(run && run.highScore),
    phase: Math.max(1, numberOrZero(run && run.phase) || 1),
    callSign: safeCallSign(run && run.callSign),
    stats: {
      kills: numberOrZero(run && run.stats && run.stats.kills),
      powerups: numberOrZero(run && run.stats && run.stats.powerups),
      ghostUses: numberOrZero(run && run.stats && run.stats.ghostUses),
      bosses: numberOrZero(run && run.stats && run.stats.bosses)
    },
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
  const publicSnap = await getDoc(publicRef);
  const publicData = publicSnap.exists() ? publicSnap.data() : {};
  const requestedCallSign = safeCallSign(callSignOverride || online.profileCallSign || publicData.callSign || "");
  const displayName = safeText(user.displayName || requestedCallSign, "Pilot", 60);
  const photoURL = safeUrl(user.photoURL);
  const timestamp = serverTimestamp();

  const privatePayload = {
    uid,
    email: safeEmail(user.email),
    displayName,
    photoURL,
    lastSeenAt: timestamp,
    updatedAt: timestamp
  };
  const publicPayload = {
    uid,
    displayName,
    callSign: requestedCallSign,
    photoURL,
    bestScore: numberOrZero(publicData.bestScore),
    phase: Math.max(1, numberOrZero(publicData.phase) || 1),
    achievementsCount: numberOrZero(publicData.achievementsCount),
    updatedAt: timestamp
  };

  if (!publicSnap.exists()) publicPayload.createdAt = timestamp;
  const privateSnap = await getDoc(privateRef);
  if (!privateSnap.exists()) privatePayload.createdAt = timestamp;

  await Promise.all([
    setDoc(privateRef, privatePayload, { merge: true }),
    setDoc(publicRef, publicPayload, { merge: true })
  ]);

  online.profileCallSign = requestedCallSign;
  setStatus("Profile synced.");
}

function applyLeaderboardSnapshot(snapshot) {
  online.leaderboard = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      uid: data.uid || docSnapshot.id,
      callSign: safeCallSign(data.callSign || ""),
      displayName: safeText(data.displayName, "Pilot", 60),
      photoURL: safeUrl(data.photoURL),
      bestScore: numberOrZero(data.bestScore),
      phase: Math.max(1, numberOrZero(data.phase) || 1),
      achievementsCount: numberOrZero(data.achievementsCount)
    };
  });
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
    online.achievements = [];
    online.leaderboard = [];
    setStatus("Signed out.");
    notify("SIGNED OUT");
  } catch (error) {
    setError(error, "Sign-out failed.");
    notify("SIGN OUT FAILED");
  }
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
  const {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
  } = window.starStrikeFirebaseApi;
  const user = auth.currentUser;
  const uid = user.uid;
  const run = normalizeRun(rawRun || {});
  const runBest = Math.max(run.score, run.highScore);

  try {
    await syncProfile(run.callSign || online.profileCallSign);
    const publicRef = doc(db, "players_public", uid);
    const leaderboardRef = doc(db, "leaderboard_scores", uid);
    const [publicSnap, leaderboardSnap] = await Promise.all([
      getDoc(publicRef),
      getDoc(leaderboardRef)
    ]);
    const publicData = publicSnap.exists() ? publicSnap.data() : {};
    const leaderboardData = leaderboardSnap.exists() ? leaderboardSnap.data() : {};
    const currentBest = Math.max(numberOrZero(publicData.bestScore), numberOrZero(leaderboardData.bestScore));
    const currentPhase = Math.max(numberOrZero(publicData.phase), numberOrZero(leaderboardData.phase), 1);
    const unlocked = new Set(online.achievements);
    const newAchievementIds = run.achievements.filter((id) => !unlocked.has(id));
    const bestScore = Math.max(currentBest, runBest);
    const phase = Math.max(currentPhase, run.phase);
    const achievementsCount = Math.max(
      numberOrZero(publicData.achievementsCount),
      numberOrZero(leaderboardData.achievementsCount),
      unlocked.size + newAchievementIds.length
    );
    const timestamp = serverTimestamp();
    const displayName = safeText(user.displayName || run.callSign, "Pilot", 60);
    const recordPayload = {
      uid,
      displayName,
      callSign: safeCallSign(run.callSign || online.profileCallSign),
      photoURL: safeUrl(user.photoURL),
      bestScore,
      phase,
      achievementsCount,
      updatedAt: timestamp
    };
    const achievementWrites = newAchievementIds.map((achievementId) => {
      const achievementRef = doc(db, "player_achievements", uid, "items", achievementId);
      return setDoc(achievementRef, {
        uid,
        achievementId,
        title: achievementTitle(achievementId),
        unlockedAt: timestamp
      });
    });

    await Promise.all([
      setDoc(publicRef, recordPayload, { merge: true }),
      setDoc(leaderboardRef, recordPayload, { merge: true }),
      ...achievementWrites
    ]);
    await loadAchievements();
    subscribeLeaderboard();
    setStatus(newAchievementIds.length ? "Run and achievements synced." : "Run synced.");
    notify(newAchievementIds.length ? "ACHIEVEMENTS SYNCED" : "RUN SYNCED");
  } catch (error) {
    setError(error, "Run sync failed.");
    notify("ONLINE SYNC FAILED");
  }
}

window.starStrikeOnline = {
  getState,
  signIn,
  signOut: signOutOnline,
  refresh,
  submitRun
};

async function bootFirebase() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    const [
      appModule,
      authModule,
      firestoreModule
    ] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);
    window.starStrikeFirebaseApi = {
      GoogleAuthProvider: authModule.GoogleAuthProvider,
      collection: firestoreModule.collection,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      getFirestore: firestoreModule.getFirestore,
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
    online.ready = true;
    setStatus("Firebase connected.");
    authModule.onAuthStateChanged(auth, async (user) => {
      online.user = user || null;
      online.lastError = "";
      if (!user) {
        online.achievements = [];
        online.leaderboard = [];
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
