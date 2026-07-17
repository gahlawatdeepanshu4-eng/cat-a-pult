import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, launch, tick, resolveShot, nextShot,
  inZone, accuracyPoints, scoreShot,
} from '../src/level.js';

const def = {
  id: 1,
  name: 'Test',
  shots: 3,
  zone: { x: 1000, width: 400 },
  movingTarget: null,
  bounds: { maxX: 3000 },
};

test('createRun starts aiming with all shots', () => {
  const run = createRun(def);
  assert.equal(run.phase, 'aiming');
  assert.equal(run.shotsLeft, 3);
  assert.equal(run.cleared, false);
});

test('launch spends a shot and starts flying', () => {
  const run = launch(createRun(def), { angle: Math.PI / 4, power: 1 });
  assert.equal(run.phase, 'flying');
  assert.equal(run.shotsLeft, 2);
  assert.ok(run.cat);
});

test('launch is ignored when not aiming', () => {
  const flying = launch(createRun(def), { angle: 0.5, power: 1 });
  const again = launch(flying, { angle: 0.5, power: 1 });
  assert.equal(again.shotsLeft, 2);
});

test('inZone is inclusive of both edges', () => {
  assert.equal(inZone(def.zone, 1000), true);
  assert.equal(inZone(def.zone, 1400), true);
  assert.equal(inZone(def.zone, 999), false);
  assert.equal(inZone(def.zone, 1401), false);
});

test('accuracyPoints peaks at zone centre', () => {
  assert.equal(accuracyPoints(def.zone, 1200), 1000);
});

test('accuracyPoints falls to zero at the zone edge', () => {
  assert.equal(accuracyPoints(def.zone, 1000), 0);
});

test('accuracyPoints is zero outside the zone', () => {
  assert.equal(accuracyPoints(def.zone, 5000), 0);
});

test('scoreShot adds moving target and efficiency bonuses', () => {
  // centre hit (1000) + target (500) + 2 unused shots (500) = 2000
  assert.equal(scoreShot(def.zone, 1200, true, 2), 2000);
});

test('scoreShot without bonuses is accuracy alone', () => {
  assert.equal(scoreShot(def.zone, 1200, false, 0), 1000);
});

test('tick ends the shot when the cat reaches the ground', () => {
  let run = launch(createRun(def), { angle: Math.PI / 4, power: 1 });
  for (let i = 0; i < 1000 && run.phase === 'flying'; i++) run = tick(run, 1 / 60);
  assert.equal(run.phase, 'landed');
  assert.ok(run.landing.x > 0);
});

test('tick ends the shot when the cat leaves the level bounds', () => {
  const narrow = { ...def, bounds: { maxX: 300 } };
  let run = launch(createRun(narrow), { angle: Math.PI / 4, power: 1 });
  for (let i = 0; i < 1000 && run.phase === 'flying'; i++) run = tick(run, 1 / 60);
  assert.equal(run.phase, 'landed');
  assert.equal(run.landing.inZone, false);
});

test('resolveShot clears the level when the cat landed in the zone', () => {
  const run = resolveShot({
    ...createRun(def),
    phase: 'landed',
    shotsLeft: 1,
    landing: { x: 1200, inZone: true },
    targetHit: false,
  });
  assert.equal(run.phase, 'cleared');
  assert.equal(run.cleared, true);
  assert.equal(run.score, 1250); // 1000 accuracy + 250 for one unused shot
});

test('resolveShot fails the level when the last shot missed', () => {
  const run = resolveShot({
    ...createRun(def),
    phase: 'landed',
    shotsLeft: 0,
    landing: { x: 50, inZone: false },
    targetHit: false,
  });
  assert.equal(run.phase, 'failed');
  assert.equal(run.cleared, false);
});

test('resolveShot returns to aiming when a miss leaves shots left', () => {
  const run = resolveShot({
    ...createRun(def),
    phase: 'landed',
    shotsLeft: 2,
    landing: { x: 50, inZone: false },
    targetHit: false,
  });
  assert.equal(run.phase, 'aiming');
});

test('nextShot resets the cat but keeps remaining shots', () => {
  const run = nextShot({ ...createRun(def), phase: 'aiming', shotsLeft: 2, cat: { x: 1 } });
  assert.equal(run.cat, null);
  assert.equal(run.shotsLeft, 2);
});

test('a moving target slides between its bounds and reverses', () => {
  const movingDef = {
    ...def,
    movingTarget: { y: 300, xMin: 500, xMax: 600, speed: 1000 },
  };
  let run = launch(createRun(movingDef), { angle: Math.PI / 2, power: 1 });
  const seen = [];
  for (let i = 0; i < 60; i++) {
    run = tick(run, 1 / 60);
    seen.push(run.target.x);
  }
  assert.ok(Math.min(...seen) >= 500);
  assert.ok(Math.max(...seen) <= 600);
});

test('run state is not mutated by tick', () => {
  const run = launch(createRun(def), { angle: Math.PI / 4, power: 1 });
  const before = run.cat.x;
  tick(run, 1 / 60);
  assert.equal(run.cat.x, before);
});
