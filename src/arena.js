import { ARENA_HALF_WIDTH, WALL_Z } from './constants.js';

// Seven holes, matching the reference footage: three round ones on an upper
// row, four arched ones on a lower row. Positions are world x/y on the wall
// face (z = WALL_Z). rx/ry are the half-width and half-height of the opening.
export const HOLES = [
  { id: 'u1', row: 'upper', x: -430, y: 430, rx: 62, ry: 58 },
  { id: 'u2', row: 'upper', x: 0, y: 430, rx: 62, ry: 58 },
  { id: 'u3', row: 'upper', x: 430, y: 430, rx: 62, ry: 58 },
  { id: 'l1', row: 'lower', x: -630, y: 150, rx: 72, ry: 118 },
  { id: 'l2', row: 'lower', x: -210, y: 150, rx: 72, ry: 118 },
  { id: 'l3', row: 'lower', x: 210, y: 150, rx: 72, ry: 118 },
  { id: 'l4', row: 'lower', x: 630, y: 150, rx: 72, ry: 118 },
];

// Treated as an ellipse for the round upper holes and, close enough, for the
// arched lower ones too.
export function holeAt(x, y) {
  return HOLES.find((h) => {
    const dx = (x - h.x) / h.rx;
    const dy = (y - h.y) / h.ry;
    return dx * dx + dy * dy <= 1;
  }) ?? null;
}

export function isPastWall(z) {
  return z >= WALL_Z;
}

export function isOutOfArena(x) {
  return Math.abs(x) > ARENA_HALF_WIDTH;
}

// Loose cats milling about on the sand. Scenery: they do not score and do not
// block shots.
export function createStrays(count, rand = Math.random) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (rand() * 2 - 1) * (ARENA_HALF_WIDTH - 120),
    z: 240 + rand() * (WALL_Z - 500),
    dir: rand() < 0.5 ? -1 : 1,
    speed: 30 + rand() * 55,
  }));
}

export function moveStrays(strays, dt) {
  const limit = ARENA_HALF_WIDTH - 120;
  return strays.map((s) => {
    let x = s.x + s.speed * s.dir * dt;
    let dir = s.dir;
    if (x > limit) { x = limit; dir = -1; }
    if (x < -limit) { x = -limit; dir = 1; }
    return { ...s, x, dir };
  });
}
