import {
  TOTAL_LEVELS, MAX_DODGE_CHANCE, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL,
  MAX_JUMP_CHANCE, MAX_SPEED_MULT,
} from './constants.js';

// When each creature first appears and how many start out. After it appears, a
// kind gains one more every GROWTH_EVERY levels, so the field fills up and
// diversifies as you climb. cat and trex use FIRST_TREX_LEVEL's sibling below.
const GROWTH_EVERY = 16;
const SCHEDULE = [
  { kind: 'cat', from: 1, base: 3 },
  { kind: 'trex', from: FIRST_TREX_LEVEL, base: 1 },
  { kind: 'catrex', from: 8, base: 1 },
  { kind: 'frogrex', from: 15, base: 1 },
  { kind: 'bunnyrex', from: 22, base: 1 },
  { kind: 'pigrex', from: 29, base: 1 },
  { kind: 'ducktrex', from: 36, base: 1 },
];

// The curve is a formula, not fifty hand-written blobs, so it can be tuned in
// one place and cannot drift into an unwinnable shape halfway up. Every count
// is non-decreasing in the level, which keeps the target total monotonic.
export function levelSpec(n) {
  if (n < 1 || n > TOTAL_LEVELS) return null;
  const t = (n - 1) / (TOTAL_LEVELS - 1); // 0 at level 1, 1 at the last level

  const roster = SCHEDULE
    .map(({ kind, from, base }) => ({
      kind,
      count: n < from ? 0 : base + Math.floor((n - from) / GROWTH_EVERY),
    }))
    .filter((r) => r.count > 0);

  const targets = roster.reduce((sum, r) => sum + r.count, 0);

  return {
    n,
    roster,
    targets,
    // Never reaches 1. A target that always dodges could never be killed and
    // the level could never be cleared.
    dodgeChance: +(MAX_DODGE_CHANCE * t).toFixed(3),
    // Some creatures walk, some hop; a per-second dice roll that climbs with the
    // level, so the arena gets steadily more restless the higher you go.
    jumpChance: n < FIRST_JUMP_LEVEL ? 0 : +(MAX_JUMP_CHANCE * t).toFixed(3),
    // Everything moves faster as levels rise, which (with dodging) is the whole
    // of "harder to kill".
    speedMult: +(1 + t * (MAX_SPEED_MULT - 1)).toFixed(3),
    // Generous enough that every creature can be missed a couple of times,
    // then 10% more on top for a bit more breathing room.
    rocks: Math.ceil((targets + 4 + Math.floor(t * 8)) * 1.1),
  };
}

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => levelSpec(i + 1));
