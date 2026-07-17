import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spawn, stepCreature, stepAll, tryDodge, resetDodges, hits, firstHit,
  radiusOf, pointsOf, xLimitAt,
} from '../src/creatures.js';
import {
  ARENA_HALF_WIDTH, NEAR_Z, WALL_Z, CAT_POINTS, TREX_POINTS, GROUND_Y,
  FLY_MIN_Y, FLY_MAX_Y, MAX_HEADING,
} from '../src/constants.js';

const fixedRand = (v = 0.5) => () => v;

test('a T-rex is worth more than a cat and is bigger', () => {
  const cat = spawn('cat', {}, fixedRand());
  const trex = spawn('trex', {}, fixedRand());
  assert.equal(pointsOf(cat), CAT_POINTS);
  assert.equal(pointsOf(trex), TREX_POINTS);
  assert.ok(pointsOf(trex) > pointsOf(cat));
  assert.ok(radiusOf(trex) > radiusOf(cat));
});

test('creatures spawn inside the arena and in front of the wall', () => {
  let s = 0;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) {
    const c = spawn(i % 2 ? 'cat' : 'trex', { flying: i % 3 === 0 }, rand);
    assert.ok(Math.abs(c.x) < ARENA_HALF_WIDTH, 'inside the arena');
    assert.ok(c.z >= NEAR_Z && c.z < WALL_Z, 'in front of the wall');
  }
});

test('ground creatures spawn on the sand, flyers spawn in the air', () => {
  assert.equal(spawn('cat', { flying: false }, fixedRand()).y, GROUND_Y);
  const flyer = spawn('cat', { flying: true }, fixedRand());
  assert.ok(flyer.y >= FLY_MIN_Y && flyer.y <= FLY_MAX_Y);
});

// The arena is a wedge: a rock's reach at depth z is tan(MAX_HEADING) * z, so
// close-up creatures must sit in a narrow band. Spawning outside it makes a
// creature visible but impossible to hit.
test('the reachable width narrows as creatures come closer', () => {
  assert.ok(xLimitAt(NEAR_Z) < xLimitAt(WALL_Z), 'near the camera the aim cone is narrower');
});

test('every spawn sits inside the cone the aim can actually reach', () => {
  let s = 0;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 200; i++) {
    const c = spawn(i % 2 ? 'cat' : 'trex', { flying: i % 3 === 0 }, rand);
    const reach = Math.tan(MAX_HEADING) * c.z;
    assert.ok(Math.abs(c.x) <= reach,
      `${c.kind} at x=${Math.round(c.x)} z=${Math.round(c.z)} is beyond the ${Math.round(reach)} the aim can reach`);
  }
});

test('wandering never carries a creature out of the reachable cone', () => {
  let c = { ...spawn('cat', {}, () => 0.5), z: NEAR_Z, x: 0, speed: 9000, dir: 1, alive: true };
  for (let i = 0; i < 400; i++) {
    c = stepCreature(c, 1 / 60, { rand: () => 0.5 });
    assert.ok(Math.abs(c.x) <= Math.tan(MAX_HEADING) * c.z);
  }
});

test('a dodge never carries a creature out of the reachable cone', () => {
  let c = { ...spawn('cat', {}, () => 0.5), z: NEAR_Z, x: xLimitAt(NEAR_Z), y: 0, alive: true, dodgedThisShot: false };
  const rock = { x: c.x - 30, y: 10, z: c.z - 60, vx: 0, vy: 0, vz: 400 };
  const after = tryDodge(c, rock, 1, () => 0);
  assert.ok(Math.abs(after.x) <= Math.tan(MAX_HEADING) * after.z);
});

test('a wandering creature turns at the arena edge instead of leaving', () => {
  let c = { ...spawn('cat', {}, fixedRand()), x: 0, speed: 5000, dir: 1, alive: true };
  for (let i = 0; i < 300; i++) {
    c = stepCreature(c, 1 / 60, { rand: fixedRand() });
    assert.ok(Math.abs(c.x) <= ARENA_HALF_WIDTH);
  }
});

test('creatures do not jump when the level does not allow it', () => {
  let c = { ...spawn('cat', {}, fixedRand()), hopIn: 0.01, airborne: false, y: 0 };
  for (let i = 0; i < 60; i++) c = stepCreature(c, 1 / 60, { canJump: false, rand: fixedRand() });
  assert.equal(c.y, GROUND_Y);
  assert.equal(c.airborne, false);
});

