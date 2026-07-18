import { clampDt, launchVelocity, stepBody } from './ballistics.js';
import { makeView } from './project.js';
import { drawScene } from './render.js';
import { createInput } from './input.js';
import { aimFromDrag } from './aim.js';
import { createRun, fire, tick, aliveCount } from './game.js';
import { loadSave, writeSave, recordClear } from './storage.js';
import { SLING_Y, GROUND_Y, WALL_Z, TOTAL_LEVELS } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let save = loadSave();
let level = save.unlockedLevel;
let run = createRun(level);
let screen = 'menu'; // 'menu' | 'play' | 'cleared' | 'failed' | 'done'
let pop = null;

function startLevel(n) {
  level = n;
  run = createRun(n);
  screen = 'play';
  pop = null;
}

// Same maths as the shot itself, so the preview cannot lie.
//
// The arc runs all the way to the sand and reports where it lands. On a flat
// screen a rock passing in FRONT of an animal looks exactly like a rock going
// through it, so the player needs a depth cue: line the landing ring up with
// an animal's shadow and the depths match.
function ghostArc(aim) {
  if (!aim) return null;
  let b = { x: 0, y: SLING_Y, z: 0, ...launchVelocity(aim.heading, aim.elevation, aim.power) };
  const pts = [];
  for (let i = 0; i < 400; i++) {
    b = stepBody(b, 1 / 60);
    if (b.y <= GROUND_Y || b.z > WALL_Z) break;
    if (i % 3 === 0) pts.push({ x: b.x, y: b.y, z: b.z });
  }
  return { points: pts, landing: { x: b.x, y: GROUND_Y, z: Math.min(b.z, WALL_Z) } };
}

// The release uses the gesture it is handed rather than anything cached from
// a previous frame, so the shot is exactly the drag the player just made.
const input = createInput(canvas, {
  onRelease({ dx, dy }) {
    if (screen === 'menu') { startLevel(level); return; }
    if (screen === 'failed') { startLevel(level); return; }
    if (screen === 'done') { startLevel(1); return; }
    if (screen === 'cleared') {
      const next = level + 1;
      if (next > TOTAL_LEVELS) { screen = 'done'; return; }
      startLevel(next);
      return;
    }
    if (screen !== 'play' || run.phase !== 'aiming') return;
    const aim = aimFromDrag(dx, dy, canvas.clientHeight);
    if (!aim) return; // too short a drag: a cancel, not a dud shot
    run = fire(run, aim);
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

  const before = run.phase;
  run = tick(run, dt);

  // A fresh kill always replaces the last splat. lastHit is cleared on every
  // fire, so a miss cannot resurrect the previous hit's blood.
  if (run.lastHit && before === 'flying') {
    pop = { ...run.lastHit, life: 1 };
  }
  if (screen !== 'play') return;

  if (run.phase === 'cleared') {
    save = recordClear(save, level, run.score);
    writeSave(save);
    screen = 'cleared';
  } else if (run.phase === 'failed') {
    screen = 'failed';
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
    return [
      `Level ${level} cleared`,
      `Score ${run.score}  ·  Best ${best}`,
      level >= TOTAL_LEVELS ? 'Tap to finish' : 'Tap for the next level',
    ];
  }
  if (screen === 'failed') {
    return ['Out of rocks', `${aliveCount(run)} still standing`, 'Tap to try again'];
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
    const d = input.getDrag();
    const aiming = screen === 'play' && run.phase === 'aiming';
    const aim = aiming && d
      ? aimFromDrag(d.x - d.startX, d.y - d.startY, canvas.clientHeight)
      : null;

    drawScene(ctx, {
      creatures: run.creatures,
      rock: run.rock,
      ghost: ghostArc(aim),
      drag: aiming && d ? { x: d.x * dpr, y: d.y * dpr } : null,
      loaded: aiming,
      power: aim?.power ?? 0,
      pop,
      hud: {
        level,
        rocks: run.rocksLeft,
        score: run.score,
        left: aliveCount(run),
      },
      overlay: overlayLines(),
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
