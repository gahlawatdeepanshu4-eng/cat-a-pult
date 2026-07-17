import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shotFromDrag, MIN_DRAG_PX } from '../src/input.js';

const DEG = 180 / Math.PI;

test('a drag shorter than the minimum is not a shot', () => {
  assert.equal(shotFromDrag(2, 2, 200), null);
});

test('dragging back and down launches up and to the right', () => {
  // Pull left and down; the cat should go right and up at 45 degrees.
  const shot = shotFromDrag(-100, 100, 200);
  assert.equal(Math.round(shot.angle * DEG), 45);
});

test('dragging straight back launches flat along the ground', () => {
  const shot = shotFromDrag(-100, 0, 200);
  assert.equal(Math.round(shot.angle * DEG), 0);
});

test('dragging straight down launches straight up', () => {
  const shot = shotFromDrag(0, 100, 200);
  assert.equal(Math.round(shot.angle * DEG), 90);
});

test('dragging forward cannot fire the cat backwards', () => {
  // Pulling right would aim left; the clamp must pin it to straight up.
  const shot = shotFromDrag(100, 100, 200);
  assert.ok(shot.angle >= 0 && shot.angle <= Math.PI / 2);
});

test('dragging up cannot fire the cat into the ground', () => {
  const shot = shotFromDrag(-100, -100, 200);
  assert.ok(shot.angle >= 0);
});

test('power scales with drag distance', () => {
  const half = shotFromDrag(-100, 0, 200);
  assert.equal(half.power, 0.5);
});

test('power is capped at 1 no matter how far the drag goes', () => {
  const huge = shotFromDrag(-9999, 0, 200);
  assert.equal(huge.power, 1);
});

test('a drag exactly at the minimum length still counts as a shot', () => {
  const shot = shotFromDrag(-MIN_DRAG_PX, 0, 200);
  assert.ok(shot);
});
