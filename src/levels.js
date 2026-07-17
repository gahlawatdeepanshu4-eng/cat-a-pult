import {
  TOTAL_LEVELS, MAX_DODGE_CHANCE, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL,
  MAX_JUMP_CHANCE,
} from './constants.js';

// The curve is a formula, not twenty hand-written blobs, so it can be tuned
// in one place and cannot drift into an unwinnable shape halfway up.
export function levelSpec(n) {
  if (n < 1 || n > TOTAL_LEVELS) return null;
  const t = (n - 1) / (TOTAL_LEVELS - 1); // 0 at level 1, 1 at level 20

  const groundCats = 3 + Math.floor(t * 3);
  const groundTrexes = n < FIRST_TREX_LEVEL ? 0 : 1 + Math.floor(t * 3);
  const targets = groundCats + groundTrexes;

  return {
    n,
    groundCats,
    groundTrexes,
    targets,
    // Never reaches 1. A target that always dodges could never be killed and
    // the level could never be cleared.
    dodgeChance: +(MAX_DODGE_CHANCE * t).toFixed(3),
    // Some creatures walk, some hop, and it is decided fresh each moment by a
    // dice roll. Zero until FIRST_JUMP_LEVEL, then it climbs with the level, so
    // the arena gets steadily more restless and unpredictable the higher you go.
    jumpChance: n < FIRST_JUMP_LEVEL ? 0 : +(MAX_JUMP_CHANCE * t).toFixed(3),
    // Generous enough that every creature can be missed a couple of times,
    // then 10% more on top for a bit more breathing room.
    rocks: Math.ceil((targets + 4 + Math.floor(t * 6)) * 1.1),
  };
}

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => levelSpec(i + 1));
