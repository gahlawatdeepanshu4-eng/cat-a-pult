import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepProjectile, launchVelocity, clampDt, circlesOverlap } from '../src/physics.js';
import { MAX_DT } from '../src/constants.js';

test('stepProjectile moves along x at constant vx', () => {
  const next = stepProjectile({ x: 0, y: 100, vx: 200, vy: 0 }, 0.5, 0);
  assert.equal(next.x, 100);
  assert.equal(next.vx, 200);
});

test('stepProjectile applies gravity to vy before moving y (semi-implicit)', () => {
  const next = stepProjectile({ x: 0, y: 100, vx: 0, vy: 0 }, 1, -10);
  assert.equal(next.vy, -10);
  assert.equal(next.y, 90);
});

test('stepProjectile does not mutate the input body', () => {
  const body = { x: 0, y: 100, vx: 5, vy: 5 };
  stepProjectile(body, 1, -10);
  assert.deepEqual(body, { x: 0, y: 100, vx: 5, vy: 5 });
});

test('launchVelocity at 0 rad sends all speed along x', () => {
  const v = launchVelocity(0, 1, 1000);
  assert.equal(Math.round(v.vx), 1000);
  assert.equal(Math.round(v.vy), 0);
});

test('launchVelocity at 90 deg sends all speed up', () => {
  const v = launchVelocity(Math.PI / 2, 1, 1000);
  assert.equal(Math.round(v.vx), 0);
  assert.equal(Math.round(v.vy), 1000);
});

test('launchVelocity scales linearly with power', () => {
  const v = launchVelocity(0, 0.5, 1000);
  assert.equal(Math.round(v.vx), 500);
});

test('clampDt caps huge deltas from a backgrounded tab', () => {
  assert.equal(clampDt(5), MAX_DT);
});

test('clampDt leaves normal frame deltas alone', () => {
  assert.equal(clampDt(0.016), 0.016);
});

test('circlesOverlap detects touching circles', () => {
  assert.equal(circlesOverlap(0, 0, 10, 15, 0, 10), true);
});

test('circlesOverlap rejects separated circles', () => {
  assert.equal(circlesOverlap(0, 0, 10, 25, 0, 10), false);
});
