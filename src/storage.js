import { TOTAL_LEVELS } from './constants.js';

const KEY = 'catapult.save.v3';

export const DEFAULT_SAVE = Object.freeze({
  version: 3,
  unlockedLevel: 1,
  bestScores: {},
});

function defaults() {
  return { ...DEFAULT_SAVE, bestScores: {} };
}

export function isValidSave(obj) {
  return !!obj
    && typeof obj === 'object'
    && obj.version === 3
    && Number.isFinite(obj.unlockedLevel)
    && !!obj.bestScores
    && typeof obj.bestScores === 'object'
    && !Array.isArray(obj.bestScores);
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

export function recordClear(save, level, score) {
  const key = String(level);
  return {
    ...save,
    // Unlock the next level (capped at this build's last), but never lower an
    // already-higher unlock — so clearing a sampler level cannot shrink the
    // progress of a save made in the longer campaign.
    unlockedLevel: Math.max(save.unlockedLevel, Math.min(level + 1, TOTAL_LEVELS)),
    bestScores: { ...save.bestScores, [key]: Math.max(save.bestScores[key] ?? 0, score) },
  };
}
