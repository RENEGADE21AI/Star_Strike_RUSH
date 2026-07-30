const PLAYER_PAUSE_HEALTH_COST = 1;

function pauseHealthDecision(player, reason = "manual", runMode = "standard") {
  const hp = Math.max(0, Math.floor(Number(player && player.hp) || 0));
  const maxHp = Math.max(hp, Math.floor(Number(player && player.maxHp) || hp));
  if (runMode === "tutorial" && reason === "manual") {
    return {
      allowed: true,
      cost: 0,
      remainingHp: Math.min(hp, maxHp),
      message: "TRAINING PAUSED: NO HEALTH COST"
    };
  }
  if (reason !== "manual") {
    const cost = Math.min(PLAYER_PAUSE_HEALTH_COST, hp);
    return {
      allowed: true,
      cost,
      remainingHp: Math.max(0, Math.min(hp, maxHp) - cost),
      message: cost ? "AUTO-PAUSE COST: 1 HEALTH BAR" : "AUTO-PAUSED"
    };
  }
  if (hp <= PLAYER_PAUSE_HEALTH_COST) {
    return {
      allowed: false,
      cost: 0,
      remainingHp: hp,
      message: "PAUSE NEEDS 1 SPARE HEALTH BAR"
    };
  }
  return {
    allowed: true,
    cost: PLAYER_PAUSE_HEALTH_COST,
    remainingHp: hp - PLAYER_PAUSE_HEALTH_COST,
    message: "PAUSE COST: 1 HEALTH BAR"
  };
}

globalThis.PLAYER_PAUSE_HEALTH_COST = PLAYER_PAUSE_HEALTH_COST;
globalThis.pauseHealthDecision = pauseHealthDecision;
