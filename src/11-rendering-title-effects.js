function drawTitleSun() {
  const x = W * 0.80, y = H * 0.18;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 10, x, y, 190);
  g.addColorStop(0, "rgba(255,235,160,0.34)");
  g.addColorStop(0.25, "rgba(255,180,90,0.18)");
  g.addColorStop(1, "rgba(255,110,40,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 190, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "rgba(255,220,140,0.9)";
  ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawMenuFlights() {
  for (const f of state.titleFormations) {
    const offsets = TITLE_PATTERNS[f.pattern] || TITLE_PATTERNS.vee;
    const shipAngle = f.angle;
    const shipScale = f.renderScale || 0.68;
    const overPrimaryUi = f.x > 38 && f.x < W - 38 && f.y > H * 0.14 && f.y < H * 0.66;
    const formationAlpha = (f.renderAlpha || 0.72) * (overPrimaryUi ? 0.28 : 1);
    ctx.save();
    ctx.globalAlpha = formationAlpha;
    for (let i = 0; i < offsets.length; i++) {
      const [ox, oy] = offsets[i];
      const histIndex = Math.max(0, f.leaderHistory.length - 6 - i * 2);
      const histPos = i === 0 ? { x: f.x, y: f.y } : (f.leaderHistory[histIndex] || { x: f.x, y: f.y });
      const wobble = Math.sin(state.frame * 0.055 + i * 2.1 + f.sway) * 2.8;
      drawFormationShip(
        f.kind,
        histPos.x + ox,
        histPos.y + oy + wobble,
        shipScale,
        shipAngle
      );
    }
    ctx.restore();
  }
}

function drawEncounterCard() {
  if (!encounterCard) return;
  const t = encounterCard.timer;
  const dur = encounterCard.maxTimer;
  const enter = clamp(t / 18, 0, 1);
  const exit = clamp((dur - t) / 24, 0, 1);
  const visibility = Math.min(enter, exit);
  const cardW = 230, cardH = 68;
  const settledX = W - cardW - 10;
  const cardX = settledX + (1 - easeOutCubic(enter)) * (cardW + 18);
  const cardY = 108;
  const typeColors = { red:"#e44", orange:"#f93", purple:"#b4f", phantom:"#0ff", boss_standard:"#6ff", boss_wraith:"#d9b6ff" };
  const meta = typeof getCodexMeta === "function" ? getCodexMeta(encounterCard.type) : { color: "#fff", name: encounterCard.type.toUpperCase(), trait: "" };
  const borderColor = meta.color || "#fff";
  const names = { red:"RED FIGHTER", orange:"ORANGE RAIDER", purple:"PURPLE GUARD", phantom:"PHANTOM", boss_standard:"COMMAND SHIP", boss_wraith:"WRAITH SOVEREIGN" };
  const traits = { red:"Drifts and swarms", orange:"Fast, erratic movement", purple:"Slow — charged aimed shots", phantom:"Phase-shifts between realms", boss_standard:"Heavy weapons platform", boss_wraith:"Controls reality itself" };
  ctx.save();
  ctx.globalAlpha = 0.34 + visibility * 0.58;
  ctx.fillStyle = "rgba(0,0,12,0.74)";
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.fill();
  ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.stroke();
  ctx.fillStyle = borderColor;
  ctx.font = FONT_TINY;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const blink = Math.floor(state.frame / 18) % 2 === 0 ? "●" : "○";
  const cardLabel = encounterCard.type.startsWith("boss") ? "NEW BOSS" : "NEW ENEMY";
  ctx.fillText(blink + " " + cardLabel, cardX + 62, cardY + 8);
  ctx.save();
  ctx.translate(cardX + 32, cardY + cardH / 2 + 2);
  drawEncounterShipGraphic(encounterCard.type, {
    scale: encounterCard.type.startsWith("boss") ? 0.32 : 0.55,
    silhouette: false,
    stateMode: "physical",
    realm: 0
  });
  ctx.restore();
  ctx.fillStyle = "#fff"; ctx.font = FONT_HUD;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(meta.name || encounterCard.type.toUpperCase(), cardX + 62, cardY + cardH * 0.43);
  ctx.fillStyle = "rgba(255,255,255,0.58)"; ctx.font = FONT_SMALL;
  ctx.fillText(String(meta.trait || "").slice(0, 27), cardX + 62, cardY + cardH * 0.70);
  ctx.restore();
}

