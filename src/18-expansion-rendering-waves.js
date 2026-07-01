function expansionShipColor(primary, hitMix = 0, silhouette = false, hit = "#fff") {
  return silhouette ? "rgba(50,50,50,0.95)" : mixHex(primary, hit, hitMix * 0.18);
}

function drawExpansionEngineFlame(yOffset, width, height, phase, alpha = 0.40, color = "orange") {
  if (alpha <= 0) return;
  const flicker = 1 + Math.sin(state.frame * 0.35 + phase) * 0.22;
  const reach = height * flicker;
  const outer = color === "green" ? "rgba(90,255,120,0.68)" : color === "red" ? "rgba(255,80,70,0.68)" : "rgba(255,150,50,0.70)";
  const inner = color === "green" ? "rgba(210,255,190,0.84)" : color === "red" ? "rgba(255,210,170,0.84)" : "rgba(255,240,150,0.85)";
  ctx.save();
  ctx.globalAlpha = alpha * 0.86;
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-width * 0.55, yOffset);
  ctx.lineTo(0, yOffset + reach);
  ctx.lineTo(width * 0.55, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha * 0.68;
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, yOffset);
  ctx.lineTo(0, yOffset + reach * 0.70);
  ctx.lineTo(width * 0.22, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawExpansionCanopy(x, y, rx, ry, tint, silhouette) {
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(255,255,255,0.82)";
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  if (silhouette) return;
  ctx.fillStyle = tint;
  ctx.beginPath(); ctx.ellipse(x - rx * 0.18, y - ry * 0.20, rx * 0.38, ry * 0.45, -0.2, 0, TAU); ctx.fill();
}

function drawExpansionPanelLine(x1, y1, x2, y2, color, width = 1.2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawExpansionEnemyGeometry(kind, opts = {}) {
  if (!isExpansionEnemyType(kind) && !(kind && kind.startsWith("boss_") && isExpansionBossMode(kind.slice(5)))) return false;
  const hitMix = opts.hitMix || 0;
  const silhouette = !!opts.silhouette;
  const phase = opts.phase || 0;
  const colorFor = (primary, hit = "#fff") => expansionShipColor(primary, hitMix, silhouette, hit);
  if (!silhouette) {
    const meta = getCodexMeta(kind);
    ctx.shadowColor = meta && meta.color ? meta.color : "rgba(255,255,255,0.20)";
    ctx.shadowBlur = kind === "repair_drone" ? 5 : 7;
  }
  if (kind === "splitter") {
    const hull = colorFor("#baff36", "#fff4aa");
    const armor = colorFor("#6fa51e", "#eaff9a");
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-22, 8); ctx.lineTo(-12, 14); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(22, 8); ctx.lineTo(12, 14); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-13, -4); ctx.lineTo(-9, 11); ctx.lineTo(0, 16); ctx.lineTo(9, 11); ctx.lineTo(13, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colorFor("#d8ff63", "#fffbd0");
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-5, -6); ctx.lineTo(0, -2); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = silhouette ? "rgba(50,50,50,0.95)" : "#ff6538";
    ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-1, 1); ctx.lineTo(-4, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(2, -2); ctx.lineTo(9, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, 5); ctx.lineTo(5, 12); ctx.stroke();
    drawExpansionCanopy(0, 1, 3.4, 4.8, "rgba(255,120,70,0.70)", silhouette);
    if (!silhouette) drawExpansionEngineFlame(13, 6.5, 7.2, phase, 0.36);
  } else if (kind === "splitter_shard") {
    ctx.fillStyle = colorFor("#ffb23d", "#fff0a8");
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-8, 4); ctx.lineTo(-2, 11); ctx.lineTo(8, -1); ctx.lineTo(3, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colorFor("#baff36", "#fff4aa");
    ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-5, 4); ctx.lineTo(0, 7); ctx.lineTo(5, -2); ctx.closePath(); ctx.fill();
    if (!silhouette) {
      drawExpansionPanelLine(-4, 1, 4, 5, "rgba(255,90,55,0.84)", 1.4);
      drawExpansionEngineFlame(7, 3.6, 4.8, phase, 0.30);
    }
  } else if (kind === "carrier") {
    const hull = colorFor("#c8892f", "#ffe0a3");
    const dark = colorFor("#7a4a1e", "#ffc86a");
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-31, 7); ctx.lineTo(-24, 17); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(31, 7); ctx.lineTo(24, 17); ctx.lineTo(10, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-25, -9); ctx.lineTo(-27, 8); ctx.lineTo(-14, 19); ctx.lineTo(14, 19); ctx.lineTo(27, 8); ctx.lineTo(25, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colorFor("#ffd67a", "#fff1c0");
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-11, -8); ctx.lineTo(0, -4); ctx.lineTo(11, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(30,18,8,0.58)";
    ctx.beginPath(); ctx.roundRect(-18, 3, 12, 11, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(6, 3, 12, 11, 3); ctx.fill();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(255,214,122,0.55)";
    ctx.fillRect(-16, 5, 8, 2); ctx.fillRect(8, 5, 8, 2);
    drawExpansionCanopy(0, -5, 4.7, 5.5, "rgba(255,215,122,0.74)", silhouette);
    if (!silhouette) {
      drawExpansionPanelLine(-22, -3, -7, 15, "rgba(255,230,165,0.35)");
      drawExpansionPanelLine(22, -3, 7, 15, "rgba(255,230,165,0.35)");
      drawExpansionEngineFlame(-3, 4, 5.8, phase + 0.4, 0.30);
      ctx.save();
      ctx.translate(-11, 18); drawExpansionEngineFlame(0, 5, 7, phase, 0.36); ctx.restore();
      ctx.save();
      ctx.translate(11, 18); drawExpansionEngineFlame(0, 5, 7, phase + 1.1, 0.36); ctx.restore();
    }
  } else if (kind === "siphon") {
    const hull = colorFor("#48e52f", "#d9ffd0");
    const dark = colorFor("#12351a", "#b8ffb0");
    ctx.strokeStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(160,255,120,0.88)";
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-20, -17); ctx.lineTo(-14, -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(20, -17); ctx.lineTo(14, -3); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-19, 10); ctx.lineTo(-10, 15); ctx.lineTo(-3, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(19, 10); ctx.lineTo(10, 15); ctx.lineTo(3, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-11, -5); ctx.lineTo(-8, 11); ctx.lineTo(0, 15); ctx.lineTo(8, 11); ctx.lineTo(11, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#102610";
    ctx.beginPath(); ctx.arc(0, -1, 5.6, 0, TAU); ctx.fill();
    if (!silhouette) {
      ctx.fillStyle = "rgba(112,255,69,0.92)";
      ctx.beginPath(); ctx.arc(0, -1, 3.2 + Math.sin(state.frame * 0.13 + phase) * 0.7, 0, TAU); ctx.fill();
      drawExpansionPanelLine(-5, -10, -1, 9, "rgba(210,255,190,0.38)");
      drawExpansionPanelLine(5, -10, 1, 9, "rgba(210,255,190,0.38)");
      drawExpansionEngineFlame(13, 6, 7, phase, 0.36, "green");
    }
  } else if (kind === "leech") {
    const hull = colorFor("#103b1f", "#56ff8d");
    const black = colorFor("#07150c", "#32ff76");
    ctx.fillStyle = black;
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-23, 2); ctx.lineTo(-18, 13); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(23, 2); ctx.lineTo(18, 13); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-12, -5); ctx.lineTo(-8, 7); ctx.lineTo(-2, 15); ctx.lineTo(0, 11); ctx.lineTo(2, 15); ctx.lineTo(8, 7); ctx.lineTo(12, -5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = silhouette ? "rgba(50,50,50,0.95)" : "#1cff78";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -1, 7, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.quadraticCurveTo(-20, -13, -13, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -6); ctx.quadraticCurveTo(20, -13, 13, -18); ctx.stroke();
    if (!silhouette) {
      ctx.fillStyle = "rgba(28,255,120,0.72)";
      ctx.beginPath(); ctx.arc(0, -1, 3.2 + Math.sin(state.frame * 0.14 + phase) * 0.6, 0, TAU); ctx.fill();
      drawExpansionEngineFlame(12.5, 5.6, 6.5, phase, 0.28, "green");
    }
  } else if (kind === "minecaster") {
    const hull = colorFor("#191615", "#ff7840");
    const armor = colorFor("#3a2620", "#ff9a55");
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-23, 7); ctx.lineTo(-16, 14); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(23, 7); ctx.lineTo(16, 14); ctx.lineTo(8, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-14, -8); ctx.lineTo(-16, 8); ctx.lineTo(-7, 16); ctx.lineTo(7, 16); ctx.lineTo(16, 8); ctx.lineTo(14, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#ff6a2d";
    ctx.fillRect(-10, -6, 4, 4); ctx.fillRect(6, -6, 4, 4);
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.50)";
    ctx.beginPath(); ctx.roundRect(-6, 7, 12, 7, 3); ctx.fill();
    if (!silhouette) {
      drawExpansionPanelLine(-12, 1, 12, 1, "rgba(255,106,45,0.45)");
      ctx.fillStyle = "rgba(255,106,45,0.80)";
      ctx.beginPath(); ctx.arc(0, 10.5, 2.2, 0, TAU); ctx.fill();
      drawExpansionEngineFlame(14, 5.8, 6.8, phase, 0.34, "red");
    }
  } else if (kind === "shieldbearer") {
    const hull = colorFor("#8b949b", "#e8f2ff");
    const plate = colorFor("#5f6970", "#d9ecff");
    ctx.fillStyle = plate;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-23, 7); ctx.lineTo(-14, 14); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(23, 7); ctx.lineTo(14, 14); ctx.lineTo(7, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-14, -5); ctx.lineTo(-10, 13); ctx.lineTo(10, 13); ctx.lineTo(14, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colorFor("#d8e0e6", "#fff");
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-5, 0); ctx.lineTo(0, 5); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = silhouette ? "rgba(50,50,50,0.95)" : "#ffe45c";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(state.frame * 0.09 + phase) * 2, 0, TAU); ctx.stroke();
    if (!silhouette) {
      ctx.strokeStyle = "rgba(255,228,92,0.28)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(state.frame * 0.09 + phase) * 2, 0, TAU); ctx.stroke();
      drawExpansionEngineFlame(12, 5.8, 6.5, phase, 0.32);
    }
  } else if (kind === "railgunner") {
    const hull = colorFor("#2a0d13", "#ff6a73");
    const red = colorFor("#ff3046", "#ffd0d4");
    ctx.fillStyle = colorFor("#12070a", "#ff5562");
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-18, 8); ctx.lineTo(-10, 13); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(18, 8); ctx.lineTo(10, 13); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-9, -4); ctx.lineTo(-7, 11); ctx.lineTo(0, 16); ctx.lineTo(7, 11); ctx.lineTo(9, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = red;
    ctx.beginPath(); ctx.roundRect(-3, -30, 6, 21, 2); ctx.fill();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(255,48,70,0.55)";
    ctx.fillRect(-1.2, -31, 2.4, 31);
    drawExpansionCanopy(0, 1, 3.1, 4.4, "rgba(255,48,70,0.76)", silhouette);
    if (!silhouette) {
      ctx.strokeStyle = "rgba(255,48,70,0.60)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(8, -3); ctx.stroke();
      drawExpansionEngineFlame(14, 5.2, 6.2, phase, 0.30, "red");
    }
  } else if (kind === "repair_drone") {
    const hull = colorFor("#aeb7b8", "#f4ffff");
    const arm = colorFor("#6d7779", "#e8ffff");
    ctx.fillStyle = arm;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-18, 6); ctx.lineTo(-14, 11); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(18, 6); ctx.lineTo(14, 11); ctx.lineTo(5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-10, -5); ctx.lineTo(-9, 8); ctx.lineTo(0, 13); ctx.lineTo(9, 8); ctx.lineTo(10, -5); ctx.closePath(); ctx.fill();
    drawExpansionCanopy(0, -1, 3.4, 4.2, "rgba(159,255,192,0.72)", silhouette);
    ctx.strokeStyle = silhouette ? "rgba(50,50,50,0.95)" : "#9fffc0";
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
    ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#9fffc0";
    ctx.fillRect(-1.7, 4, 3.4, 8); ctx.fillRect(-4.2, 7, 8.4, 3);
    if (!silhouette) {
      ctx.fillStyle = "rgba(159,255,192,0.72)";
      ctx.beginPath(); ctx.arc(-9, 8, 1.8 + Math.sin(state.frame * 0.2) * 0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(9, 8, 1.8 + Math.cos(state.frame * 0.2) * 0.4, 0, TAU); ctx.fill();
      drawExpansionEngineFlame(11.5, 4.4, 5.8, phase, 0.28, "green");
    }
  } else if (kind && kind.startsWith("boss_")) {
    drawExpansionBossShip(kind.slice(5), silhouette, opts.alpha == null ? 1 : opts.alpha);
  } else {
    return false;
  }
  return true;
}

