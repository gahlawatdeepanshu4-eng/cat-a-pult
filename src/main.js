import { clampDt, launchVelocity, stepProjectile } from './physics.js';
import { createCamera, followCat } from './camera.js';
import { makeView, drawScene } from './render.js';
import { createInput, shotFromDrag, maxDragPx } from './input.js';
import { createRun, launch, tick, resolveShot, nextShot } from './level.js';
import { LEVELS, getLevel } from './levels.js';
import { loadSave, writeSave, recordClear, recordShot } from './storage.js';
import { CATAPULT_X, GROUND_Y } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let save = loadSave();
let screen = 'menu'; // 'menu' | 'play' | 'cleared' | 'failed'
let run = null;
let camera = createCamera();
let pendingLevel = save.unlockedLevel;

function startLevel(id) {
  const def = getLevel(id);
  if (!def) return;
  run = createRun(def);
  camera = createCamera();
  screen = 'play';
}

// Eight sampled points of the real trajectory, then it stops. The player gets
// direction and power, not the answer.
function trajectoryHint(angle, power) {
  const v = launchVelocity(angle, power);
  let body = { x: CATAPULT_X, y: 90, vx: v.vx, vy: v.vy };
  const pts = [];
  for (let i = 0; i < 8; i++) {
    body = stepProjectile(body, 1 / 20);
    if (body.y <= GROUND_Y) break;
    pts.push({ x: body.x, y: body.y });
  }
  return pts;
}

function currentShot() {
  const drag = input.getDrag();
  if (!drag) return null;
  return shotFromDrag(
    drag.currentX - drag.startX,
    drag.currentY - drag.startY,
    maxDragPx(canvas),
  );
}

// Every non-play screen is dismissed the same way. Returns true if it
// handled the gesture, so both taps and drags get the player past an
// overlay rather than only one of them working.
function advanceScreen() {
  if (screen === 'menu') {
    startLevel(pendingLevel);
    return true;
  }
  if (screen === 'cleared') {
    const next = run.def.id + 1;
    if (getLevel(next)) {
      pendingLevel = next;
      startLevel(next);
    } else {
      screen = 'menu';
    }
    return true;
  }
  if (screen === 'failed') {
    startLevel(run.def.id);
    return true;
  }
  return false;
}

const input = createInput(canvas, {
  onTap() {
    advanceScreen();
  },
  onLaunch(shot) {
    if (advanceScreen()) return;
    if (screen !== 'play' || !run || run.phase !== 'aiming') return;
    run = launch(run, shot);
    save = recordShot(save);
    writeSave(save);
  },
});

// Assigning to canvas.width clears the canvas and resets context state, so
// only do it when the size actually changed.
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
  if (screen !== 'play' || !run) return;

  if (run.phase === 'flying') {
    run = tick(run, dt);
    camera = followCat(camera, run.cat);
  }

  if (run.phase === 'landed') {
    run = resolveShot(run);
    if (run.phase === 'cleared') {
      save = recordClear(save, run.def.id, run.score, LEVELS.length);
      writeSave(save);
      screen = 'cleared';
    } else if (run.phase === 'failed') {
      screen = 'failed';
    } else {
      run = nextShot(run);
      camera = createCamera();
    }
  }
}

function overlayLines() {
  if (screen === 'menu') {
    return [
      'Cat-a-pult',
      'Drag back and let go to launch. Land the cat on the target.',
      `Tap to start level ${pendingLevel}`,
    ];
  }
  if (screen === 'cleared') {
    const next = getLevel(run.def.id + 1);
    return [
      'Landed it',
      `Score ${run.score}  ·  Best ${save.bestScores[String(run.def.id)] ?? run.score}`,
      next ? 'Tap for the next level' : 'That was the last level. Tap to go back.',
    ];
  }
  if (screen === 'failed') {
    return ['Out of cats', 'Tap to try the level again'];
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
    const rawDrag = input.getDrag();
    const drag = rawDrag && {
      startX: rawDrag.startX * dpr,
      startY: rawDrag.startY * dpr,
      currentX: rawDrag.currentX * dpr,
      currentY: rawDrag.currentY * dpr,
    };
    const aiming = screen === 'play' && run?.phase === 'aiming';
    const shot = aiming ? currentShot() : null;

    drawScene(ctx, {
      camera,
      cat: run?.cat ?? null,
      target: run?.target ?? null,
      zone: run?.def.zone ?? null,
      drag: aiming ? drag : null,
      hint: shot ? trajectoryHint(shot.angle, shot.power) : null,
      hud: screen === 'play' && run ? {
        levelName: `${run.def.id}. ${run.def.name}`,
        shotsLeft: run.shotsLeft,
        best: save.bestScores[String(run.def.id)] ?? 0,
      } : null,
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
