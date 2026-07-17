import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOLES, holeAt, isPastWall, isOutOfArena, createStrays, moveStrays,
} from '../src/arena.js';
import { WALL_Z, ARENA_HALF_WIDTH } from '../src/constants.js';

test('there are seven holes: three upper and four lower', () => {
  assert.equal(HOLES.length, 7);
  assert.equal(HOLES.filter((h) => h.row === 'upper').length, 3);
  assert.equal(HOLES.filter((h) => h.row === 'lower').length, 4);
});

test('the upper row sits above the lower row', () => {
  const upper = HOLES.filter((h) => h.row === 'upper');
  const lower = HOLES.filter((h) => h.row === 'lower');
  assert.ok(Math.min(...upper.map((h) => h.y)) > Math.max(...lower.map((h) => h.y)));
});

test('no two holes overlap, so every hole is a distinct target', () => {
  for (let i = 0; i < HOLES.length; i++) {
    for (let j = i + 1; j < HOLES.length; j++) {
      const a = HOLES[i], b = HOLES[j];
      const apart = Math.abs(a.x - b.x) > a.rx + b.rx || Math.abs(a.y - b.y) > a.ry + b.ry;
      assert.ok(apart, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('every hole sits inside the arena', () => {
  for (const h of HOLES) {
    assert.ok(Math.abs(h.x) + h.rx <= ARENA_HALF_WIDTH, `${h.id} pokes out of the arena`);
    assert.ok(h.y - h.ry > 0, `${h.id} sinks below the sand`);
  }
});

test('a shot at a hole centre goes through it', () => {
  for (const h of HOLES) {
    assert.equal(holeAt(h.x, h.y)?.id, h.id);
  }
});

test('a shot at the wall between holes hits stone', () => {
  assert.equal(holeAt(-100, 430), null);
});

test('a shot just outside a hole edge does not count', () => {
  const h = HOLES[0];
  assert.equal(holeAt(h.x + h.rx + 2, h.y), null);
});

test('a shot just inside a hole edge counts', () => {
  const h = HOLES[0];
  assert.equal(holeAt(h.x + h.rx - 2, h.y)?.id, h.id);
});

test('isPastWall triggers at the wall face', () => {
  assert.equal(isPastWall(WALL_Z - 1), false);
  assert.equal(isPastWall(WALL_Z), true);
});

test('isOutOfArena catches a cat flung wide', () => {
  assert.equal(isOutOfArena(0), false);
  assert.equal(isOutOfArena(ARENA_HALF_WIDTH + 1), true);
  assert.equal(isOutOfArena(-ARENA_HALF_WIDTH - 1), true);
});

test('strays spawn inside the arena and in front of the wall', () => {
  let seed = 0;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (const s of createStrays(20, rand)) {
    assert.ok(Math.abs(s.x) < ARENA_HALF_WIDTH);
    assert.ok(s.z > 0 && s.z < WALL_Z);
  }
});

test('strays turn around at the arena edge instead of wandering off', () => {
  let strays = [{ id: 0, x: 0, z: 500, dir: 1, speed: 4000 }];
  for (let i = 0; i < 200; i++) {
    strays = moveStrays(strays, 1 / 60);
    assert.ok(Math.abs(strays[0].x) <= ARENA_HALF_WIDTH);
  }
});

test('moveStrays does not mutate its input', () => {
  const strays = [{ id: 0, x: 0, z: 500, dir: 1, speed: 50 }];
  moveStrays(strays, 1);
  assert.equal(strays[0].x, 0);
});
