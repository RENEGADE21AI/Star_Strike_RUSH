const TUTORIAL_DEFINITIONS = Object.freeze([
  {
    id: "incoming",
    objective: "BEGIN FLIGHT TRAINING",
    objectiveKind: "confirm",
    dialogue: [{ lines: ["Command has you listed as {CALL_SIGN}.", "Change it now, or after your flight."] }]
  },
  {
    id: "lightspeed",
    objective: "LAUNCH TO THE TRAINING RANGE",
    objectiveKind: "confirm",
    dialogue: [{ lines: ["Training range is clear.", "Stay with the fighter through launch."] }]
  },
  {
    id: "movement",
    objective: "FLY THROUGH THE NAV BEACONS",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Take the controls, Cadet.", "Fly through each navigation beacon."] }]
  },
  {
    id: "auto_weapons",
    objective: "KEEP TARGETS IN YOUR FIRING LANE",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Weapons track automatically.", "Your job is positioning."] }]
  },
  {
    id: "evasion",
    objective: "CLEAR THE WARNING LANES",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Bright cores mark live fire.", "Move around the warning lane."] }]
  },
  {
    id: "ghost_shift",
    objective: "GHOST SHIFT THROUGH THE DANGER LANE",
    objectiveKind: "ability",
    dialogue: [{ lines: ["Energy powers Ghost Shift.", "Trigger it and cross the danger lane."] }]
  },
  {
    id: "powerup",
    objective: "COLLECT THE PHASE SHIELD",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Range support dropped a Phase Shield.", "Collect it before we continue."] }]
  },
  {
    id: "controlled_wave",
    objective: "CLEAR THE TRAINING WAVE",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Now combine movement and positioning.", "Clear the range."] }]
  },
  {
    id: "command_boss",
    objective: "BREAK THE COMMAND SHIP CORE",
    objectiveKind: "movement",
    dialogue: [{ lines: ["Command ship ahead.", "Let it finish staging, then break the core."] }]
  },
  {
    id: "wraith_briefing",
    objective: "REVIEW THE TWO REALMS",
    objectiveKind: "realm",
    dialogue: [{ lines: ["The Wraith occupies two realities.", "Match its realm before you fire."] }]
  },
  {
    id: "realm_practice",
    objective: "REALM HOP AND MATCH THE TARGET",
    objectiveKind: "realm",
    dialogue: [{ lines: ["Realm Hop changes reality, not position.", "Wrong-realm threats pass harmlessly through you."] }]
  },
  {
    id: "wraith_boss",
    objective: "DEFEAT THE WRAITH SOVEREIGN",
    objectiveKind: "realm",
    dialogue: [{ lines: ["Watch both realm indicators.", "Hop, match, and strike."] }]
  },
  {
    id: "graduation",
    objective: "FLIGHT CERTIFICATION COMPLETE",
    objectiveKind: "confirm",
    dialogue: [{ lines: ["Flight certification confirmed, {CALL_SIGN}.", "Command will remember this."] }]
  }
].map((definition) => Object.freeze({
  ...definition,
  dialogue: Object.freeze(definition.dialogue.map((item) => Object.freeze({
    lines: Object.freeze(item.lines.slice())
  })))
})));

function deterministicTutorialPlan() {
  return {
    movement: [
      { x: 187.5, y: 520, radius: 28 },
      { x: 92, y: 455, radius: 28 },
      { x: 283, y: 410, radius: 28 }
    ],
    auto_weapons: [
      { type: "red", x: 187.5, y: 210, hp: 1, path: "hold" },
      { type: "red", x: 102, y: 188, hp: 1, path: "slow_sweep" },
      { type: "orange", x: 273, y: 176, hp: 1, path: "slow_sweep" }
    ],
    evasion: [
      { x: 82, y: 250, vx: 0, vy: 1.8, kind: "aimed", r: 5 },
      { x: 112, y: 235, vx: 0, vy: 1.8, kind: "aimed", r: 5 },
      { x: 142, y: 220, vx: 0, vy: 1.8, kind: "aimed", r: 5 }
    ],
    ghost_shift: { laneX: 187.5, laneWidth: 44, startSide: "left", targetSide: "right" },
    powerup: { type: "phase_shield", x: 187.5, y: 470, vy: 0.35, size: 14, life: 900 },
    controlled_wave: [
      [
        { type: "red", x: 112, y: -32, delay: 0 },
        { type: "red", x: 263, y: -32, delay: 18 }
      ],
      [
        { type: "orange", x: 88, y: -34, delay: 0 },
        { type: "red", x: 187.5, y: -46, delay: 14 },
        { type: "orange", x: 287, y: -34, delay: 28 }
      ]
    ],
    realm_practice: {
      threat: { x: 187.5, y: 220, vx: 0, vy: 2.1, kind: "wraithPhysical", realm: 0, r: 6 },
      targetRealm: 1
    }
  };
}

function tutorialDefinition(stepId) {
  return TUTORIAL_DEFINITIONS.find((definition) => definition.id === stepId) || TUTORIAL_DEFINITIONS[0];
}

function replaceCallSign(line, callSign) {
  return String(line || "").replaceAll("{CALL_SIGN}", String(callSign || "CADET").slice(0, 12));
}

