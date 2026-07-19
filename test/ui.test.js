import test from 'node:test';
import assert from 'node:assert/strict';
import {
  homeButtons, settingsButtons, pauseButtons, howtoButtons, playButtons,
  hitTest, SCREEN_BUTTONS,
} from '../src/ui.js';

const centre = (b) => [b.x + b.w / 2, b.y + b.h / 2];
const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('every screen: buttons sit inside the canvas (0..1 in both axes)', () => {
  for (const [name, fn] of Object.entries(SCREEN_BUTTONS)) {
    for (const b of fn()) {
      assert.ok(b.x >= 0 && b.x + b.w <= 1, `${name}/${b.id} out of x range`);
      assert.ok(b.y >= 0 && b.y + b.h <= 1, `${name}/${b.id} out of y range`);
      assert.ok(b.w > 0 && b.h > 0, `${name}/${b.id} has no area`);
    }
  }
});

test('every screen: no two buttons overlap', () => {
  for (const [name, fn] of Object.entries(SCREEN_BUTTONS)) {
    const bs = fn();
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        assert.ok(!overlaps(bs[i], bs[j]), `${name}: ${bs[i].id} overlaps ${bs[j].id}`);
      }
    }
  }
});

test('hitTest returns the button whose rect contains the point', () => {
  const bs = homeButtons();
  for (const b of bs) {
    assert.equal(hitTest(bs, ...centre(b)), b.id);
  }
});

test('hitTest returns null when the point misses every button', () => {
  assert.equal(hitTest(homeButtons(), 0.5, 0.02), null); // above the top button
  assert.equal(hitTest(settingsButtons(), 0.01, 0.99), null);
});

test('settings and pause expose exactly the expected actions', () => {
  assert.deepEqual(settingsButtons().map((b) => b.id), ['music', 'sfx', 'reset', 'back']);
  assert.deepEqual(pauseButtons().map((b) => b.id), ['resume', 'restart', 'settings', 'quit']);
  assert.deepEqual(homeButtons().map((b) => b.id), ['play', 'settings', 'howto']);
  assert.deepEqual(howtoButtons().map((b) => b.id), ['back']);
});

test('the in-play corners are pause (bottom-left) and mute (bottom-right)', () => {
  const bs = playButtons();
  const pause = bs.find((b) => b.id === 'pause');
  const mute = bs.find((b) => b.id === 'mute');
  assert.ok(pause && mute);
  assert.equal(hitTest(bs, 0.01, 0.99), 'pause');  // bottom-left
  assert.equal(hitTest(bs, 0.99, 0.99), 'mute');   // bottom-right
  assert.equal(hitTest(bs, 0.5, 0.5), null);       // centre is playfield
});
