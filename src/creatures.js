import {
  ARENA_HALF_WIDTH, NEAR_Z, WALL_Z, GROUND_Y, GRAVITY, MAX_HEADING,
  CAT_RADIUS, TREX_RADIUS, CAT_POINTS, TREX_POINTS,
  JUMP_SPEED, DODGE_SPEED, FLY_MIN_Y, FLY_MAX_Y, ROCK_RADIUS,
} from './constants.js';

export const KIND = {
  cat: { radius: CAT_RADIUS, points: CAT_POINTS, speed: 90, glyph: '🐱' },
  trex: { radius: TREX_RADIUS, points: TREX_POINTS, speed: 55, glyph: '🦖' },
};

const HARD_X_LIMIT = ARENA_HALF_WIDTH - 90;

// A rock's x where it reaches depth z is exactly tan(heading) * z, so the
// aim cone is narrow close up and wide far away: the playable arena is a
// wedge, not a box. Creatures must live inside that wedge or they are
// visible but impossible to hit, which is exactly the bug this prevents.
// The 0.88 keeps them off the very edge of what aim can reach.
export function xLimitAt(z) {
  return Math.min(HARD_X_LIMIT, Math.tan(MAX_HEADING) * z * 0.88);
}

export function spawn(kind, { flying = false }, rand) {
  const z = NEAR_Z + rand() * (WALL_Z - NEAR_Z - 120);
  const limit = xLimitAt(z);
  return {
    id: `${kind}-${Math.floor(rand() * 1e9)}`,
    kind,
    flying,
    alive: true,
    x: (rand() * 2 - 1) * limit,
    y: flying ? FLY_MIN_Y + rand() * (FLY_MAX_Y - FLY_MIN_Y) : GROUND_Y,
    z,
    dir: rand() < 0.5 ? -1 : 1,
    speed: KIND[kind].speed * (0.7 + rand() * 0.6),
    vy: 0,
    airborne: false,
    hopIn: 0.8 + rand() * 2.4,
    dodgedThisShot: false,
  };
}

export function radiusOf(c) {
  return KIND[c.kind].radius;
}

export function pointsOf(c) {
  return KIND[c.kind].points;
}

function wander(c, dt) {
  const limit = xLimitAt(c.z);
  let x = c.x + c.speed * c.dir * dt;
  let dir = c.dir;
  if (x > limit) { x = limit; dir = -1; }
  if (x < -limit) { x = -limit; dir = 1; }
  return { x, dir };
}

// Flyers bob rather than fall, so they stay a genuinely different target that
// needs elevation instead of a flat shot.
function bob(c, dt) {
  let y = c.y + c.vy * dt;
  let vy = c.vy;
  if (y > FLY_MAX_Y) { y = FLY_MAX_Y; vy = -Math.abs(vy || 40); }
  if (y < FLY_MIN_Y) { y = FLY_MIN_Y; vy = Math.abs(vy || 40); }
  if (vy === 0) vy = 40;
  return { y, vy };
}

function fall(c, dt) {
  const vy = c.vy + GRAVITY * dt;
  let y = c.y + vy * dt;
  if (y <= GROUND_Y) return { y: GROUND_Y, vy: 0, airborne: false };
  return { y, vy, airborne: true };
}

export function stepCreature(c, dt, opts) {
  if (!c.alive) return c;
  const { canJump = false, rand = Math.random } = opts ?? {};

  const { x, dir } = wander(c, dt);
  let next = { ...c, x, dir };

  if (c.flying) return { ...next, ...bob(next, dt) };

  if (next.airborne) {
    next = { ...next, ...fall(next, dt) };
  } else if (canJump) {
    const hopIn = next.hopIn - dt;
    if (hopIn <= 0) {
      next = { ...next, vy: JUMP_SPEED, airborne: true, hopIn: 1.2 + rand() * 2.6 };
    } else {
      next = { ...next, hopIn };
    }
  }
  return next;
}

export function stepAll(creatures, dt, opts) {
  return creatures.map((c) => stepCreature(c, dt, opts));
}

// How close the rock will pass to this creature, ignoring dodges. Used to
// decide whether a creature feels threatened enough to try dodging.
export function threatDistance(rock, c) {
  const dz = c.z - rock.z;
  if (dz <= 0 || rock.vz <= 0) return Infinity;
  const t = dz / rock.vz;
  if (t > 1.2) return Infinity; // too far off to react to yet
  const px = rock.x + rock.vx * t;
  const py = rock.y + rock.vy * t + 0.5 * GRAVITY * t * t;
  return Math.hypot(px - c.x, py - c.y);
}

// One dodge attempt per creature per shot. Without that cap a high-level
// creature would dodge every frame and become unhittable.
export function tryDodge(c, rock, dodgeChance, rand = Math.random) {
  if (!c.alive || c.dodgedThisShot) return c;
  const near = threatDistance(rock, c);
  if (near > radiusOf(c) * 2.5) return c;

  const attempted = { ...c, dodgedThisShot: true };
  if (rand() >= dodgeChance) return attempted; // tried and failed

  // A dodge must not carry a creature outside the aim cone, or dodging would
  // turn it into an unhittable target rather than a harder one.
  const limit = xLimitAt(c.z);
  const away = rock.x <= c.x ? 1 : -1;
  const clampX = (x) => Math.max(-limit, Math.min(limit, x));

  if (c.flying) {
    return { ...attempted, y: Math.min(FLY_MAX_Y, c.y + 60), x: clampX(c.x + away * 40) };
  }
  return {
    ...attempted,
    x: clampX(c.x + away * 55),
    vy: DODGE_SPEED,
    airborne: true,
  };
}

export function resetDodges(creatures) {
  return creatures.map((c) => ({ ...c, dodgedThisShot: false }));
}

// The one true centre of a creature's body. Both the renderer and the
// collision test call this, so what you see is exactly what you can hit.
// These used to be computed separately and disagreed by 13 units on a cat
// and 18 on a T-rex: you aimed at the animal and the hitbox sat below it.
// The 0.88 matches where render.js places the sprite above its ground point.
export function centreOf(c) {
  return { x: c.x, y: c.y + radiusOf(c) * 0.88, z: c.z };
}

export function hitRadius(c) {
  return radiusOf(c) + ROCK_RADIUS;
}

// Distance from a point to a segment, in 3D.
function distPointToSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  // A zero-length step: fall back to a plain point distance.
  const t = abLenSq === 0
    ? 0
    : Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / abLenSq));
  const cx = a.x + abx * t, cy = a.y + aby * t, cz = a.z + abz * t;
  return Math.hypot(p.x - cx, p.y - cy, p.z - cz);
}

// Swept collision: tests the whole path the rock travelled this frame, not
// just where it happened to land.
//
// This has to be swept. A full-power rock covers 42 units in a single 30fps
// frame and over 50 on a slow phone, against a hit sphere of radius 48 — so
// point sampling steps straight over an animal and the rock appears to pass
// through it. That was the "rock goes through animals" bug.
export function hitsSwept(from, to, c) {
  if (!c.alive) return false;
  return distPointToSegment(centreOf(c), from, to) <= hitRadius(c);
}

export function hits(rock, c) {
  return hitsSwept(rock, rock, c);
}

// Nearest along the rock's path wins, so a rock cannot skip a close animal to
// kill one behind it.
export function firstHitSwept(from, to, creatures) {
  const struck = creatures.filter((c) => hitsSwept(from, to, c));
  if (!struck.length) return null;
  return struck.reduce((best, c) => (c.z < best.z ? c : best));
}

export function firstHit(rock, creatures) {
  return firstHitSwept(rock, rock, creatures);
}
