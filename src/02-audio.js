let gameAudioContext = null;
let gameAudioBus = null;
const gameSoundLastPlayed = new Map();
const GAME_MUSIC_SOURCES = Object.freeze({
  title: "assets/audio/hangar-bay-seven.mp3",
  gameplay: "assets/audio/gravitys-edge.mp3"
});
const GAME_MUSIC_FADE_SECONDS = 0.75;
const gameMusicTracks = {};
let gameMusicUnlocked = false;
let gameMusicHidden = false;

function gameAudioNow() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function ensureGameAudio() {
  if (settingEffectsEnabled === false) return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    if (!gameAudioContext) {
      gameAudioContext = new AudioCtor();
      gameAudioBus = gameAudioContext.createGain();
      gameAudioBus.gain.value = 0.16;
      gameAudioBus.connect(gameAudioContext.destination);
    }
    if (gameAudioContext.state === "suspended") {
      Promise.resolve(gameAudioContext.resume()).catch(() => {});
    }
    return { context: gameAudioContext, bus: gameAudioBus };
  } catch {
    return null;
  }
}

function scheduleGameTone(audio, options) {
  const { context, bus } = audio;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = options.wave || "sine";
  oscillator.frequency.setValueAtTime(Math.max(30, options.from), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, options.to), now + options.duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain), now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
  oscillator.connect(gain);
  gain.connect(bus);
  oscillator.start(now);
  oscillator.stop(now + options.duration + 0.02);
}

function playGameSound(kind, intensity = 1) {
  if (settingEffectsEnabled === false) return false;
  const throttle = {
    player_fire: 65,
    enemy_hit: 42,
    boss_hit: 48,
    destroy: 70,
    ui: 45
  }[kind] || 0;
  const now = gameAudioNow();
  const last = gameSoundLastPlayed.get(kind) || -Infinity;
  if (now - last < throttle) return false;
  const audio = ensureGameAudio();
  if (!audio) return false;
  gameSoundLastPlayed.set(kind, now);
  const strength = clamp(Number(intensity) || 1, 0.15, 1.5);
  const presets = {
    ui: [{ from: 520, to: 720, duration: 0.055, gain: 0.035, wave: "sine" }],
    launch: [
      { from: 120, to: 620, duration: 0.30, gain: 0.07, wave: "sawtooth" },
      { from: 260, to: 980, duration: 0.22, gain: 0.035, wave: "sine" }
    ],
    player_fire: [{ from: 760, to: 430, duration: 0.045, gain: 0.018, wave: "square" }],
    enemy_hit: [{ from: 260, to: 105, duration: 0.065, gain: 0.045, wave: "triangle" }],
    boss_hit: [
      { from: 170, to: 72, duration: 0.095, gain: 0.055, wave: "sawtooth" },
      { from: 560, to: 220, duration: 0.07, gain: 0.022, wave: "square" }
    ],
    player_hit: [
      { from: 150, to: 55, duration: 0.22, gain: 0.09, wave: "sawtooth" },
      { from: 430, to: 90, duration: 0.15, gain: 0.035, wave: "square" }
    ],
    wingman_hit: [{ from: 410, to: 90, duration: 0.16, gain: 0.06, wave: "triangle" }],
    powerup: [
      { from: 420, to: 1120, duration: 0.20, gain: 0.055, wave: "sine" },
      { from: 650, to: 1480, duration: 0.16, gain: 0.03, wave: "triangle" }
    ],
    ability: [
      { from: 180, to: 820, duration: 0.18, gain: 0.055, wave: "triangle" },
      { from: 920, to: 380, duration: 0.13, gain: 0.025, wave: "sine" }
    ],
    destroy: [
      { from: 140, to: 45, duration: 0.19, gain: 0.07, wave: "sawtooth" },
      { from: 320, to: 82, duration: 0.11, gain: 0.03, wave: "square" }
    ],
    boss_destroy: [
      { from: 110, to: 34, duration: 0.48, gain: 0.11, wave: "sawtooth" },
      { from: 440, to: 64, duration: 0.32, gain: 0.055, wave: "square" }
    ]
  };
  const tones = presets[kind] || presets.ui;
  for (const tone of tones) scheduleGameTone(audio, { ...tone, gain: tone.gain * strength });
  return true;
}

