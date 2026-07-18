// World space, from the player's point of view:
//   x  left/right, 0 at arena centre, positive right
//   y  up/down, 0 at the sand, positive up
//   z  depth, 0 at the sling, positive INTO the screen toward the wall
// Gravity acts on y only.

export const GRAVITY = -380;
export const MAX_DT = 1 / 30;

// Launch. The sling sits low in the foreground (bottom of the screen). Shots
// leave it at a steep upward angle and arc over onto the creatures out on the
// field — see MIN_ELEVATION/MAX_ELEVATION below.
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
// Shots are steep lobs — even the shallowest leaves the sling at ~29 degrees and
// arcs high onto the field, which suits looking down at it. This is only
// possible because aim.js keeps the sideways pull out of power; otherwise side
// targets would demand a flat shot. Raise for steeper, lower for flatter.
export const MIN_ELEVATION = 0.5;
export const MAX_ELEVATION = 1.0;

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

// Creatures
export const CAT_RADIUS = 34;
export const TREX_RADIUS = 48;
export const CAT_POINTS = 20;
export const TREX_POINTS = 50;
export const JUMP_SPEED = 240;
export const DODGE_SPEED = 300;
// Kept for the (currently unused) flyer capability in creatures.js. No level
// spawns flyers, but the engine and its tests still exercise the altitude band
// so it is trivial to bring flying back later.
export const FLY_MIN_Y = 95;
export const FLY_MAX_Y = 210;

// Levels
export const TOTAL_LEVELS = 20;
export const MAX_DODGE_CHANCE = 0.62;  // never 1: an always-dodging target is unhittable
export const FIRST_JUMP_LEVEL = 2;
export const FIRST_TREX_LEVEL = 2;
// The per-second chance a grounded creature spontaneously hops, at the top
// level. It ramps up from zero, so higher levels are a jumpier, less
// predictable arena. A rate, not a probability: it is multiplied by the frame
// time, so the jump frequency is the same on a fast or a slow phone.
export const MAX_JUMP_CHANCE = 0.6;
