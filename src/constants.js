// World space, from the player's point of view:
//   x  left/right, 0 at arena centre, positive right
//   y  up/down, 0 at the sand, positive up
//   z  depth, 0 at the slingshot, positive INTO the screen toward the wall
// Gravity acts on y only.

// Tuned by sweeping the aim/power space rather than by eye. At the previous
// values (wall 1500, gravity -620) nine shots in ten fell in the sand without
// reaching the wall and the lower half of the crosshair was dead: no power
// could get there. These numbers keep the whole aim range live and, more
// importantly, make power a real choice — lower holes want roughly 0.3 power,
// upper holes roughly 0.55, and overshooting buries the cat in stone.
export const GRAVITY = -380;        // world units/s^2
export const MAX_DT = 1 / 30;

// Launch
export const GROUND_Y = 0;          // the sand
export const SLING_Y = 60;          // cat sits this high in the pouch
export const MIN_LAUNCH_SPEED = 320;
export const MAX_LAUNCH_SPEED = 1150;
export const CHARGE_SECONDS = 1.1;  // hold time to go from empty to full power

// Aim limits (radians). Heading is left/right, elevation is up/down.
// A cat's landing x on the wall is exactly tan(heading) * WALL_Z, so the
// heading limit and the wall depth together decide how wide the outermost
// holes can sit. The outer lower holes at x=630 need atan(630/800) = 0.67,
// so this must stay comfortably above that.
export const MAX_HEADING = 0.75;
export const MIN_ELEVATION = 0.05;
export const MAX_ELEVATION = 0.72;

// Arena
export const WALL_Z = 800;          // depth of the wall face
export const ARENA_HALF_WIDTH = 900;
export const CAT_RADIUS = 26;

// Projection
export const FOCAL = 900;           // larger = flatter, less dramatic perspective
export const VIRTUAL_HEIGHT = 720;
export const EYE_Y = 250;           // world height the horizon sits at
export const HORIZON_FRACTION = 0.42; // horizon's position down the screen

// Scoring
export const POINTS_PER_HOLE = 20;
export const STARTING_CATS = 10;
