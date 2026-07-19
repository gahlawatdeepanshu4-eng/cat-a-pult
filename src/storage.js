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

// The mute setting lives under its own key, apart from the save. Keeping it
// separate means it survives save-shape changes and, conversely, toggling sound
// never risks the progress data. Defaults to on (unmuted).
const MUTE_KEY = 'catapult.muted';

export function loadMuted(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted, storage = globalThis.localStorage) {
  try {
    storage?.setItem(MUTE_KEY, muted ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

// Music / SFX toggles from the settings screen, under their own key too (same
// reasoning as mute). Both default ON. A malformed or missing value degrades to
// the defaults rather than throwing.
const AUDIO_KEY = 'catapult.audio';

export function loadAudioPrefs(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(AUDIO_KEY);
    if (!raw) return { music: true, sfx: true };
    const p = JSON.parse(raw);
    return { music: p.music !== false, sfx: p.sfx !== false };
  } catch {
    return { music: true, sfx: true };
  }
}

export function writeAudioPrefs(prefs, storage = globalThis.localStorage) {
  try {
    storage?.setItem(AUDIO_KEY, JSON.stringify({ music: prefs.music !== false, sfx: prefs.sfx !== false }));
    return true;
  } catch {
    return false;
  }
}

// A brand-new save (level 1, no scores) — the settings screen's "reset
// progress". Returns the value to persist; it never touches audio prefs.
export function freshSave() {
  return defaults();
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
