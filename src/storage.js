const KEY = 'catapult.save.v1';

export const DEFAULT_SAVE = Object.freeze({
  version: 1,
  unlockedLevel: 1,
  bestScores: {},
  totalShots: 0,
});

function defaults() {
  return { ...DEFAULT_SAVE, bestScores: {} };
}

export function isValidSave(obj) {
  return !!obj
    && typeof obj === 'object'
    && obj.version === 1
    && Number.isFinite(obj.unlockedLevel)
    && !!obj.bestScores
    && typeof obj.bestScores === 'object'
    && !Array.isArray(obj.bestScores)
    && Number.isFinite(obj.totalShots);
}

// A save failure must never interrupt play, so every path here degrades to
// in-memory defaults rather than throwing.
export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return isValidSave(parsed) ? parsed : defaults();
  } catch {
    return defaults();
  }
}

export function writeSave(save, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function recordClear(save, levelId, score, totalLevels) {
  const key = String(levelId);
  const best = Math.max(save.bestScores[key] ?? 0, score);
  return {
    ...save,
    unlockedLevel: Math.min(Math.max(save.unlockedLevel, levelId + 1), totalLevels),
    bestScores: { ...save.bestScores, [key]: best },
  };
}

export function recordShot(save) {
  return { ...save, totalShots: save.totalShots + 1 };
}
