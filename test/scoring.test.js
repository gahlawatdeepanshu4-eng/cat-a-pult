import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMultiplier, hitScore } from '../src/scoring.js';
import {
  NEAR_Z, WALL_Z, SCORE_NEAR_MULT, SCORE_FAR_MULT, CAT_POINTS, TREX_POINTS,
} from '../src/constants.js';

test('the nearest kill scores at the base multiplier', () => {
  assert.equal(distanceMultiplier(NEAR_Z), SCORE_NEAR_MULT);
});

test('a kill at the wall scores at the far multiplier', () => {
  assert.equal(distanceMultiplier(WALL_Z), SCORE_FAR_MULT);
});

test('the multiplier sits between the two at the midpoint', () => {
  const mid = (NEAR_Z + WALL_Z) / 2;
  assert.equal(distanceMultiplier(mid), (SCORE_NEAR_MULT + SCORE_FAR_MULT) / 2);
});

test('the multiplier never drops below base or climbs past the far cap', () => {
  assert.equal(distanceMultiplier(NEAR_Z - 500), SCORE_NEAR_MULT, 'closer than any spawn');
  assert.equal(distanceMultiplier(WALL_Z + 500), SCORE_FAR_MULT, 'beyond the wall');
});

test('the multiplier only ever grows with distance', () => {
  let last = -Infinity;
  for (let z = NEAR_Z; z <= WALL_Z; z += 80) {
    const m = distanceMultiplier(z);
    assert.ok(m >= last, `multiplier dipped at z=${z}`);
    last = m;
  }
});

test('a far hit is worth more than a near one for the same creature', () => {
  assert.ok(hitScore(CAT_POINTS, WALL_Z) > hitScore(CAT_POINTS, NEAR_Z));
});

test('a near hit scores exactly the base points', () => {
  assert.equal(hitScore(CAT_POINTS, NEAR_Z), CAT_POINTS);
  assert.equal(hitScore(TREX_POINTS, NEAR_Z), TREX_POINTS);
});

test('the farthest kill pays the full multiplier', () => {
  assert.equal(hitScore(CAT_POINTS, WALL_Z), CAT_POINTS * SCORE_FAR_MULT);   // 20 -> 50
  assert.equal(hitScore(TREX_POINTS, WALL_Z), TREX_POINTS * SCORE_FAR_MULT); // 50 -> 125
});

test('scores are rounded to a tidy multiple of five', () => {
  for (let z = NEAR_Z; z <= WALL_Z; z += 37) {
    assert.equal(hitScore(CAT_POINTS, z) % 5, 0, `cat score at z=${z} is not a multiple of 5`);
    assert.equal(hitScore(TREX_POINTS, z) % 5, 0, `trex score at z=${z} is not a multiple of 5`);
  }
});
