function waveTemplateBreather() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -28, 0), waveItem("red", b, -38, 12), waveItem("red", c, -28, 24)]; }
function waveTemplateRedV() { const [a, b, c] = laneCenters(); return [waveItem("red", a - 12, -26, 0), waveItem("red", a + 52, -40, 8), waveItem("red", b, -52, 16), waveItem("red", c - 52, -40, 24), waveItem("red", c + 12, -26, 32)]; }
function waveTemplateRedWall() { const xs = laneCenters(); return [waveItem("red", xs[0] - 28, -30, 0), waveItem("red", xs[0] + 22, -30, 8), waveItem("red", xs[1], -42, 16), waveItem("red", xs[1] + 44, -30, 24), waveItem("red", xs[2] - 22, -30, 32), waveItem("red", xs[2] + 28, -30, 40)]; }
function waveTemplateStaggerMix() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -28, 0), waveItem("orange", b - 34, -40, 8, { motion: "zigzag" }), waveItem("red", b, -52, 16), waveItem("orange", c + 34, -40, 24, { motion: "burst" }), waveItem("red", c, -28, 32)]; }
function waveTemplateOrangePair() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 14, -32, 0, { motion: "zigzag" }), waveItem("red", b, -44, 10), waveItem("red", b - 52, -28, 20), waveItem("orange", c + 14, -32, 30, { motion: "snap" })]; }
function waveTemplateMixedChevron() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -30, 0), waveItem("orange", a + 58, -44, 8, { motion: "zigzag" }), waveItem("red", b, -54, 16), waveItem("orange", c - 58, -44, 24, { motion: "burst" }), waveItem("red", c, -30, 32)]; }
function waveTemplateOrangeRibbon() { const [a, b, c] = laneCenters(); const flip = state.waveIndex % 2 === 0 ? 1 : -1; return [waveItem("orange", b - 110 * flip, -28, 0, { motion: "zigzag" }), waveItem("orange", a + 20 * flip, -44, 8, { motion: "snap" }), waveItem("orange", b, -58, 16, { motion: "burst" }), waveItem("orange", c - 18 * flip, -44, 24, { motion: "zigzag" }), waveItem("orange", b + 120 * flip, -30, 32, { motion: "snap" })]; }
function waveTemplatePurpleGuard() { const [a, b, c] = laneCenters(); return [waveItem("purple", a - 66, -30, 0), waveItem("red", a + 4, -48, 8), waveItem("orange", b - 22, -58, 16, { motion: "burst" }), waveItem("red", c - 4, -48, 24), waveItem("purple", c + 66, -30, 32), waveItem("red", b, -72, 40)]; }
function waveTemplateSplitAmbush() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 100, -30, 0, { motion: "snap" }), waveItem("red", b, -44, 8), waveItem("purple", b, -66, 16), waveItem("red", b + 56, -44, 24), waveItem("orange", c + 100, -30, 32, { motion: "burst" })]; }
function waveTemplateOrangeChain() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 110, -32, 0, { motion: "chain" }), waveItem("orange", a - 56, -42, 8, { motion: "chain" }), waveItem("orange", b, -52, 16, { motion: "chain" }), waveItem("orange", c + 56, -42, 24, { motion: "chain" }), waveItem("orange", c + 110, -32, 32, { motion: "chain" })]; }
function waveTemplateOrangeSlash() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 40, -28, 0, { motion: "sweep" }), waveItem("orange", b + 16, -44, 10, { motion: "sweep" }), waveItem("orange", c - 20, -58, 20, { motion: "sweep" }), waveItem("orange", c + 76, -36, 30, { motion: "sweep" })]; }
function waveTemplatePhantomProbe() { const [a, b, c] = laneCenters(); return [waveItem("phantom", b + rand(-16, 16), -46, 0), waveItem("phantom", a + rand(-12, 12), -62, 12), waveItem("phantom", c + rand(-12, 12), -62, 24)]; }
function waveTemplatePhantomPair() { const [a, b, c] = laneCenters(); return [waveItem("phantom", a + rand(-8, 8), -48, 0), waveItem("phantom", c + rand(-8, 8), -48, 18), waveItem("phantom", b + rand(-8, 8), -70, 30)]; }
function waveTemplatePhantomFan() { const [a, b, c] = laneCenters(); return [waveItem("phantom", b, -54, 0), waveItem("phantom", a - 24, -58, 12), waveItem("phantom", c + 24, -58, 24)]; }
const waveTemplates = { breather: waveTemplateBreather, redV: waveTemplateRedV, redWall: waveTemplateRedWall, staggerMix: waveTemplateStaggerMix, orangePair: waveTemplateOrangePair, mixedChevron: waveTemplateMixedChevron, orangeRibbon: waveTemplateOrangeRibbon, purpleGuard: waveTemplatePurpleGuard, splitAmbush: waveTemplateSplitAmbush, orangeChain: waveTemplateOrangeChain, orangeSlash: waveTemplateOrangeSlash, phantomProbe: waveTemplatePhantomProbe, phantomPair: waveTemplatePhantomPair, phantomFan: waveTemplatePhantomFan };
function pickWeightedTemplate(pool, avoidName = null) {
  const filtered = avoidName ? pool.filter(([name]) => name !== avoidName) : pool.slice();
  const list = filtered.length > 0 ? filtered : pool.slice();
  const total = list.reduce((sum, item) => sum + item[1], 0);
  let roll = Math.random() * total;
  for (const [name, weight] of list) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return list[list.length - 1][0];
}
function selectWaveTemplate() {
  const mood = state.waveMood || "open";
  const phaseTier = state.phase < 4 ? "early" : state.phase < 9 ? "mid" : "late";
  let pool;
  if (state.phase === 1) {
    const lateOpening = state.phaseTimer > phaseDuration(1) * 0.55;
    if (mood === "recovery") pool = [["breather", 9], ["redV", 3]];
    else if (lateOpening) pool = [["breather", 7], ["redV", 4], ["redWall", 1]];
    else pool = [["breather", 8], ["redV", 2]];
  } else if (mood === "recovery") {
    pool = phaseTier === "early"
      ? [["breather", 6], ["redV", 3], ["orangePair", 4], ["staggerMix", 2]]
      : phaseTier === "mid"
      ? [["breather", 4], ["redV", 3], ["orangePair", 4], ["staggerMix", 3], ["mixedChevron", 2]]
      : [["breather", 3], ["redV", 2], ["orangePair", 3], ["staggerMix", 2], ["mixedChevron", 2], ["orangeSlash", 1]];
  } else if (mood === "spike") {
    pool = phaseTier === "early"
      ? [["redWall", 4], ["staggerMix", 3], ["mixedChevron", 3], ["orangeChain", 2]]
      : phaseTier === "mid"
      ? [["redWall", 4], ["mixedChevron", 3], ["orangeRibbon", 2], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeSlash", 2]]
      : [["redWall", 3], ["orangeRibbon", 3], ["purpleGuard", 4], ["splitAmbush", 4], ["orangeChain", 2], ["orangeSlash", 3]];
  } else if (mood === "rule") {
    if (state.phase >= 5) {
      pool = phaseTier === "early"
        ? [["phantomProbe", 5], ["phantomPair", 4], ["breather", 2], ["mixedChevron", 2]]
        : phaseTier === "mid"
        ? [["phantomProbe", 4], ["phantomPair", 4], ["phantomFan", 3], ["mixedChevron", 2], ["purpleGuard", 2]]
        : [["phantomProbe", 3], ["phantomPair", 4], ["phantomFan", 4], ["purpleGuard", 2], ["splitAmbush", 2]];
    } else {
      pool = phaseTier === "early"
        ? [["mixedChevron", 4], ["orangePair", 4], ["staggerMix", 3], ["redV", 2]]
        : phaseTier === "mid"
        ? [["purpleGuard", 4], ["splitAmbush", 3], ["orangeChain", 3], ["mixedChevron", 2]]
        : [["purpleGuard", 4], ["splitAmbush", 4], ["orangeRibbon", 3], ["orangeSlash", 2]];
    }
  } else {
    pool = phaseTier === "early"
      ? [["breather", 5], ["redV", 4], ["orangePair", 4], ["mixedChevron", 2]]
      : phaseTier === "mid"
      ? [["staggerMix", 4], ["orangePair", 4], ["mixedChevron", 4], ["orangeChain", 2], ["purpleGuard", 1]]
      : [["orangeRibbon", 3], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeChain", 3], ["orangeSlash", 2], ["mixedChevron", 2]];
    if (state.phase >= 5) pool.push(["phantomProbe", 1], ["phantomPair", 1], ["phantomFan", 1]);
  }
  if (state.phase >= 3) pool.push(["splitterPair", mood === "spike" ? 3 : 1]);
  if (state.phase >= 4 && mood !== "recovery") pool.push(["mineLane", mood === "rule" ? 2 : 1]);
  if (state.phase >= 5) pool.push(["siphonEscort", mood === "rule" ? 3 : 1]);
  if (state.phase >= 5 && mood !== "recovery") pool.push(["supportCell", 1]);
  if (state.phase >= 6 && mood === "spike") pool.push(["carrierPriority", 2]);
  if (state.phase >= 6 && mood === "rule") pool.push(["leechPressure", 2]);
  if (state.phase >= 7 && mood !== "recovery") pool.push(["railWarning", 1]);
  if (state.phase >= 6 && mood !== "open") pool.push(["repairGuard", 1]);
  const name = pickWeightedTemplate(pool, state.lastWaveTemplateName);
  return { name, fn: waveTemplates[name] };
}
function templateDensity(events) {
  let d = 0;
  for (const ev of events) {
    const data = ENEMY_DATA[ev.type];
    if (data && data.threat) d += data.threat;
    else d += 1.0;
  }
  return d;
}
function discoverCodex(type) {
  if (!codexDiscovered[type]) {
    codexDiscovered[type] = true;
    saveCodexDiscovered();
    const meta = typeof getCodexMeta === "function" ? getCodexMeta(type) : null;
    pushGameNotice(`DISCOVERED ${meta && meta.shortName ? meta.shortName : type}`, "discovery");
    codexHasNew = true;
  }
}
function spawnWave() {
  const sel = selectWaveTemplate();
  const events = sel.fn ? sel.fn() : [];
  state.lastWaveTemplateName = sel.name;
  state.pendingSpawns.push(...events);
  const density = templateDensity(events);
  if (state.phase >= 3 && state.waveMood === "spike" && density < 4.8) {
    const followName = Math.random() < 0.6 ? "mixedChevron" : "redWall";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 28 + Math.floor(rand(0, 18));
    state.pendingSpawns.push(...follow);
  }
  if (state.waveMood === "rule" && state.phase >= 5 && density < 4.8) {
    const followName = Math.random() < 0.5 ? "phantomPair" : "phantomFan";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 36 + Math.floor(rand(0, 20));
    state.pendingSpawns.push(...follow);
  }
  if (state.phase >= 3 && density >= 5.5) {
    const followName = Math.random() < 0.5 ? "breather" : "orangePair";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 34 + Math.floor(rand(0, 20));
    state.pendingSpawns.push(...follow);
    state.waveRest = Math.max(state.waveRest, 18 + Math.floor(rand(0, 12)));
  } else if (density >= 4.0) {
    state.waveRest = Math.max(state.waveRest, 12 + Math.floor(rand(0, 8)));
  }
  if (state.waveMood === "recovery") state.waveRest = Math.max(state.waveRest, 18 + Math.floor(rand(0, 12)));
  else if (state.waveMood === "spike") state.waveRest = Math.max(state.waveRest, 8 + Math.floor(rand(0, 8)));
  else if (state.waveMood === "rule") state.waveRest = Math.max(state.waveRest, 12 + Math.floor(rand(0, 8)));
  state.waveIndex++;
}

