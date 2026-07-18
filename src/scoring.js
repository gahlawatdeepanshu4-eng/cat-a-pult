import {
  NEAR_Z, WALL_Z, SCORE_NEAR_MULT, SCORE_FAR_MULT,
} from './constants.js';

// Farther kills are worth more. The multiplier rises linearly with depth, from
// SCORE_NEAR_MULT at the nearest a creature can be (NEAR_Z) to SCORE_FAR_MULT at
// the wall, clamped so a hit never scores below base or past the far cap.
export function distanceMultiplier(z) {
  const t = (z - NEAR_Z) / (WALL_Z - NEAR_Z);
  const clamped = Math.max(0, Math.min(1, t));
  return SCORE_NEAR_MULT + clamped * (SCORE_FAR_MULT - SCORE_NEAR_MULT);
}

// A hit's points: base points scaled by distance, rounded to a tidy multiple of
// 5 so the HUD and the floating "+points" stay clean.
export function hitScore(basePoints, z) {
  return Math.round((basePoints * distanceMultiplier(z)) / 5) * 5;
}
