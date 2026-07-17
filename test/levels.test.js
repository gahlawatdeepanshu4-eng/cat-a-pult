import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelSpec } from '../src/levels.js';
import {
  TOTAL_LEVELS, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL, FIRST_FLYING_LEVEL,
  FLYING_CATS_PER_LEVEL, FLYING_TREXES_PER_LEVEL,
} from '../src/constants.js';

test('there are twenty levels', () => {
  assert.equal(LEVELS.length, TOTAL_LEVELS);
  assert.deepEqual(LEVELS.map((l) => l.n), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('levelSpec refuses levels outside the range', () => {
  assert.equal(levelSpec(0), null);
  assert.equal(levelSpec(TOTAL_LEVELS + 1), null);
});

test('dodging starts at zero and rises', () => {
  assert.equal(LEVELS[0].dodgeChance, 0);
  assert.ok(LEVELS[19].dodgeChance > LEVELS[0].dodgeChance);
});

test('dodging never reaches certainty, or a level could never be cleared', () => {
  for (const l of LEVELS) {
    assert.ok(l.dodgeChance < 1, `level ${l.n} dodge is ${l.dodgeChance}`);
  }
});

test('dodging never gets easier as levels rise', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].dodgeChance >= LEVELS[i - 1].dodgeChance);
  }
});

test('jumping starts at the second level, not the first', () => {
  assert.equal(LEVELS[0].canJump, false);
  assert.equal(levelSpec(FIRST_JUMP_LEVEL).canJump, true);
});

test('T-rexes appear from level two', () => {
  assert.equal(LEVELS[0].groundTrexes, 0);
  assert.ok(levelSpec(FIRST_TREX_LEVEL).groundTrexes > 0);
});

test('flying creatures only appear after the third level, two of each', () => {
  for (let n = 1; n < FIRST_FLYING_LEVEL; n++) {
    assert.equal(levelSpec(n).flyingCats, 0, `level ${n} should have no flyers`);
    assert.equal(levelSpec(n).flyingTrexes, 0);
  }
  for (let n = FIRST_FLYING_LEVEL; n <= TOTAL_LEVELS; n++) {
    assert.equal(levelSpec(n).flyingCats, FLYING_CATS_PER_LEVEL);
    assert.equal(levelSpec(n).flyingTrexes, FLYING_TREXES_PER_LEVEL);
  }
});

test('every level has at least one target', () => {
  for (const l of LEVELS) assert.ok(l.targets >= 1, `level ${l.n} has nothing to shoot`);
});

test('the target count never shrinks as levels rise', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].targets >= LEVELS[i - 1].targets);
  }
});

// Without this a late level could hand you fewer rocks than creatures and be
// arithmetically impossible no matter how well you shoot.
test('every level gives more rocks than there are creatures to kill', () => {
  for (const l of LEVELS) {
    assert.ok(l.rocks > l.targets,
      `level ${l.n}: ${l.rocks} rocks for ${l.targets} targets leaves no room to miss`);
  }
});

test('later levels allow at least as much slack as early ones', () => {
  const slack = (l) => l.rocks - l.targets;
  assert.ok(slack(LEVELS[19]) >= 3, 'the last level must still be missable a few times');
});
