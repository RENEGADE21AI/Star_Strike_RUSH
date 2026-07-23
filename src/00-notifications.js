function gameNoticeCategory(text) {
  const value = String(text || "").toUpperCase();
  if (value.includes("DISCOVER") || value.includes("NEW ENEMY") || value.includes("NEW BOSS")) return "discovery";
  if (value.startsWith("PHASE") || value.includes("PHASE CLEAR")) return "phase";
  if (/RAPID|SPREAD|REPAIR|WINGMAN|DUAL|SHIELD|MAGNET|PIERCING|ION|STABILIZER|SURGE|ENERGY|OVERCHARGE/.test(value)) return "powerup";
  if (/BOSS|WARDEN|WRAITH|SIPHON/.test(value)) return "boss";
  if (/WARNING|DEBRIS|DANGER|LOW HP|DISABLED|BROKEN/.test(value)) return "warning";
  return "system";
}

function createGameNotice(text, category = "") {
  const kind = category || gameNoticeCategory(text);
  return {
    text: String(text || "").toUpperCase().slice(0, 34),
    category: kind,
    rail: kind === "discovery" ? "traverse" : "right",
    age: 0,
    duration: kind === "discovery" ? 132 : 96
  };
}

globalThis.gameNoticeCategory = gameNoticeCategory;
globalThis.createGameNotice = createGameNotice;