function ensureGameMusicTrack(name) {
  if (gameMusicTracks[name] || typeof window.Audio !== "function") return gameMusicTracks[name] || null;
  const source = GAME_MUSIC_SOURCES[name];
  if (!source) return null;
  const track = new window.Audio(source);
  track.loop = true;
  track.preload = "metadata";
  track.volume = 0;
  track.setAttribute("playsinline", "");
  gameMusicTracks[name] = track;
  return track;
}

function playMusicTrack(track) {
  if (!track || !track.paused) return;
  try {
    Promise.resolve(track.play()).catch(() => {});
  } catch {}
}

function unlockGameMusic() {
  if (settingMusicEnabled === false) return false;
  gameMusicUnlocked = true;
  const mode = state && state.gameState;
  const name = mode === "start" ? "title" : "gameplay";
  const track = ensureGameMusicTrack(name);
  playMusicTrack(track);
  return !!track;
}

function prepareGameplayMusic() {
  if (!gameMusicUnlocked || settingMusicEnabled === false) return null;
  return ensureGameMusicTrack("gameplay");
}

function gameMusicMix() {
  const mode = state && state.gameState;
  if (mode === "start") return { title: 0.22, gameplay: 0 };
  if (mode === "paused" || mode === "resuming") return { title: 0, gameplay: 0.065 };
  if (mode === "gameover") return { title: 0, gameplay: 0.09 };
  return { title: 0, gameplay: 0.17 };
}

function pauseGameMusicImmediately(resetVolumes = false) {
  for (const track of Object.values(gameMusicTracks)) {
    if (resetVolumes) track.volume = 0;
    track.pause();
  }
}

function musicFadeAlpha(elapsedSeconds) {
  const seconds = clamp(Number(elapsedSeconds) || 0, 0, 0.25);
  return 1 - Math.exp(-seconds / GAME_MUSIC_FADE_SECONDS);
}

function updateGameMusic(elapsedSeconds = 1 / 60) {
  if (!gameMusicUnlocked) return;
  if (settingMusicEnabled === false) {
    pauseGameMusicImmediately(true);
    return;
  }
  if (document.hidden) {
    gameMusicHidden = true;
    pauseGameMusicImmediately(false);
    return;
  }
  const targets = gameMusicMix();
  for (const [name, target] of Object.entries(targets)) {
    const existing = gameMusicTracks[name];
    const track = existing || (target > 0 ? ensureGameMusicTrack(name) : null);
    if (!track) continue;
    if (target > 0 || track.volume > 0.001) playMusicTrack(track);
    const alpha = musicFadeAlpha(elapsedSeconds);
    const nextVolume = track.volume + (target - track.volume) * alpha;
    track.volume = clamp(Math.abs(nextVolume - target) < 0.0005 ? target : nextVolume, 0, 1);
    if (target === 0 && track.volume < 0.0005) {
      track.volume = 0;
      track.pause();
    }
  }
  gameMusicHidden = false;
}

function setMusicEnabled(enabled) {
  settingMusicEnabled = !!enabled;
  if (settingMusicEnabled) {
    unlockGameMusic();
  } else {
    pauseGameMusicImmediately(true);
  }
}

function setEffectsEnabled(enabled) {
  settingEffectsEnabled = !!enabled;
  if (settingEffectsEnabled) playGameSound("ui", 0.8);
}

function gameMusicStateSnapshot() {
  return {
    unlocked: gameMusicUnlocked,
    hidden: gameMusicHidden,
    loaded: Object.keys(gameMusicTracks),
    tracks: Object.fromEntries(Object.entries(gameMusicTracks).map(([name, track]) => [
      name,
      { paused: !!track.paused, volume: Number(track.volume || 0), preload: track.preload }
    ]))
  };
}

window.addEventListener("pointerdown", unlockGameMusic, { passive: true });
window.addEventListener("keydown", unlockGameMusic);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGameMusicImmediately(false);
  else updateGameMusic(0);
});
