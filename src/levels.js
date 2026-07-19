import {
  MAX_DODGE_CHANCE, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL,
  MAX_JUMP_CHANCE, MAX_SPEED_MULT, CAMPAIGN_LEVELS, SAMPLER_LEVELS, SAMPLER_MODE,
} from './constants.js';
import { weaponOf, weaponForCampaign, weaponForSampler } from './weapons.js';

// When each creature first appears in the full campaign, and how many start
// out. After it appears, a kind gains one more every GROWTH_EVERY levels, so the
// field fills up and diversifies as you climb.
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

// The 5-level sampler: hand-picked rosters so every one of the seven kinds is
// seen across five levels, and all seven share the screen on the last one.
const SAMPLER_ROSTERS = {
  1: [['cat', 3], ['trex', 1]],
  2: [['cat', 2], ['trex', 1], ['catrex', 2]],
  3: [['cat', 2], ['catrex', 1], ['frogrex', 2], ['bunnyrex', 1]],
  4: [['cat', 2], ['trex', 1], ['bunnyrex', 1], ['pigrex', 2]],
  5: [['cat', 1], ['trex', 1], ['catrex', 1], ['frogrex', 1], ['bunnyrex', 1], ['pigrex', 1], ['ducktrex', 2]],
};

// Turn a roster and a position in the run (n of total) into a full level spec.
// Difficulty is a formula of how far through you are, so both the 50-level
// campaign and the 5-level sampler ramp from nothing to full across their span.
function specFrom(n, total, roster, weaponName) {
  const t = (n - 1) / (total - 1); // 0 at level 1, 1 at the last level
  const targets = roster.reduce((sum, r) => sum + r.count, 0);
  // Enough to miss every creature a couple of times, plus 10% breathing room.
  const baseRocks = Math.ceil((targets + 4 + Math.floor(t * 8)) * 1.1);
  return {
    n,
    roster,
    targets,
    // Which weapon this level is played with. The reachability test re-proves
    // every creature is killable with *this* weapon.
    weapon: weaponName,
    // Never reaches 1. A target that always dodges could never be killed.
    dodgeChance: +(MAX_DODGE_CHANCE * t).toFixed(3),
    // Some creatures walk, some hop; a per-second dice roll that climbs with t.
    jumpChance: n < FIRST_JUMP_LEVEL ? 0 : +(MAX_JUMP_CHANCE * t).toFixed(3),
    // Everything moves faster as you climb — with dodging, the whole of
    // "harder to kill" (no hit-points).
    speedMult: +(1 + t * (MAX_SPEED_MULT - 1)).toFixed(3),
    // Pierce/splash weapons kill more per shot, so they hand out a little less
    // ammo — but never so little that the level stops being comfortably
    // winnable, so a floor of targets + 3 always holds.
    rocks: Math.max(baseRocks + weaponOf(weaponName).ammoModifier, targets + 3),
  };
}

// The real game: fifty levels generated from SCHEDULE. Every count is
// non-decreasing in n, which keeps the target total monotonic.
export function campaignSpec(n) {
  if (n < 1 || n > CAMPAIGN_LEVELS) return null;
  const roster = SCHEDULE
    .map(({ kind, from, base }) => ({
      kind,
      count: n < from ? 0 : base + Math.floor((n - from) / GROWTH_EVERY),
    }))
    .filter((r) => r.count > 0);
  return specFrom(n, CAMPAIGN_LEVELS, roster, weaponForCampaign(n));
}

// The short test build: five hand-picked levels covering every kind.
export function samplerSpec(n) {
  if (n < 1 || n > SAMPLER_LEVELS) return null;
  const roster = SAMPLER_ROSTERS[n].map(([kind, count]) => ({ kind, count }));
  return specFrom(n, SAMPLER_LEVELS, roster, weaponForSampler(n));
}

export function levelSpec(n) {
  return SAMPLER_MODE ? samplerSpec(n) : campaignSpec(n);
}

export const LEVELS = Array.from(
  { length: SAMPLER_MODE ? SAMPLER_LEVELS : CAMPAIGN_LEVELS },
  (_, i) => levelSpec(i + 1),
);
