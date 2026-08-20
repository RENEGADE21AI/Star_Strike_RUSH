const PLAYER_PAUSE_HEALTH_COST = 1;

function pauseHealthDecision(player, reason = "manual", runMode = "standard") {
  const hp = Math.max(0, Math.floor(Number(player && player.hp) || 0));
  const maxHp = Math.max(hp, Math.floor(Number(player && player.maxHp) || hp));
  if (runMode === "tutorial") {
    return {
      allowed: true,
      cost: 0,
      remainingHp: Math.min(hp, maxHp),
      message: reason === "manual"
        ? "TRAINING PAUSED: NO HEALTH COST"
        : "TRAINING AUTO-PAUSED: NO HEALTH COST"
    };
  }
  return {
    allowed: true,
    cost: PLAYER_PAUSE_HEALTH_COST,
    remainingHp: Math.max(0, hp - PLAYER_PAUSE_HEALTH_COST),
    message: reason === "manual" ? "PAUSE COST: 1 HEALTH BAR" : "AUTO-PAUSE COST: 1 HEALTH BAR"
  };
}

globalThis.PLAYER_PAUSE_HEALTH_COST = PLAYER_PAUSE_HEALTH_COST;
globalThis.pauseHealthDecision = pauseHealthDecision;
