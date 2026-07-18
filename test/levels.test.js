import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelSpec } from '../src/levels.js';
import {
  TOTAL_LEVELS, FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL, MAX_JUMP_CHANCE,
  MAX_SPEED_MULT,
} from '../src/constants.js';

const KNOWN_KINDS = ['cat', 'trex', 'catrex', 'frogrex', 'bunnyrex', 'pigrex', 'ducktrex'];
const countOf = (spec, kind) => spec.roster.find((r) => r.kind === kind)?.count ?? 0;

test('there are fifty levels, numbered in order', () => {
  assert.equal(LEVELS.length, TOTAL_LEVELS);
  assert.deepEqual(LEVELS.map((l) => l.n), Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1));
});

test('levelSpec refuses levels outside the range', () => {
  assert.equal(levelSpec(0), null);
  assert.equal(levelSpec(TOTAL_LEVELS + 1), null);
});

test('dodging starts at zero and rises', () => {
  assert.equal(LEVELS[0].dodgeChance, 0);
  assert.ok(LEVELS[TOTAL_LEVELS - 1].dodgeChance > LEVELS[0].dodgeChance);
});

test('dodging never reaches certainty, or a level could never be cleared', () => {
  for (const l of LEVELS) assert.ok(l.dodgeChance < 1, `level ${l.n} dodge is ${l.dodgeChance}`);
});

test('dodging never gets easier as levels rise', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].dodgeChance >= LEVELS[i - 1].dodgeChance);
  }
});

test('jumping starts at the second level, rises, and stays under its cap', () => {
  assert.equal(LEVELS[0].jumpChance, 0);
  assert.ok(levelSpec(FIRST_JUMP_LEVEL).jumpChance > 0);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].jumpChance >= LEVELS[i - 1].jumpChance);
    assert.ok(LEVELS[i].jumpChance <= MAX_JUMP_CHANCE);
  }
});

test('creatures speed up with the level, from 1x to the cap, never dropping', () => {
  assert.equal(LEVELS[0].speedMult, 1);
  assert.equal(LEVELS[TOTAL_LEVELS - 1].speedMult, MAX_SPEED_MULT);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speedMult >= LEVELS[i - 1].speedMult);
  }
});

test('the roster only holds known kinds with positive counts, summing to targets', () => {
  for (const l of LEVELS) {
    let sum = 0;
    for (const r of l.roster) {
      assert.ok(KNOWN_KINDS.includes(r.kind), `level ${l.n} has unknown kind ${r.kind}`);
      assert.ok(r.count > 0, `level ${l.n} lists ${r.kind} with no count`);
      sum += r.count;
    }
    assert.equal(sum, l.targets, `level ${l.n} targets do not match its roster`);
  }
});

test('no level carries the old flying fields', () => {
  for (const l of LEVELS) {
    assert.equal(l.flyingCats, undefined);
    assert.equal(l.flyingTrexes, undefined);
  }
});

test('each creature kind first appears on its scheduled level', () => {
  const firstLevel = {
    cat: 1, trex: FIRST_TREX_LEVEL, catrex: 8, frogrex: 15,
    bunnyrex: 22, pigrex: 29, ducktrex: 36,
  };
  for (const [kind, from] of Object.entries(firstLevel)) {
    if (from > 1) assert.equal(countOf(levelSpec(from - 1), kind), 0, `${kind} appeared too early`);
    assert.ok(countOf(levelSpec(from), kind) >= 1, `${kind} missing at level ${from}`);
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

// Every creature should be missable at least three times over.
test('rocks give a comfortable margin above the target count', () => {
  for (const l of LEVELS) {
    assert.ok(l.rocks - l.targets >= 3, `level ${l.n} slack is only ${l.rocks - l.targets}`);
  }
});
