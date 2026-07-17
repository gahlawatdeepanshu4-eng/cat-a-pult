import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeView, depthScale, project } from '../src/project.js';
import { WALL_Z } from '../src/constants.js';

const view = makeView({ width: 1280, height: 720 });

test('things further away are drawn smaller', () => {
  assert.ok(depthScale(WALL_Z) < depthScale(0));
});

test('depth scale never goes negative or blows up behind the camera', () => {
  assert.ok(depthScale(-99999) >= 0);
  assert.ok(Number.isFinite(depthScale(-99999)));
});

test('a point dead centre projects to the middle of the screen', () => {
  assert.equal(Math.round(project({ x: 0, y: 250, z: 0 }, view).x), Math.round(view.width / 2));
});

test('positive x projects right of centre, negative x left', () => {
  assert.ok(project({ x: 300, y: 0, z: 400 }, view).x > view.width / 2);
  assert.ok(project({ x: -300, y: 0, z: 400 }, view).x < view.width / 2);
});

test('higher y projects further up the screen', () => {
  const low = project({ x: 0, y: 0, z: 400 }, view);
  const high = project({ x: 0, y: 400, z: 400 }, view);
  assert.ok(high.y < low.y, 'screen y grows downward');
});

test('the same offset shrinks toward the horizon as it recedes', () => {
  const centre = view.width / 2;
  const near = project({ x: 300, y: 0, z: 100 }, view);
  const far = project({ x: 300, y: 0, z: 1400 }, view);
  assert.ok(Math.abs(far.x - centre) < Math.abs(near.x - centre));
});

test('project reports the scale it used, so callers can size sprites', () => {
  assert.equal(project({ x: 0, y: 0, z: 500 }, view).scale, depthScale(500));
});

test('project does not mutate the point', () => {
  const pt = { x: 1, y: 2, z: 3 };
  project(pt, view);
  assert.deepEqual(pt, { x: 1, y: 2, z: 3 });
});
