import { stepProjectile, launchVelocity, clampDt } from './physics.js';
import { createCamera, followCat } from './camera.js';
import { makeView, drawScene } from './render.js';
import { createInput } from './input.js';
import { CATAPULT_X, GROUND_Y } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let camera = createCamera();
let cat = null;

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

const input = createInput(canvas, {
  onLaunch({ angle, power }) {
    if (cat) return; // one cat at a time
    const v = launchVelocity(angle, power);
    cat = { x: CATAPULT_X, y: 90, vx: v.vx, vy: v.vy };
  },
});

function update(dt) {
  if (cat) {
    cat = stepProjectile(cat, dt);
    if (cat.y <= GROUND_Y) {
      cat = null;
      camera = createCamera();
      return;
    }
    camera = followCat(camera, cat);
  }
}

let last = performance.now();
function frame(now) {
  const dt = clampDt((now - last) / 1000);
  last = now;
  try {
    resize();
    update(dt);
    const view = makeView(canvas);
    const dragPx = input.getDrag();
    const dpr = canvas.width / canvas.clientWidth || 1;
    const drag = dragPx && {
      startX: dragPx.startX * dpr,
      startY: dragPx.startY * dpr,
      currentX: dragPx.currentX * dpr,
      currentY: dragPx.currentY * dpr,
    };
    drawScene(ctx, { camera, cat, drag }, view);
  } catch (err) {
    console.error('frame failed', err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
