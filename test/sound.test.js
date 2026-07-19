import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createSound, noteHz, fireSoundFor, WEAPON_SOUND, MELODY, VOICED_KINDS,
  CLIP_KINDS, clipUrl,
} from '../src/sound.js';
import { WEAPON_ORDER } from '../src/weapons.js';
import { KIND } from '../src/creatures.js';
import { loadMuted, writeMuted } from '../src/storage.js';

test('noteHz maps MIDI to frequency, A4 = 440', () => {
  assert.equal(Math.round(noteHz(69)), 440);
  assert.equal(Math.round(noteHz(81)), 880); // an octave up doubles
  assert.equal(Math.round(noteHz(57)), 220); // an octave down halves
});

test('every weapon has a fire sound, and it is well-formed', () => {
  for (const name of WEAPON_ORDER) {
    const s = WEAPON_SOUND[name];
    assert.ok(s, `missing fire sound for ${name}`);
    assert.ok(s.freq > 0 && s.to > 0 && s.dur > 0 && s.gain > 0);
    assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(s.type));
  }
});

test('every creature kind has a pained voice (none ships silent)', () => {
  for (const kind of Object.keys(KIND)) {
    assert.ok(VOICED_KINDS.includes(kind), `no voice for creature "${kind}"`);
  }
});

test('every creature has a real hit clip, and the file actually exists on disk', () => {
  for (const kind of Object.keys(KIND)) {
    assert.ok(CLIP_KINDS.includes(kind), `no clip mapping for "${kind}"`);
    const url = clipUrl(kind);
    assert.match(url, /\/audio\/.+\.mp3$/, `clip url looks wrong: ${url}`);
    assert.ok(existsSync(fileURLToPath(url)), `missing clip file for "${kind}": ${url}`);
  }
});

test('fireSoundFor falls back to the catapult for an unknown weapon', () => {
  assert.equal(fireSoundFor('nope'), WEAPON_SOUND.catapult);
  assert.equal(fireSoundFor('bazooka'), WEAPON_SOUND.bazooka);
});

test('the melody has matched lead/bass lines and playable notes', () => {
  assert.equal(MELODY.lead.length, MELODY.bass.length);
  assert.ok(MELODY.bpm > 0);
  for (const m of MELODY.lead) assert.ok(m === null || (m > 0 && m < 128));
  for (const m of MELODY.bass) assert.ok(m === null || (m > 0 && m < 128));
});

test('the engine imports and runs safely in Node (no window): every call no-ops', () => {
  const s = createSound();
  // None of these may throw when there is no AudioContext.
  assert.doesNotThrow(() => {
    s.resume();
    s.fire('bazooka');
    s.hit({ blast: 150, kills: 3, kinds: ['cat', 'trex', 'bunnyrex'] });
    s.hit({ kind: 'ducktrex', kinds: ['ducktrex'] });
    for (const kind of VOICED_KINDS) s.hit({ kind, kinds: [kind] });
    s.cleared();
    s.failed();
    s.startMusic();
    s.stopMusic();
  });
});

test('mute state round-trips and toggles', () => {
  const s = createSound({ muted: true });
  assert.equal(s.isMuted(), true);
  assert.equal(s.toggleMute(), false);
  assert.equal(s.isMuted(), false);
  assert.equal(s.setMuted(true), true);
});

test('writeMuted/loadMuted persist through a storage stub, defaulting to off', () => {
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
  };
  assert.equal(loadMuted(storage), false); // nothing saved yet
  writeMuted(true, storage);
  assert.equal(loadMuted(storage), true);
  writeMuted(false, storage);
  assert.equal(loadMuted(storage), false);
});
