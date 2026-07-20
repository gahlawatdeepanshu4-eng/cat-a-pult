import { clampDt, launchVelocity, stepBody } from './ballistics.js';
import { makeView } from './project.js';
import { drawScene, sceneryFor } from './render.js';
import { createInput } from './input.js';
import { aimFromDrag } from './aim.js';
import { createRun, fire, tick, aliveCount } from './game.js';
import { levelSpec } from './levels.js';
import {
  loadSave, writeSave, recordClear, loadMuted, writeMuted,
  loadAudioPrefs, writeAudioPrefs, freshSave,
} from './storage.js';
import { weaponOf } from './weapons.js';
import { createSound } from './sound.js';
import { homeButtons, settingsButtons, pauseButtons, howtoButtons, hitTest } from './ui.js';
import { SLING_Y, GROUND_Y, WALL_Z, GRAVITY, TOTAL_LEVELS, SAMPLER_MODE } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The scenery stays full-bleed, but edge UI (the Power gauge) needs to dodge the
// notch / Dynamic Island. A hidden probe carries the CSS safe-area insets so we
// can read them in JS; multiply by dpr to get device pixels for the renderer.
// Zero on phones without a notch, so nothing moves there.
const safeProbe = document.createElement('div');
safeProbe.style.cssText =
  'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
  + 'padding:env(safe-area-inset-top) env(safe-area-inset-right)'
  + ' env(safe-area-inset-bottom) env(safe-area-inset-left);';
document.body.appendChild(safeProbe);
function readSafeInsets(dpr) {
  const cs = getComputedStyle(safeProbe);
  return {
    top: (parseFloat(cs.paddingTop) || 0) * dpr,
    right: (parseFloat(cs.paddingRight) || 0) * dpr,
    bottom: (parseFloat(cs.paddingBottom) || 0) * dpr,
    left: (parseFloat(cs.paddingLeft) || 0) * dpr,
  };
}

// Clamp to the current build's range: a save from the 50-level campaign must
// not point past the end of the 5-level sampler (createRun would return null
// and the loop would crash on a missing level).
const clampLevel = (n) => Math.min(Math.max(1, n), TOTAL_LEVELS);

let save = loadSave();
let level = clampLevel(save.unlockedLevel);
let run = createRun(level) ?? createRun(1);
// Screens: 'home' | 'menu' (sampler level picker) | 'play' | 'paused' |
// 'settings' | 'howto' | 'cleared' | 'failed' | 'done'.
let screen = 'home';
let settingsReturn = 'home'; // where the settings Back button goes
let pop = null;
let launchAnim = 0; // 1 right after a shot, decays to 0 — the weapon's throw/recoil

// Audio: generated live. Master mute + independent music/SFX toggles, each read
// from its saved setting.
const audioPrefs = loadAudioPrefs();
const sound = createSound({ muted: loadMuted(), music: audioPrefs.music, sfx: audioPrefs.sfx });

// The mute button is a square in the bottom-right corner. One rect, used both
// to draw it (device px, via drawScene) and to hit-test a tap (CSS px, here),
// so what you see and what you tap always line up. Size is a fraction of the
// shorter side, floored so it stays a comfortable phone target.
const MUTE_FRAC = 0.13;
function muteRectCss() {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const s = Math.max(44, Math.min(w, h) * MUTE_FRAC);
  return { x: w - s, y: h - s, s };
}
function tappedMute(x, y) {
  const r = muteRectCss();
  return x >= r.x && y >= r.y;
}

// The pause pad mirrors the mute button in the bottom-LEFT corner.
function tappedPause(x, y) {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const s = Math.max(44, Math.min(w, h) * MUTE_FRAC);
  return x <= s && y >= h - s;
}

// A release that barely moved is a tap (a button press), not an aim drag. Lets
// the in-play corner buttons work without ever swallowing a real shot.
const TAP_PX = 14;
const isTap = (dx, dy) => Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX;

// Menu buttons are laid out in normalised (0..1) space in ui.js; convert a CSS
// tap the same way so the hit-test matches what was drawn.
function tapId(buttons, x, y) {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  return hitTest(buttons, x / w, y / h);
}

function toggleMuteAndPersist() {
  const muted = sound.toggleMute();
  writeMuted(muted);
  if (!muted && screen === 'play') sound.startMusic();
}

function persistAudio() {
  writeAudioPrefs({ music: sound.isMusicEnabled(), sfx: sound.isSfxEnabled() });
}

