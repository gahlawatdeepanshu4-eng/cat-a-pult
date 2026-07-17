import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SAVE, isValidSave, loadSave, writeSave, recordClear } from '../src/storage.js';
import { TOTAL_LEVELS } from '../src/constants.js';

class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

class ThrowingStorage {
  getItem() { throw new Error('blocked'); }
  setItem() { throw new Error('quota exceeded'); }
}

test('isValidSave accepts the default and rejects junk', () => {
  assert.equal(isValidSave(DEFAULT_SAVE), true);
  assert.equal(isValidSave(null), false);
  assert.equal(isValidSave({}), false);
  assert.equal(isValidSave({ version: 2, unlockedLevel: 1, bestScores: {} }), false);
  assert.equal(isValidSave({ version: 3, unlockedLevel: 'x', bestScores: {} }), false);
  assert.equal(isValidSave({ version: 3, unlockedLevel: 1, bestScores: null }), false);
});

test('loadSave returns defaults when storage is empty', () => {
  assert.deepEqual(loadSave(new FakeStorage()), DEFAULT_SAVE);
});

test('loadSave round-trips a written save', () => {
  const s = new FakeStorage();
  const save = { version: 3, unlockedLevel: 7, bestScores: { 1: 120 } };
  writeSave(save, s);
  assert.deepEqual(loadSave(s), save);
});

test('loadSave survives corrupt JSON', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v3', '{not json');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave survives valid JSON of the wrong shape', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v3', '{"hello":"world"}');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave survives a storage that throws', () => {
  assert.deepEqual(loadSave(new ThrowingStorage()), DEFAULT_SAVE);
});

test('writeSave reports failure rather than throwing', () => {
  assert.equal(writeSave(DEFAULT_SAVE, new ThrowingStorage()), false);
  assert.equal(writeSave(DEFAULT_SAVE, new FakeStorage()), true);
});

test('clearing a level unlocks the next one', () => {
  assert.equal(recordClear(DEFAULT_SAVE, 1, 100).unlockedLevel, 2);
});

test('clearing the last level does not unlock past the end', () => {
  const save = { ...DEFAULT_SAVE, unlockedLevel: TOTAL_LEVELS };
  assert.equal(recordClear(save, TOTAL_LEVELS, 100).unlockedLevel, TOTAL_LEVELS);
});

test('replaying an early level does not lose later progress', () => {
  const save = { ...DEFAULT_SAVE, unlockedLevel: 9 };
  assert.equal(recordClear(save, 1, 100).unlockedLevel, 9);
});

test('the higher score for a level is kept', () => {
  let s = recordClear(DEFAULT_SAVE, 3, 200);
  s = recordClear(s, 3, 50);
  assert.equal(s.bestScores['3'], 200);
});

test('recordClear does not mutate the save passed in', () => {
  recordClear(DEFAULT_SAVE, 1, 100);
  assert.deepEqual(DEFAULT_SAVE.bestScores, {});
});
