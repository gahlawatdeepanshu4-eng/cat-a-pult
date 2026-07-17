import { launchVelocity, stepBody, chargeToPower } from './ballistics.js';
import { holeAt, isPastWall, isOutOfArena, createStrays, moveStrays } from './arena.js';
import {
  SLING_Y, WALL_Z, GROUND_Y, POINTS_PER_HOLE, STARTING_CATS,
  MAX_HEADING, MIN_ELEVATION, MAX_ELEVATION,
} from './constants.js';

// phase: 'aiming' -> 'charging' -> 'flying' -> 'aiming' | 'over'
export function createGame(rand = Math.random) {
  return {
    phase: 'aiming',
    catsLeft: STARTING_CATS,
    score: 0,
    charge: 0,
    cat: null,
    strays: createStrays(6, rand),
    lastShot: null, // { result: 'hole' | 'wall' | 'sand' | 'wide', holeId }
  };
}

// The crosshair drives aim. Its position is normalised to -1..1 across and
// 0..1 up the screen so the rules never need to know about pixels.
export function aimFrom(nx, ny) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return {
    heading: clamp(nx, -1, 1) * MAX_HEADING,
    elevation: MIN_ELEVATION + clamp(ny, 0, 1) * (MAX_ELEVATION - MIN_ELEVATION),
  };
}

export function beginCharge(game) {
  if (game.phase !== 'aiming') return game;
  return { ...game, phase: 'charging', charge: 0 };
}

export function tickCharge(game, dt) {
  if (game.phase !== 'charging') return game;
  return { ...game, charge: game.charge + dt };
}

export function release(game, aim) {
  if (game.phase !== 'charging') return game;
  const v = launchVelocity(aim.heading, aim.elevation, chargeToPower(game.charge));
  return {
    ...game,
    phase: 'flying',
    charge: 0,
    catsLeft: game.catsLeft - 1,
    cat: { x: 0, y: SLING_Y, z: 0, ...v },
  };
}

export function tick(game, dt) {
  const strays = moveStrays(game.strays, dt);
  if (game.phase !== 'flying') return { ...game, strays };

  const cat = stepBody(game.cat, dt);

  // Check the wall plane before the ground: a cat that crosses the wall's
  // depth on the same frame it dips below the sand still went through.
  if (isPastWall(cat.z)) {
    const hole = holeAt(cat.x, cat.y);
    return resolve({ ...game, cat, strays }, hole ? 'hole' : 'wall', hole?.id);
  }
  if (cat.y <= GROUND_Y) return resolve({ ...game, cat, strays }, 'sand');
  if (isOutOfArena(cat.x)) return resolve({ ...game, cat, strays }, 'wide');

  return { ...game, cat, strays };
}

function resolve(game, result, holeId = null) {
  const scored = result === 'hole';
  return {
    ...game,
    phase: game.catsLeft <= 0 ? 'over' : 'aiming',
    score: game.score + (scored ? POINTS_PER_HOLE : 0),
    cat: null,
    lastShot: { result, holeId },
  };
}
