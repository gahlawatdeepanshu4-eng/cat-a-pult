import { VIRTUAL_HEIGHT, CAT_RADIUS, CATAPULT_X, GROUND_Y } from './constants.js';

export function makeView(canvas) {
  return {
    width: canvas.width,
    height: canvas.height,
    scale: canvas.height / VIRTUAL_HEIGHT,
  };
}

// The single place world (y-up, ground at 0) becomes canvas (y-down).
export function worldToScreen(wx, wy, camera, view) {
  return {
    x: (wx - camera.x) * view.scale + view.width / 2,
    y: view.height / 2 - (wy - camera.y) * view.scale,
  };
}

function drawGround(ctx, camera, view) {
  const groundY = worldToScreen(0, GROUND_Y, camera, view).y;
  ctx.fillStyle = '#3a5a40';
  ctx.fillRect(0, groundY, view.width, view.height - groundY);
  ctx.strokeStyle = '#588157';
  ctx.lineWidth = Math.max(2, 4 * view.scale);
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(view.width, groundY);
  ctx.stroke();
}

function drawCatapult(ctx, camera, view) {
  const base = worldToScreen(CATAPULT_X, GROUND_Y, camera, view);
  const top = worldToScreen(CATAPULT_X, 90, camera, view);
  ctx.strokeStyle = '#8b5e34';
  ctx.lineWidth = Math.max(3, 10 * view.scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
}

function drawCat(ctx, cat, camera, view) {
  const p = worldToScreen(cat.x, cat.y, camera, view);
  const size = CAT_RADIUS * 2 * view.scale;
  ctx.font = `${size}px system-ui, "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐱', p.x, p.y);
}

function drawDrag(ctx, drag, view) {
  if (!drag) return;
  ctx.strokeStyle = 'rgba(242, 232, 207, 0.6)';
  ctx.lineWidth = Math.max(2, 3 * view.scale);
  ctx.setLineDash([8 * view.scale, 8 * view.scale]);
  ctx.beginPath();
  ctx.moveTo(drag.startX, drag.startY);
  ctx.lineTo(drag.currentX, drag.currentY);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawScene(ctx, scene, view) {
  ctx.fillStyle = '#1b2a41';
  ctx.fillRect(0, 0, view.width, view.height);
  drawGround(ctx, scene.camera, view);
  drawCatapult(ctx, scene.camera, view);
  if (scene.cat) drawCat(ctx, scene.cat, scene.camera, view);
  drawDrag(ctx, scene.drag, view);
}
