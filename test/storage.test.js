import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SAVE, isValidSave, loadSave, writeSave, recordClear, recordShot,
} from '../src/storage.js';

class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

class ThrowingStorage {
  getItem() { throw new Error('blocked'); }
  setItem() { throw new Error('quota exceeded'); }
}

test('isValidSave accepts the default save', () => {
  assert.equal(isValidSave(DEFAULT_SAVE), true);
});

test('isValidSave rejects junk', () => {
  assert.equal(isValidSave(null), false);
  assert.equal(isValidSave('nope'), false);
  assert.equal(isValidSave({}), false);
  assert.equal(isValidSave({ version: 1, unlockedLevel: 'x', bestScores: {}, totalShots: 0 }), false);
  assert.equal(isValidSave({ version: 1, unlockedLevel: 1, bestScores: null, totalShots: 0 }), false);
});

test('loadSave returns defaults when storage is empty', () => {
  assert.deepEqual(loadSave(new FakeStorage()), DEFAULT_SAVE);
});

test('loadSave round-trips a written save', () => {
  const s = new FakeStorage();
  const save = { ...DEFAULT_SAVE, unlockedLevel: 3, totalShots: 9 };
  writeSave(save, s);
  assert.deepEqual(loadSave(s), save);
});

test('loadSave falls back to defaults on corrupt JSON', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v1', '{not json');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave falls back to defaults on a valid-JSON-but-wrong-shape entry', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v1', '{"hello":"world"}');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave falls back to defaults when storage throws', () => {
  assert.deepEqual(loadSave(new ThrowingStorage()), DEFAULT_SAVE);
});

test('writeSave reports failure instead of throwing when storage throws', () => {
  assert.equal(writeSave(DEFAULT_SAVE, new ThrowingStorage()), false);
});

test('writeSave reports success on a working storage', () => {
  assert.equal(writeSave(DEFAULT_SAVE, new FakeStorage()), true);
});

test('recordClear unlocks the next level', () => {
  const save = recordClear(DEFAULT_SAVE, 1, 500, 5);
  assert.equal(save.unlockedLevel, 2);
});

test('recordClear does not unlock past the last level', () => {
  const save = recordClear({ ...DEFAULT_SAVE, unlockedLevel: 5 }, 5, 500, 5);
  assert.equal(save.unlockedLevel, 5);
});

test('recordClear keeps the higher score', () => {
  let save = recordClear(DEFAULT_SAVE, 1, 900, 5);
  save = recordClear(save, 1, 400, 5);
  assert.equal(save.bestScores['1'], 900);
});

test('recordClear never lowers unlockedLevel when replaying an old level', () => {
  const save = recordClear({ ...DEFAULT_SAVE, unlockedLevel: 4 }, 1, 100, 5);
  assert.equal(save.unlockedLevel, 4);
});

test('recordClear does not mutate the save passed in', () => {
  const before = { ...DEFAULT_SAVE, bestScores: {} };
  recordClear(before, 1, 900, 5);
  assert.deepEqual(before.bestScores, {});
});

test('recordShot increments the shot counter', () => {
  assert.equal(recordShot(DEFAULT_SAVE).totalShots, 1);
});