function createTutorialDirector(stepId = "incoming", callSign = "CADET") {
  const definition = tutorialDefinition(stepId);
  return {
    stepId: definition.id,
    stepIndex: TUTORIAL_STEP_IDS.indexOf(definition.id),
    checkpoint: "incoming",
    objective: definition.objective,
    objectiveKind: definition.objectiveKind,
    objectiveProgress: 0,
    objectiveTarget: 1,
    dialogue: definition.dialogue.map((item) => ({
      lines: item.lines.map((line) => replaceCallSign(line, callSign))
    })),
    dialogueIndex: 0,
    dialogueVisible: definition.dialogue.length > 0,
    dialogueReveal: 0,
    inputMode: "keyboard",
    elapsedFrames: 0,
    hintLevel: 0,
    tutorialKills: 0,
    tutorialBossOverride: null,
    recoveryCount: 0,
    completed: false
  };
}

function tutorialObjectiveComplete(director, runtime = {}) {
  const stepId = director && director.stepId;
  if (stepId === "movement") return Number(runtime.beaconIndex) >= 3;
  if (stepId === "auto_weapons") return Number(runtime.tutorialKills) >= 3;
  if (stepId === "evasion") return runtime.evasionCrossed === true;
  if (stepId === "ghost_shift") return Number(runtime.ghostUses) >= 1 && runtime.ghostLanePhased === true;
  if (stepId === "powerup") return Number(runtime.phaseShield) >= 1;
  if (stepId === "controlled_wave") return runtime.controlledWavesCleared === true;
  if (stepId === "command_boss") return runtime.commandBossDefeated === true;
  if (stepId === "wraith_briefing") return runtime.briefingAcknowledged === true;
  if (stepId === "realm_practice") {
    return Number(runtime.realmHops) >= 1 && runtime.realmThreatAvoided === true && runtime.realmsMatched === true;
  }
  if (stepId === "wraith_boss") {
    return runtime.wraithBossDefeated === true && Number(runtime.realmHops) >= 1 && runtime.matchingRealmDamage === true;
  }
  if (stepId === "incoming" || stepId === "lightspeed" || stepId === "graduation") return runtime.confirmed === true;
  return false;
}

function tutorialReachedSide(playerX, laneX, side) {
  return side === "left" ? Number(playerX) < Number(laneX) : Number(playerX) > Number(laneX);
}

function tutorialEvasionSucceeded(runtime = {}) {
  return runtime.volleyActive === true &&
    tutorialReachedSide(runtime.startX, runtime.laneX, runtime.startSide) &&
    Number(runtime.damageTakenCurrent) === Number(runtime.damageTakenStart) &&
    tutorialReachedSide(runtime.playerX, runtime.laneX, runtime.targetSide);
}

function tutorialGhostLaneSucceeded(runtime = {}) {
  const previousOnStartSide = tutorialReachedSide(runtime.previousX, runtime.laneX, runtime.startSide);
  const currentOnTargetSide = tutorialReachedSide(runtime.currentX, runtime.laneX, runtime.targetSide);
  return Number(runtime.ghostUses) >= 1 &&
    runtime.ghostActive === true &&
    previousOnStartSide &&
    currentOnTargetSide &&
    Number(runtime.damageTakenCurrent) === Number(runtime.damageTakenStart);
}

function applyTutorialBossOverride(boss) {
  if (!boss || (boss.mode !== "standard" && boss.mode !== "wraith")) return boss ? { ...boss } : null;
  const normalMaxHp = Math.max(1, Number(boss.maxHp || boss.hp || 1));
  const maxHp = Math.max(1, Math.round(normalMaxHp * (boss.mode === "wraith" ? 0.22 : 0.25)));
  return {
    ...boss,
    hp: maxHp,
    maxHp,
    tutorialOverride: true,
    tutorialAttackSet: boss.mode === "wraith" ? ["volley", "realm_shift"] : ["aimed", "fan"],
    tutorialRealmSequence: boss.mode === "wraith" ? Object.freeze([0, 1, 0]) : Object.freeze([]),
    tutorialRealmIndex: 0,
    tutorialNoAdds: true
  };
}

function recoverTutorialRuntime(runtime) {
  if (!runtime || typeof runtime !== "object") return runtime;
  runtime.player.hp = runtime.player.maxHp;
  runtime.player.energy = runtime.player.maxEnergy;
  runtime.player.inv = 120;
  for (const key of ["bullets", "enemyBullets", "enemies", "powerups", "debris", "enemyBeams", "gravityWells"]) {
    runtime[key] = [];
  }
  runtime.boss = null;
  return runtime;
}

function applyTutorialGraduationCodex(existing, alreadyApplied) {
  const codex = { ...(existing && typeof existing === "object" ? existing : {}) };
  if (alreadyApplied) return { codex, changed: false };
  for (const id of ["red", "orange", "boss_standard", "boss_wraith"]) codex[id] = true;
  return { codex, changed: true };
}

Object.assign(globalThis, {
  TUTORIAL_DEFINITIONS,
  deterministicTutorialPlan,
  tutorialDefinition,
  createTutorialDirector,
  tutorialObjectiveComplete,
  tutorialEvasionSucceeded,
  tutorialGhostLaneSucceeded,
  applyTutorialBossOverride,
  recoverTutorialRuntime,
  applyTutorialGraduationCodex
});
