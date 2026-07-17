import { clampDt, chargeToPower } from './ballistics.js';
import { makeView } from './project.js';
import { drawScene } from './render.js';
import { createInput, pointerToAim } from './input.js';
import { createGame, aimFrom, beginCharge, tickCharge, release, tick } from './game.js';
import { loadSave, writeSave, recordRun } from './storage.js';
import { STARTING_CATS } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let save = loadSave();
let game = createGame();
let screen = 'menu'; // 'menu' | 'play' | 'over'

function currentAim() {
  const p = input.getPointer();
  const { nx, ny } = pointerToAim(p, canvas.clientWidth, canvas.clientHeight);
  return aimFrom(nx, ny);
}

function startRun() {
  game = createGame();
  screen = 'play';
}

const input = createInput(canvas, {
  onPress() {
    if (screen === 'play' && game.phase === 'aiming') game = beginCharge(game);
  },
  onRelease() {
    if (screen === 'menu') { startRun(); return; }
    if (screen === 'over') { startRun(); return; }
    if (game.phase === 'charging') game = release(game, currentAim());
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
  if (screen !== 'play') {
    game = tick(game, dt); // strays keep milling about behind the menu
    return;
  }
  if (game.phase === 'charging') game = tickCharge(game, dt);
  game = tick(game, dt);
  if (game.phase === 'over') {
    save = recordRun(save, game.score, STARTING_CATS);
    writeSave(save);
    screen = 'over';
  }
}

function overlayLines() {
  if (screen === 'menu') {
    return [
      'Cat-a-pult',
      'Aim with your finger. Hold to charge, let go to fling.',
      'Put the cat through a hole. Tap to start.',
    ];
  }
  if (screen === 'over') {
    const beat = game.score >= save.bestScore && game.score > 0;
    return [
      'Out of cats',
      `Score ${game.score}${beat ? '  ·  new best!' : `  ·  best ${save.bestScore}`}`,
      'Tap to play again',
    ];
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
    const p = input.getPointer();
    const power = game.phase === 'charging' ? chargeToPower(game.charge) : 0;

    drawScene(ctx, {
      strays: game.strays,
      cat: game.cat,
      slingLoaded: screen === 'play' && game.phase !== 'flying',
      pull: power,
      aimPx: screen === 'play' && p ? { x: p.x * dpr, y: p.y * dpr } : null,
      power,
      hud: { catsLeft: game.catsLeft, score: game.score, best: save.bestScore },
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
