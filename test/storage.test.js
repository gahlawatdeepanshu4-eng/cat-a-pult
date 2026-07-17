import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SAVE, isValidSave, loadSave, writeSave, recordRun } from '../src/storage.js';
import { pointerToAim } from '../src/input.js';

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
  assert.equal(isValidSave({ version: 1, bestScore: 0, totalCatsFired: 0 }), false);
  assert.equal(isValidSave({ version: 2, bestScore: 'x', totalCatsFired: 0 }), false);
});

test('loadSave returns defaults when storage is empty', () => {
  assert.deepEqual(loadSave(new FakeStorage()), DEFAULT_SAVE);
});

test('loadSave round-trips a written save', () => {
  const s = new FakeStorage();
  const save = { ...DEFAULT_SAVE, bestScore: 140, totalCatsFired: 30 };
  writeSave(save, s);
  assert.deepEqual(loadSave(s), save);
});

test('loadSave survives corrupt JSON', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v2', '{not json');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave survives valid JSON of the wrong shape', () => {
  const s = new FakeStorage();
  s.setItem('catapult.save.v2', '{"hello":"world"}');
  assert.deepEqual(loadSave(s), DEFAULT_SAVE);
});

test('loadSave survives a storage that throws', () => {
  assert.deepEqual(loadSave(new ThrowingStorage()), DEFAULT_SAVE);
});

test('writeSave reports failure rather than throwing', () => {
  assert.equal(writeSave(DEFAULT_SAVE, new ThrowingStorage()), false);
  assert.equal(writeSave(DEFAULT_SAVE, new FakeStorage()), true);
});

test('recordRun keeps the higher score', () => {
  let s = recordRun(DEFAULT_SAVE, 80, 10);
  s = recordRun(s, 40, 10);
  assert.equal(s.bestScore, 80);
  assert.equal(s.totalCatsFired, 20);
});

test('recordRun does not mutate the save passed in', () => {
  recordRun(DEFAULT_SAVE, 80, 10);
  assert.equal(DEFAULT_SAVE.bestScore, 0);
});

test('pointerToAim centres a pointer in the middle of the screen', () => {
  const a = pointerToAim({ x: 500, y: 250 }, 1000, 500);
  assert.equal(a.nx, 0);
  assert.equal(a.ny, 0.5);
});

test('pointerToAim maps left of screen to negative heading', () => {
  assert.ok(pointerToAim({ x: 0, y: 250 }, 1000, 500).nx < 0);
  assert.ok(pointerToAim({ x: 1000, y: 250 }, 1000, 500).nx > 0);
});

test('pointerToAim maps high on screen to high elevation', () => {
  assert.ok(pointerToAim({ x: 500, y: 0 }, 1000, 500).ny > pointerToAim({ x: 500, y: 400 }, 1000, 500).ny);
});

test('pointerToAim clamps a pointer dragged off screen', () => {
  const a = pointerToAim({ x: -9999, y: 9999 }, 1000, 500);
  assert.equal(a.nx, -1);
  assert.equal(a.ny, 0);
});

test('pointerToAim without a pointer aims straight ahead', () => {
  assert.deepEqual(pointerToAim(null, 1000, 500), { nx: 0, ny: 0.5 });
});
