import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchVelocity, stepBody, clampDt } from '../src/ballistics.js';
import { MAX_DT, MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED } from '../src/constants.js';

test('a straight-ahead level shot travels only in z', () => {
  const v = launchVelocity(0, 0, 1);
  assert.equal(Math.round(v.vx), 0);
  assert.equal(Math.round(v.vy), 0);
  assert.ok(v.vz > 0, 'must fly into the screen');
});

test('positive heading sends the cat to the right', () => {
  const v = launchVelocity(0.3, 0, 1);
  assert.ok(v.vx > 0);
  assert.ok(v.vz > 0, 'still goes forward');
});

test('negative heading sends the cat to the left', () => {
  assert.ok(launchVelocity(-0.3, 0, 1).vx < 0);
});

test('elevation sends the cat upward', () => {
  assert.ok(launchVelocity(0, 0.5, 1).vy > 0);
});

test('more elevation trades forward speed for height', () => {
  const low = launchVelocity(0, 0.1, 1);
  const high = launchVelocity(0, 0.6, 1);
  assert.ok(high.vy > low.vy);
  assert.ok(high.vz < low.vz);
});

test('full power is faster than no power', () => {
  const weak = launchVelocity(0, 0.3, 0);
  const strong = launchVelocity(0, 0.3, 1);
  const speed = (v) => Math.hypot(v.vx, v.vy, v.vz);
  assert.ok(speed(strong) > speed(weak));
});

test('zero power still launches, so a shot is never wasted silently', () => {
  const v = launchVelocity(0, 0.3, 0);
  assert.ok(Math.hypot(v.vx, v.vy, v.vz) >= MIN_LAUNCH_SPEED - 1);
});

test('power is capped at the maximum speed', () => {
  const v = launchVelocity(0, 0, 1);
  assert.ok(Math.hypot(v.vx, v.vy, v.vz) <= MAX_LAUNCH_SPEED + 1);
});

test('stepBody carries the cat forward in z', () => {
  const next = stepBody({ x: 0, y: 100, z: 0, vx: 0, vy: 0, vz: 200 }, 0.5, 0);
  assert.equal(next.z, 100);
});

test('stepBody applies gravity to vy before moving y', () => {
  const next = stepBody({ x: 0, y: 100, z: 0, vx: 0, vy: 0, vz: 0 }, 1, -10);
  assert.equal(next.vy, -10);
  assert.equal(next.y, 90);
});

test('stepBody does not mutate its input', () => {
  const body = { x: 1, y: 2, z: 3, vx: 4, vy: 5, vz: 6 };
  stepBody(body, 1, -10);
  assert.deepEqual(body, { x: 1, y: 2, z: 3, vx: 4, vy: 5, vz: 6 });
});

test('clampDt caps a resumed backgrounded tab', () => {
  assert.equal(clampDt(9), MAX_DT);
});