// The start-menu level picker. Only shown for a short build (the sampler), where
// a row of columns fits and jumping straight to any weapon is the whole point.
// A 50-level campaign falls back to the plain "tap to start" menu.
const MENU_LEVELS = TOTAL_LEVELS <= 8
  ? Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
      n: i + 1,
      weapon: weaponOf(levelSpec(i + 1).weapon).name,
    }))
  : null;

// Which picker column a menu tap landed in — the same even width division the
// renderer draws, so tap and label always agree.
function levelFromTap(x) {
  if (!MENU_LEVELS) return level;
  const w = canvas.clientWidth || 1;
  const col = Math.floor((x / w) * TOTAL_LEVELS);
  return Math.min(TOTAL_LEVELS, Math.max(1, col + 1));
}

function startLevel(n) {
  level = clampLevel(n);
  run = createRun(level);
  screen = 'play';
  pop = null;
  sound.startMusic(); // no-op if muted, music off, or already looping
}

// Home "Play": in the short sampler build, open the level/weapon picker; in the
// full campaign, jump straight into the furthest unlocked level.
function playFromHome() {
  if (MENU_LEVELS) { screen = 'menu'; pop = null; }
  else startLevel(clampLevel(save.unlockedLevel));
}

function openSettings(from) {
  settingsReturn = from;
  screen = 'settings';
}

function resetProgress() {
  save = freshSave();
  writeSave(save);
  level = 1;
  run = createRun(1);
}

// Route a tap on one of the menu-type screens to its action.
function handleMenuTap(x, y) {
  if (screen === 'home') {
    const id = tapId(homeButtons(), x, y);
    if (id === 'play') playFromHome();
    else if (id === 'settings') openSettings('home');
    else if (id === 'howto') screen = 'howto';
    return;
  }
  if (screen === 'howto') {
    if (tapId(howtoButtons(), x, y) === 'back') screen = 'home';
    return;
  }
  if (screen === 'settings') {
    const id = tapId(settingsButtons(), x, y);
    if (id === 'music') { sound.toggleMusic(); persistAudio(); }
    else if (id === 'sfx') { sound.toggleSfx(); persistAudio(); }
    else if (id === 'reset') resetProgress();
    else if (id === 'back') screen = settingsReturn;
    return;
  }
  if (screen === 'paused') {
    if (tappedMute(x, y)) { toggleMuteAndPersist(); return; }
    const id = tapId(pauseButtons(), x, y);
    if (id === 'resume') screen = 'play';
    else if (id === 'restart') startLevel(level);
    else if (id === 'settings') openSettings('paused');
    else if (id === 'quit') { screen = 'home'; pop = null; }
  }
}

// Same maths as the shot itself, so the preview cannot lie.
//
// The arc runs all the way to the sand and reports where it lands. On a flat
// screen a rock passing in FRONT of an animal looks exactly like a rock going
// through it, so the player needs a depth cue: line the landing ring up with
// an animal's shadow and the depths match.
function ghostArc(aim, weapon) {
  if (!aim) return null;
  let b = { x: 0, y: SLING_Y, z: 0, ...launchVelocity(aim.heading, aim.elevation, aim.power, weapon.speedScale) };
  const pts = [];
  for (let i = 0; i < 400; i++) {
    b = stepBody(b, 1 / 60, GRAVITY * weapon.gravityScale);
    if (b.y <= GROUND_Y || b.z > WALL_Z) break;
    if (i % 3 === 0) pts.push({ x: b.x, y: b.y, z: b.z });
  }
  return { points: pts, landing: { x: b.x, y: GROUND_Y, z: Math.min(b.z, WALL_Z) } };
}