test('creatures jump when the level allows it, and land again', () => {
  let c = { ...spawn('cat', {}, fixedRand()), hopIn: 0.01, airborne: false, y: 0 };
  let peak = 0;
  for (let i = 0; i < 240; i++) {
    c = stepCreature(c, 1 / 60, { canJump: true, rand: fixedRand() });
    peak = Math.max(peak, c.y);
  }
  assert.ok(peak > 0, 'a jump should leave the ground');
  assert.ok(c.y >= GROUND_Y, 'and must not sink through it');
});

test('flyers stay within their altitude band', () => {
  let c = { ...spawn('cat', { flying: true }, fixedRand()), vy: 400 };
  for (let i = 0; i < 600; i++) {
    c = stepCreature(c, 1 / 60, { rand: fixedRand() });
    assert.ok(c.y >= FLY_MIN_Y - 1 && c.y <= FLY_MAX_Y + 1, `flyer at ${c.y}`);
  }
});

test('a dead creature is left alone', () => {
  const dead = { ...spawn('cat', {}, fixedRand()), alive: false, x: 5 };
  assert.equal(stepCreature(dead, 1, { rand: fixedRand() }).x, 5);
});

const rockAt = (c) => ({ x: c.x, y: c.y, z: c.z - 100, vx: 0, vy: 0, vz: 400 });

test('a dodge chance of zero never dodges', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true, dodgedThisShot: false };
  const after = tryDodge(c, rockAt(c), 0, () => 0.0001);
  assert.equal(after.x, c.x, 'it should not have moved');
});

test('a dodge chance of one always dodges a threatening rock', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true, dodgedThisShot: false };
  const after = tryDodge(c, rockAt(c), 1, () => 0);
  assert.notEqual(after.x, c.x, 'it should have leapt aside');
});

// The cap that keeps high levels winnable.
test('a creature only attempts one dodge per shot', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true, dodgedThisShot: false };
  const once = tryDodge(c, rockAt(c), 1, () => 0);
  const twice = tryDodge(once, rockAt(once), 1, () => 0);
  assert.equal(twice.x, once.x, 'a second dodge in the same shot must not happen');
});

test('a rock nowhere near a creature does not make it dodge', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true, dodgedThisShot: false };
  const far = { x: 5000, y: 0, z: 300, vx: 0, vy: 0, vz: 400 };
  assert.equal(tryDodge(c, far, 1, () => 0).dodgedThisShot, false);
});

test('resetDodges clears the flag so the next shot is a fresh chance', () => {
  const cs = [{ ...spawn('cat', {}, fixedRand()), dodgedThisShot: true }];
  assert.equal(resetDodges(cs)[0].dodgedThisShot, false);
});

test('a rock at a creature centre hits it', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true };
  assert.equal(hits({ x: 0, y: radiusOf(c) * 0.5, z: 400 }, c), true);
});

test('a rock far from a creature misses', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true };
  assert.equal(hits({ x: 900, y: 0, z: 400 }, c), false);
});

test('a rock passing at the wrong depth misses', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: true };
  assert.equal(hits({ x: 0, y: 0, z: 40 }, c), false);
});

test('a dead creature cannot be hit again', () => {
  const c = { ...spawn('cat', {}, fixedRand()), x: 0, y: 0, z: 400, alive: false };
  assert.equal(hits({ x: 0, y: 0, z: 400 }, c), false);
});

test('firstHit finds the struck creature and null when nothing is struck', () => {
  const c = { ...spawn('cat', {}, fixedRand()), id: 'a', x: 0, y: 0, z: 400, alive: true };
  assert.equal(firstHit({ x: 0, y: 17, z: 400 }, [c])?.id, 'a');
  assert.equal(firstHit({ x: 5000, y: 0, z: 400 }, [c]), null);
});

test('stepAll does not mutate the creatures passed in', () => {
  const cs = [{ ...spawn('cat', {}, fixedRand()), x: 0, dir: 1, speed: 100, alive: true }];
  stepAll(cs, 1, { rand: fixedRand() });
  assert.equal(cs[0].x, 0);
});
