import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getLevel } from '../src/levels.js';
import { CATAPULT_X, MAX_LAUNCH_SPEED, GRAVITY } from '../src/constants.js';

// Conservative: ignores the extra range the launch height buys, so a level
// that passes this is comfortably reachable in practice.
const MAX_RANGE = (MAX_LAUNCH_SPEED ** 2) / Math.abs(GRAVITY);

test('there are five levels', () => {
  assert.equal(LEVELS.length, 5);
});

test('level ids are 1..5 in order', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), [1, 2, 3, 4, 5]);
});

test('every zone is reachable from the catapult', () => {
  for (const l of LEVELS) {
    const far = l.zone.x + l.zone.width;
    assert.ok(far - CATAPULT_X < MAX_RANGE, `level ${l.id} zone is out of range`);
  }
});

test('every level has at least one shot and a positive zone width', () => {
  for (const l of LEVELS) {
    assert.ok(l.shots >= 1, `level ${l.id} has no shots`);
    assert.ok(l.zone.width > 0, `level ${l.id} has an empty zone`);
  }
});

test('bounds always sit beyond the far edge of the zone', () => {
  for (const l of LEVELS) {
    assert.ok(l.bounds.maxX > l.zone.x + l.zone.width, `level ${l.id} bounds cut off its zone`);
  }
});

test('moving targets stay within their own min/max', () => {
  for (const l of LEVELS) {
    if (!l.movingTarget) continue;
    assert.ok(l.movingTarget.xMin < l.movingTarget.xMax, `level ${l.id} target range is inverted`);
    assert.ok(l.movingTarget.y > 0, `level ${l.id} target is underground`);
  }
});

test('levels get harder: zones never widen as ids rise', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].zone.width <= LEVELS[i - 1].zone.width);
  }
});

test('getLevel finds by id and returns undefined otherwise', () => {
  assert.equal(getLevel(3).id, 3);
  assert.equal(getLevel(99), undefined);
});