// The release uses the gesture it is handed rather than anything cached from
// a previous frame, so the shot is exactly the drag the player just made.
const input = createInput(canvas, {
  onRelease({ dx, dy, x, y }) {
    // The context can only start from a user gesture — this is the first one.
    sound.resume();

    // Full-screen menu screens: any release is a tap; dispatch to a button.
    if (screen === 'home' || screen === 'settings' || screen === 'howto' || screen === 'paused') {
      handleMenuTap(x, y);
      return;
    }

    // The sampler level/weapon picker.
    if (screen === 'menu') {
      if (tappedMute(x, y)) { toggleMuteAndPersist(); return; }
      startLevel(levelFromTap(x));
      return;
    }

    // Between levels: sampler goes back to the picker; the campaign advances.
    if (screen === 'cleared' || screen === 'failed' || screen === 'done') {
      if (tappedMute(x, y)) { toggleMuteAndPersist(); return; }
      if (MENU_LEVELS) { screen = 'menu'; pop = null; return; }
      if (screen === 'failed') { startLevel(level); return; }
      if (screen === 'done') { startLevel(1); return; }
      const next = level + 1;
      if (next > TOTAL_LEVELS) { screen = 'done'; return; }
      startLevel(next);
      return;
    }

    // Live gameplay. Corner taps (pause / mute) come first, but only a genuine
    // tap — never a real aim drag that happens to end in a corner.
    if (isTap(dx, dy) && tappedPause(x, y)) { screen = 'paused'; return; }
    if (isTap(dx, dy) && tappedMute(x, y)) { toggleMuteAndPersist(); return; }

    if (run.phase !== 'aiming') return;
    const aim = aimFromDrag(dx, dy, canvas.clientHeight);
    if (!aim) return; // too short a drag: a cancel, not a dud shot
    run = fire(run, aim);
    sound.fire(run.spec?.weapon ?? 'catapult');
    launchAnim = 1; // kick off the throw/recoil
  },
});

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function update(dt) {
  // Slow enough that the splat lands, is read, and the score follows it.
  if (pop) pop = pop.life > 0 ? { ...pop, life: pop.life - dt * 0.85 } : null;
  // The throw/recoil plays out over ~0.25s.
  if (launchAnim > 0) launchAnim = Math.max(0, launchAnim - dt * 4);

  // Freeze the world off the play screen — this is what makes Pause actually
  // pause (a mid-air rock and the creatures all hold still).
  if (screen !== 'play') return;

  const before = run.phase;
  run = tick(run, dt);

  // A fresh kill always replaces the last splat. lastHit is cleared on every
  // fire, so a miss cannot resurrect the previous hit's blood.
  if (run.lastHit && before === 'flying') {
    pop = { ...run.lastHit, life: 1 };
    sound.hit(run.lastHit);
  }

  if (run.phase === 'cleared') {
    save = recordClear(save, level, run.score);
    writeSave(save);
    screen = 'cleared';
    sound.cleared();
  } else if (run.phase === 'failed') {
    screen = 'failed';
    sound.failed();
  }
}

function overlayLines() {
  if (screen === 'menu') {
    return [
      'Cat-a-pult',
      'Pull back and let go, like a slingshot.',
      'Cats 20, T-rex 50. Tap to start.',
    ];
  }
  if (screen === 'cleared') {
    const best = save.bestScores[String(level)] ?? run.score;
    const prompt = MENU_LEVELS
      ? 'Tap to pick another level'
      : (level >= TOTAL_LEVELS ? 'Tap to finish' : 'Tap for the next level');
    return [
      `Level ${level} cleared`,
      `Score ${run.score}  ·  Best ${best}`,
      prompt,
    ];
  }
  if (screen === 'failed') {
    return [`Out of ${weaponOf(run.spec.weapon).ammo}`, `${aliveCount(run)} still standing`,
      MENU_LEVELS ? 'Tap to pick another level' : 'Tap to try again'];
  }
  if (screen === 'done') {
    return [`All ${TOTAL_LEVELS} levels done`, 'Tap to start over'];
  }
  return null;
}

let last = performance.now();
function frame(now) {
  const dt = clampDt((now - last) / 1000);
  last = now;
  try {
    resize();
    update(dt);

    const view = makeView(canvas);
    const dpr = canvas.width / canvas.clientWidth || 1;
    view.safe = readSafeInsets(dpr); // so edge UI can dodge the notch/Island
    const d = input.getDrag();
    const aiming = screen === 'play' && run.phase === 'aiming';
    const aim = aiming && d
      ? aimFromDrag(d.x - d.startX, d.y - d.startY, canvas.clientHeight)
      : null;
    const weapon = weaponOf(run.spec.weapon);

    drawScene(ctx, {
      creatures: run.creatures,
      rock: run.rock,
      ghost: ghostArc(aim, weapon),
      drag: aiming && d ? { x: d.x * dpr, y: d.y * dpr } : null,
      loaded: aiming,
      power: aim?.power ?? 0,
      weaponName: run.spec?.weapon ?? 'catapult',
      scenery: sceneryFor(level, SAMPLER_MODE),
      aim,
      launch: launchAnim,
      pop,
      hud: {
        level,
        rocks: run.rocksLeft,
        score: run.score,
        left: aliveCount(run),
        weapon: weapon.name,
        weaponId: run.spec?.weapon ?? 'catapult',
      },
      menu: screen === 'menu' && MENU_LEVELS ? MENU_LEVELS : null,
      overlay: screen === 'menu' && MENU_LEVELS ? null : overlayLines(),
      muted: sound.isMuted(),
      screen,
      audio: { music: sound.isMusicEnabled(), sfx: sound.isSfxEnabled() },
    }, view);
  } catch (err) {
    console.error('frame failed', err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('service worker registration failed', err);
    });
  });
}
