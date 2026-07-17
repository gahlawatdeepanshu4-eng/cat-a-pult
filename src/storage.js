const KEY = 'catapult.save.v2';

export const DEFAULT_SAVE = Object.freeze({
  version: 2,
  bestScore: 0,
  totalCatsFired: 0,
});

function defaults() {
  return { ...DEFAULT_SAVE };
}

export function isValidSave(obj) {
  return !!obj
    && typeof obj === 'object'
    && obj.version === 2
    && Number.isFinite(obj.bestScore)
    && Number.isFinite(obj.totalCatsFired);
}

// A save failure must never interrupt a shot, so every path degrades to
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

export function recordRun(save, score, catsFired) {
  return {
    ...save,
    bestScore: Math.max(save.bestScore, score),
    totalCatsFired: save.totalCatsFired + catsFired,
  };
}