function drawExpansionBossShip(mode, silhouette = false, alpha = 1) {
  const meta = getCodexMeta("boss_" + mode);
  if (!silhouette) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 14;
  }
  const hull = silhouette ? "rgba(50,50,50,0.95)" : meta.color;
  const dark = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.28)";
  ctx.fillStyle = hull;
  if (mode === "mothership") {
    ctx.beginPath(); ctx.roundRect(-82, -30, 164, 60, 14); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-62, 4, 28, 18); ctx.fillRect(-14, 4, 28, 18); ctx.fillRect(34, 4, 28, 18);
  } else if (mode === "debris_warden") {
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-64, -22); ctx.lineTo(-78, 8); ctx.lineTo(-28, 34); ctx.lineTo(28, 34); ctx.lineTo(78, 8); ctx.lineTo(64, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-52, -12, 104, 12); ctx.fillRect(-24, 10, 48, 14);
  } else if (mode === "siphon_core") {
    ctx.beginPath(); ctx.ellipse(0, -2, 64, 40, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, -2, 20, 0, TAU); ctx.fill();
    ctx.strokeStyle = silhouette ? hull : "#70ff45"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -2, 30, 0, TAU); ctx.stroke();
  } else if (mode === "hive_breaker") {
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-58, -18); ctx.lineTo(-48, 24); ctx.lineTo(0, 38); ctx.lineTo(48, 24); ctx.lineTo(58, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = silhouette ? hull : "#ff7a3d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-28, -12); ctx.lineTo(8, 8); ctx.lineTo(-8, 27); ctx.stroke();
  } else if (mode === "rail_tyrant") {
    ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(-46, -18); ctx.lineTo(-38, 26); ctx.lineTo(0, 36); ctx.lineTo(38, 26); ctx.lineTo(46, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = silhouette ? hull : "#ff3046"; ctx.fillRect(-6, -58, 12, 38);
  } else if (mode === "gravity_well") {
    ctx.beginPath(); ctx.ellipse(0, 0, 68, 38, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = silhouette ? hull : "rgba(200,120,255,0.86)";
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 26 + i * 15, 13 + i * 8, state.frame * 0.01 + i, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

function drawExpansionEnemyOverlay(e) {
  if (!e) return;
  if (e.shieldedBy) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,228,92,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7 + Math.sin(state.frame * 0.14) * 1.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (e.isRepairTarget) {
    ctx.save();
    ctx.strokeStyle = "rgba(159,255,192,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (e.type === "leech") {
    ctx.save();
    if (e.tetherActive) {
      ctx.strokeStyle = "rgba(28,255,120,0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(state.player.x, state.player.y); ctx.stroke();
    } else if ((e.lockTimer || 0) < 38) {
      ctx.strokeStyle = "rgba(28,255,120,0.36)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 30 + Math.sin(state.frame * 0.18) * 4, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  if (e.type === "railgunner" && e.railWarn > 0) {
    ctx.save();
    const a = e.railAngle || Math.PI / 2;
    ctx.strokeStyle = `rgba(255,48,70,${0.25 + 0.45 * (1 - e.railWarn / 46)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(e.x, e.y + 13); ctx.lineTo(e.x + Math.cos(a) * H, e.y + 13 + Math.sin(a) * H); ctx.stroke();
    ctx.restore();
  }
}

function drawExpansionHazards() {
  for (const g of state.gravityWells) {
    ctx.save();
    const alpha = g.warn > 0 ? 0.26 + Math.sin(state.frame * 0.24) * 0.10 : 0.34;
    ctx.strokeStyle = (g.color || "#a45cff").replace(")", `,${alpha})`);
    ctx.strokeStyle = g.color || "#a45cff";
    ctx.globalAlpha = g.warn > 0 ? 0.30 : 0.42;
    ctx.lineWidth = g.warn > 0 ? 2 : 3;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha *= 0.35;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * (0.55 + Math.sin(g.pulse || 0) * 0.08), 0, TAU); ctx.stroke();
    ctx.restore();
  }
  for (const d of state.debris) {
    ctx.save();
    if (d.kind === "meteor_warning") {
      ctx.globalAlpha = 0.55 + Math.sin(state.frame * 0.28) * 0.18;
      ctx.strokeStyle = "#ffb35b";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 8, 0, TAU); ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot || 0);
    if (d.trail) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#c4eaff";
      ctx.beginPath(); ctx.moveTo(0, d.r); ctx.lineTo(-8, d.r + 34); ctx.lineTo(8, d.r + 34); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (d.kind === "mine" || d.kind === "energy_mine") {
      const armed = d.armed || d.armTimer <= 0;
      ctx.fillStyle = d.kind === "energy_mine" ? "#12331a" : "#171312";
      ctx.beginPath(); ctx.arc(0, 0, d.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = d.kind === "energy_mine" ? "#70ff45" : "#ff6a2d";
      ctx.lineWidth = armed ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(0, 0, d.r + (armed ? Math.sin(state.frame * 0.22) * 2 : 0), 0, TAU); ctx.stroke();
      ctx.fillStyle = d.kind === "energy_mine" ? "#70ff45" : "#ff6a2d";
      ctx.fillRect(-2, -2, 4, 4);
    } else {
      ctx.fillStyle = d.color || "#8f8170";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        const r = d.r * (0.78 + ((i * 13) % 7) * 0.045);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      if (d.wall) {
        ctx.strokeStyle = "rgba(255,220,150,0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (const beam of state.enemyBeams) {
    ctx.save();
    const active = beam.warn <= 0;
    const alpha = active ? 0.82 : 0.22 + (1 - beam.warn / Math.max(1, beam.warnMax || beam.warn || 1)) * 0.36;
    ctx.strokeStyle = beam.color || "#ff3046";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = active ? beam.width : Math.max(2, beam.width * 0.38);
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x + Math.cos(beam.angle) * beam.length, beam.y + Math.sin(beam.angle) * beam.length);
    ctx.stroke();
    if (active) {
      ctx.globalAlpha = 0.30;
      ctx.lineWidth = beam.width + 9;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawExpansionBoss(b) {
  if (!b || !isExpansionBossMode(b.mode)) return false;
  const hpPct = b.hp / b.maxHp;
  const bob = Math.sin(state.frame * 0.04 + b.movePhase) * 1.5;
  ctx.save();
  ctx.translate(b.x, b.y + bob);
  ctx.rotate(Math.sin(state.frame * 0.022 + b.movePhase) * 0.025);
  drawExpansionBossShip(b.mode, false, 1);
  if (b.warn > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(b.w, b.h) * 0.34 + Math.sin(state.frame * 0.22) * 4, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  const barW = Math.min(320, W - 40), barX = (W - barW) / 2, barY = 16;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(barX, barY, barW, 10);
  ctx.fillStyle = getCodexMeta("boss_" + b.mode).color;
  ctx.fillRect(barX, barY, barW * hpPct, 10);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(barX, barY, barW, 10);
  return true;
}

function registerExpansionWaveTemplates() {
  waveTemplates.splitterPair = function waveTemplateSplitterPair() {
    const [a, b, c] = laneCenters();
    return [waveItem("red", a, -28, 0), waveItem("splitter", b, -52, 16), waveItem("red", c, -28, 32)];
  };
  waveTemplates.mineLane = function waveTemplateMineLane() {
    const [a, b, c] = laneCenters();
    return [waveItem("minecaster", a, -40, 0), waveItem("orange", b, -54, 18, { motion: "sweep" }), waveItem("red", c, -30, 34)];
  };
  waveTemplates.siphonEscort = function waveTemplateSiphonEscort() {
    const [a, b, c] = laneCenters();
    return [waveItem("red", a, -28, 0), waveItem("siphon", b, -54, 14), waveItem("orange", c, -34, 30, { motion: "burst" })];
  };
  waveTemplates.supportCell = function waveTemplateSupportCell() {
    const [a, b, c] = laneCenters();
    return [waveItem("shieldbearer", b, -58, 0), waveItem("red", a, -34, 12), waveItem("purple", c, -38, 24)];
  };
  waveTemplates.carrierPriority = function waveTemplateCarrierPriority() {
    const [a, b, c] = laneCenters();
    return [waveItem("carrier", b, -62, 0), waveItem("orange", a, -28, 22, { motion: "snap" }), waveItem("red", c, -26, 34)];
  };
  waveTemplates.leechPressure = function waveTemplateLeechPressure() {
    const [a, b, c] = laneCenters();
    return [waveItem("leech", b + rand(-22, 22), -58, 0), waveItem("red", a, -32, 20), waveItem("orange", c, -38, 34, { motion: "zigzag" })];
  };
  waveTemplates.railWarning = function waveTemplateRailWarning() {
    const [a, b, c] = laneCenters();
    return [waveItem("railgunner", b, -58, 0), waveItem("red", a, -30, 18), waveItem("red", c, -30, 30)];
  };
  waveTemplates.repairGuard = function waveTemplateRepairGuard() {
    const [a, b, c] = laneCenters();
    return [waveItem("purple", b, -52, 0), waveItem("repair_drone", a, -36, 16), waveItem("red", c, -28, 30)];
  };
}

registerExpansionWaveTemplates();
