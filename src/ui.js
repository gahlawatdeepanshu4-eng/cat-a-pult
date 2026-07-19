// The menu/UI layer, kept pure so it can be unit-tested with no browser: it
// only computes *where* buttons go and *which* one a tap hit. Drawing lives in
// render.js, tap dispatch in main.js — both read the same layout here, so what
// you see is always exactly what you tap.
//
// Coordinates are NORMALISED (0..1 of the canvas width/height). That sidesteps
// the device-pixel vs CSS-pixel mismatch entirely: render multiplies by the
// device size, input divides the CSS tap by the client size, and they agree.

// A vertical stack of equal buttons, centred horizontally.
function column(ids, { top, w = 0.66, h = 0.11, gap = 0.035 } = {}) {
  const x = 0.5 - w / 2;
  return ids.map((id, i) => ({ id, x, y: top + i * (h + gap), w, h }));
}

// Home / title screen: Play big, then Settings and How-to-play.
export function homeButtons() {
  return [
    { id: 'play', x: 0.5 - 0.34, y: 0.44, w: 0.68, h: 0.15 },
    ...column(['settings', 'howto'], { top: 0.655, w: 0.68, h: 0.1, gap: 0.03 }),
  ];
}

// Settings: two audio toggles, a reset, and a way back. `back` is last so it
// sits at the bottom like a footer on every sub-screen.
export function settingsButtons() {
  return column(['music', 'sfx', 'reset', 'back'], { top: 0.34, w: 0.72, h: 0.115, gap: 0.03 });
}

// Pause overlay (mid-game).
export function pauseButtons() {
  return column(['resume', 'restart', 'settings', 'quit'], { top: 0.34, w: 0.72, h: 0.115, gap: 0.03 });
}

// How-to-play is just text + a back button.
export function howtoButtons() {
  return [{ id: 'back', x: 0.5 - 0.28, y: 0.82, w: 0.56, h: 0.11 }];
}

// Buttons drawn on top of live gameplay. Two small corner pads that mirror each
// other: pause bottom-left, mute bottom-right (mute keeps its own handler in
// main.js, but is listed here so nothing else claims that corner).
export function playButtons() {
  const s = 0.13; // matches the mute button's corner square
  return [
    { id: 'pause', x: 0.0, y: 1 - s, w: s, h: s },
    { id: 'mute', x: 1 - s, y: 1 - s, w: s, h: s },
  ];
}

// The one button (by id) that a normalised point falls inside, or null. Last
// match wins is irrelevant because layouts never overlap (a test guards that).
export function hitTest(buttons, nx, ny) {
  for (const b of buttons) {
    if (nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h) return b.id;
  }
  return null;
}

// All screens whose layout is defined here, for tests to iterate.
export const SCREEN_BUTTONS = {
  home: homeButtons,
  settings: settingsButtons,
  paused: pauseButtons,
  howto: howtoButtons,
  play: playButtons,
};
