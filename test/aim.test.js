import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aimFromDrag } from '../src/aim.js';
import {
  MIN_DRAG_PX, MAX_HEADING, MIN_ELEVATION, MAX_ELEVATION, MAX_DRAG_FRACTION,
} from '../src/constants.js';

const H = 720;
const full = H * MAX_DRAG_FRACTION; // drag length that means full power

test('a tap too short to be a drag cancels instead of firing a dud', () => {
  assert.equal(aimFromDrag(0, 0, H), null);
  assert.equal(aimFromDrag(MIN_DRAG_PX - 1, 0, H), null);
});

test('a drag at the minimum length is a real shot', () => {
  assert.ok(aimFromDrag(0, MIN_DRAG_PX, H));
});

// The regression that killed v2: there is no clock, so power comes only from
// how far you pull.
test('power comes from drag length, not from how long you held', () => {
  assert.equal(aimFromDrag(0, full / 2, H).power, 0.5);
  assert.equal(aimFromDrag(0, full, H).power, 1);
});

test('power is capped at full however hard you yank', () => {
  assert.equal(aimFromDrag(0, full * 9, H).power, 1);
});

test('pulling down fires upward', () => {
  const shot = aimFromDrag(0, full * 0.6, H);
  assert.ok(shot.elevation > MIN_ELEVATION, 'dragging down must raise the shot');
});

test('pulling further down fires higher', () => {
  const shallow = aimFromDrag(0, full * 0.25, H);
  const steep = aimFromDrag(0, full * 0.9, H);
  assert.ok(steep.elevation > shallow.elevation);
});

test('pulling left fires right, pulling right fires left', () => {
  assert.ok(aimFromDrag(-full * 0.5, 10, H).heading > 0, 'pull left, fire right');
  assert.ok(aimFromDrag(full * 0.5, 10, H).heading < 0, 'pull right, fire left');
});

test('heading is clamped so you cannot fire behind yourself', () => {
  assert.equal(aimFromDrag(-full * 9, 10, H).heading, MAX_HEADING);
  assert.equal(aimFromDrag(full * 9, 10, H).heading, -MAX_HEADING);
});

test('elevation is clamped to its limits', () => {
  assert.equal(aimFromDrag(0, full * 9, H).elevation, MAX_ELEVATION);
});

test('dragging up does not fire the rock into the ground', () => {
  const shot = aimFromDrag(0, -full, H);
  assert.equal(shot.elevation, MIN_ELEVATION);
});

test('a diagonal pull sets heading and elevation together', () => {
  const shot = aimFromDrag(-full * 0.5, full * 0.5, H);
  assert.ok(shot.heading > 0);
  assert.ok(shot.elevation > MIN_ELEVATION);
});

test('power scales with screen height, so it feels the same on any phone', () => {
  const small = aimFromDrag(0, 360 * MAX_DRAG_FRACTION, 360);
  const large = aimFromDrag(0, 1080 * MAX_DRAG_FRACTION, 1080);
  assert.equal(small.power, large.power);
});
