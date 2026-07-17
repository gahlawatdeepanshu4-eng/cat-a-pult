import { VIRTUAL_HEIGHT, CAT_RADIUS, TARGET_RADIUS, CATAPULT_X, GROUND_Y } from './constants.js';

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

function emoji(ctx, glyph, x, y, px) {
  ctx.font = `${px}px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y);
}

// Parallax: distant hills scroll slower than the world, selling depth as the
// camera chases the cat. Their bases are pinned to the ground line rather
// than given a fixed height, otherwise they float above it.
function drawParallax(ctx, camera, view) {
  const groundY = worldToScreen(0, GROUND_Y, camera, view).y;
  const bands = [
    { factor: 0.15, peakY: 520, colour: '#2c3e5d', width: 620 },
    { factor: 0.35, peakY: 380, colour: '#33506b', width: 430 },
  ];
  for (const b of bands) {
    const top = worldToScreen(0, b.peakY, camera, view).y;
    const w = b.width * view.scale;
    const shift = -camera.x * b.factor * view.scale;
    ctx.fillStyle = b.colour;
    for (let i = -2; i < view.width / w + 3; i++) {
      const x = ((shift % w) + w) % w + i * w;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + w / 2, top);
      ctx.lineTo(x + w, groundY);
      ctx.closePath();
      ctx.fill();
    }
  }
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

export function drawZone(ctx, zone, camera, view) {
  const a = worldToScreen(zone.x, GROUND_Y, camera, view);
  const b = worldToScreen(zone.x + zone.width, GROUND_Y, camera, view);
  ctx.fillStyle = 'rgba(252, 191, 73, 0.35)';
  ctx.fillRect(a.x, a.y - 10 * view.scale, b.x - a.x, 10 * view.scale);
  ctx.fillStyle = '#fcbf49';
  for (const p of [a, b]) {
    ctx.fillRect(p.x - 2 * view.scale, p.y - 70 * view.scale, 4 * view.scale, 70 * view.scale);
  }
  const centre = worldToScreen(zone.x + zone.width / 2, GROUND_Y, camera, view);
  emoji(ctx, '🎯', centre.x, centre.y - 90 * view.scale, 34 * view.scale);
}

export function drawTarget(ctx, target, camera, view) {
  const p = worldToScreen(target.x, target.y, camera, view);
  emoji(ctx, '🐭', p.x, p.y, TARGET_RADIUS * 2 * view.scale);
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
  emoji(ctx, '🐱', p.x, p.y, CAT_RADIUS * 2 * view.scale);
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

// Short dotted arc: enough to read direction and power, too short to solve
// the shot for the player.
function drawTrajectoryHint(ctx, hint, camera, view) {
  if (!hint) return;
  ctx.fillStyle = 'rgba(242, 232, 207, 0.7)';
  hint.forEach((pt, i) => {
    const p = worldToScreen(pt.x, pt.y, camera, view);
    const r = Math.max(1.5, (4 - i * 0.25) * view.scale);
    ctx.globalAlpha = 1 - i / hint.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

export function drawHud(ctx, hud, view) {
  if (!hud) return;
  const pad = 16 * view.scale;
  const size = 20 * view.scale;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = '#f2e8cf';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${hud.levelName}`, pad, pad);
  ctx.font = `${size * 0.8}px system-ui, sans-serif`;
  ctx.fillText(`Shots ${hud.shotsLeft}`, pad, pad + size * 1.3);
  ctx.textAlign = 'right';
  ctx.fillText(`Best ${hud.best}`, view.width - pad, pad);
}

export function drawOverlay(ctx, lines, view) {
  if (!lines) return;
  ctx.fillStyle = 'rgba(27, 42, 65, 0.85)';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const base = view.height / 2 - (lines.length - 1) * 22 * view.scale;
  lines.forEach((line, i) => {
    const px = (i === 0 ? 34 : 20) * view.scale;
    ctx.font = `${i === 0 ? '700' : '400'} ${px}px system-ui, sans-serif`;
    ctx.fillStyle = i === 0 ? '#fcbf49' : '#f2e8cf';
    ctx.fillText(line, view.width / 2, base + i * 44 * view.scale);
  });
}

export function drawScene(ctx, scene, view) {
  ctx.fillStyle = '#1b2a41';
  ctx.fillRect(0, 0, view.width, view.height);
  drawParallax(ctx, scene.camera, view);
  drawGround(ctx, scene.camera, view);
  if (scene.zone) drawZone(ctx, scene.zone, scene.camera, view);
  drawCatapult(ctx, scene.camera, view);
  if (scene.target) drawTarget(ctx, scene.target, scene.camera, view);
  if (scene.cat) drawCat(ctx, scene.cat, scene.camera, view);
  drawTrajectoryHint(ctx, scene.hint, scene.camera, view);
  drawDrag(ctx, scene.drag, view);
  drawHud(ctx, scene.hud, view);
  drawOverlay(ctx, scene.overlay, view);
}
