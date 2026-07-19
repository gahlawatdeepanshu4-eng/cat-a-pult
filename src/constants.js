// World space, from the player's point of view:
//   x  left/right, 0 at arena centre, positive right
//   y  up/down, 0 at the sand, positive up
//   z  depth, 0 at the sling, positive INTO the screen toward the wall
// Gravity acts on y only.

export const GRAVITY = -380;
export const MAX_DT = 1 / 30;

// Launch
export const GROUND_Y = 0;
export const SLING_Y = 70;
export const MIN_LAUNCH_SPEED = 360;
export const MAX_LAUNCH_SPEED = 1250;

// Drag-to-aim. Power comes from drag length as a fraction of screen height,
// so it works the same on any phone. There is no timer: one gesture carries
// direction and power together.
export const MAX_DRAG_FRACTION = 0.30;
export const MIN_DRAG_PX = 12;

// Aim limits (radians). A rock's x where it reaches the wall is exactly
// tan(heading) * WALL_Z, so heading and wall depth together decide how wide
// the arena can usefully be.
export const MAX_HEADING = 0.75;
export const MIN_ELEVATION = -0.05;
export const MAX_ELEVATION = 0.85;

// Arena. You fire across a distance now, so the play space is deep: creatures
// start well back (NEAR_Z) and range almost to the backdrop (WALL_Z). The wide
// gap between them is what lets the player read how far each creature is.
export const WALL_Z = 1500;
export const ARENA_HALF_WIDTH = 820;
export const NEAR_Z = 460;   // creatures never come closer than this
export const ROCK_RADIUS = 14;

// Projection. EYE_Y is the world height that maps onto the horizon line, so a
// bigger EYE_Y (relative to the ground at y=0) tilts the view further DOWN, as
// if you are standing on a rise looking across the land. HORIZON_FRACTION is
// how far down the screen that horizon sits; smaller lifts it up and shows more
// ground. Together they give the raised, 3D vantage. Pure render — collision
// works in world coordinates and does not see these.
export const FOCAL = 780;
export const VIRTUAL_HEIGHT = 720;
export const EYE_Y = 620;
export const HORIZON_FRACTION = 0.26;

// Creatures. Seven kinds share one set of behaviours (wander, random hop,
// dodge) and differ only in size, base speed and points. cat and trex are the
// originals; the five "-rex" mashups are a cat/critter head on a dino body.
export const CAT_RADIUS = 34;
export const TREX_RADIUS = 48;
export const CAT_POINTS = 20;
export const TREX_POINTS = 50;
export const CATREX_RADIUS = 44;
export const CATREX_POINTS = 40;
export const FROGREX_RADIUS = 40;
export const FROGREX_POINTS = 30;
export const BUNNYREX_RADIUS = 36;
export const BUNNYREX_POINTS = 25;
export const PIGREX_RADIUS = 50;
export const PIGREX_POINTS = 45;
export const DUCKTREX_RADIUS = 42;
export const DUCKTREX_POINTS = 35;
export const JUMP_SPEED = 240;
export const DODGE_SPEED = 300;
// Kept for the (currently unused) flyer capability in creatures.js. No level
// spawns flyers, but the engine and its tests still exercise the altitude band
// so it is trivial to bring flying back later.
export const FLY_MIN_Y = 95;
export const FLY_MAX_Y = 210;

// Scoring. Farther kills pay more: a hit's base points are multiplied by a
// factor that climbs with depth, from SCORE_NEAR_MULT at NEAR_Z to
// SCORE_FAR_MULT out at the wall. The long, risky shots are the rewarding ones.
export const SCORE_NEAR_MULT = 1;
export const SCORE_FAR_MULT = 2.5;

// Levels. SAMPLER_MODE is a short 5-level build for play-testing the whole game
// fast: every creature (and, once built, every weapon) shows up across 5 levels,
// with difficulty ramping to full by the last one. Flip it to false for the real
// 50-level campaign. TOTAL_LEVELS follows the mode; the two generators in
// levels.js each use their own fixed length so both stay correct either way.
export const SAMPLER_MODE = false;
export const CAMPAIGN_LEVELS = 50;
export const SAMPLER_LEVELS = 5;
export const TOTAL_LEVELS = SAMPLER_MODE ? SAMPLER_LEVELS : CAMPAIGN_LEVELS;
export const MAX_DODGE_CHANCE = 0.62;  // never 1: an always-dodging target is unhittable
export const FIRST_JUMP_LEVEL = 2;
export const FIRST_TREX_LEVEL = 2;
// Creatures get faster as levels rise: their base speed is multiplied by this
// factor, ramping from 1 at level 1 to MAX_SPEED_MULT at the last level. Faster
// + dodgier is the whole of "harder to kill" — there is no hit-point system.
export const MAX_SPEED_MULT = 1.9;
// The per-second chance a grounded creature spontaneously hops, at the top
// level. It ramps up from zero, so higher levels are a jumpier, less
// predictable arena. A rate, not a probability: it is multiplied by the frame
// time, so the jump frequency is the same on a fast or a slow phone.
export const MAX_JUMP_CHANCE = 0.6;
