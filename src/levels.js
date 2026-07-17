import {
  TOTAL_LEVELS, MAX_DODGE_CHANCE, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL,
  FIRST_FLYING_LEVEL, FLYING_CATS_PER_LEVEL, FLYING_TREXES_PER_LEVEL,
} from './constants.js';

// The curve is a formula, not twenty hand-written blobs, so it can be tuned
// in one place and cannot drift into an unwinnable shape halfway up.
export function levelSpec(n) {
  if (n < 1 || n > TOTAL_LEVELS) return null;
  const t = (n - 1) / (TOTAL_LEVELS - 1); // 0 at level 1, 1 at level 20

  const groundCats = 3 + Math.floor(t * 3);
  const groundTrexes = n < FIRST_TREX_LEVEL ? 0 : 1 + Math.floor(t * 3);
  const flyingCats = n < FIRST_FLYING_LEVEL ? 0 : FLYING_CATS_PER_LEVEL;
  const flyingTrexes = n < FIRST_FLYING_LEVEL ? 0 : FLYING_TREXES_PER_LEVEL;
  const targets = groundCats + groundTrexes + flyingCats + flyingTrexes;

  return {
    n,
    groundCats,
    groundTrexes,
    flyingCats,
    flyingTrexes,
    targets,
    // Never reaches 1. A target that always dodges could never be killed and
    // the level could never be cleared.
    dodgeChance: +(MAX_DODGE_CHANCE * t).toFixed(3),
    canJump: n >= FIRST_JUMP_LEVEL,
    // Generous enough that every creature can be missed a couple of times.
    rocks: targets + 4 + Math.floor(t * 6),
  };
}

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => levelSpec(i + 1));
