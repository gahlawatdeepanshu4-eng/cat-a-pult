import { project, depthScale } from './project.js';
import { HOLES } from './arena.js';
import {
  WALL_Z, ARENA_HALF_WIDTH, CAT_RADIUS, EYE_Y, VIRTUAL_HEIGHT,
} from './constants.js';

function emoji(ctx, glyph, x, y, px) {
  if (px < 2) return;
  ctx.font = `${px}px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y);
}

// The sand runs from the bottom of the screen to where the ground meets the
// wall. Drawn as a gradient rather than tiles: at this depth the paving in the
// original reads as a wash of colour anyway.
function drawGround(ctx, view) {
  const atWall = project({ x: 0, y: 0, z: WALL_Z }, view).y;
  const g = ctx.createLinearGradient(0, atWall, 0, view.height);
  g.addColorStop(0, '#c9a267');
  g.addColorStop(1, '#e8cf9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, atWall, view.width, view.height - atWall);
}

function drawSky(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height * 0.6);
  g.addColorStop(0, '#6b4d2e');
  g.addColorStop(1, '#a67c45');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

function wallRect(view) {
  const left = project({ x: -ARENA_HALF_WIDTH, y: 0, z: WALL_Z }, view);
  const right = project({ x: ARENA_HALF_WIDTH, y: 0, z: WALL_Z }, view);
  const top = project({ x: 0, y: 900, z: WALL_Z }, view);
  return { x: left.x, y: top.y, w: right.x - left.x, h: left.y - top.y };
}

function drawWall(ctx, view) {
  const r = wallRect(view);
  ctx.fillStyle = '#9c9384';
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // Courses of stone. Cheap, but it reads as a block wall at a glance.
  const scale = depthScale(WALL_Z) * view.unit;
  const course = 46 * scale;
  ctx.strokeStyle = 'rgba(60, 54, 44, 0.35)';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  for (let y = r.y; y < r.y + r.h; y += course) {
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x + r.w, y);
    ctx.stroke();
  }
  let row = 0;
  for (let y = r.y; y < r.y + r.h; y += course) {
    const offset = (row++ % 2) * (course * 1.1);
    for (let x = r.x + offset; x < r.x + r.w; x += course * 2.2) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + course, r.y + r.h));
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(40, 36, 30, 0.5)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

export function drawHoles(ctx, view) {
  for (const h of HOLES) {
    const c = project({ x: h.x, y: h.y, z: WALL_Z }, view);
    const rx = h.rx * c.scale * view.unit;
    const ry = h.ry * c.scale * view.unit;

    ctx.fillStyle = '#120d08';
    ctx.beginPath();
    if (h.row === 'upper') {
      ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    } else {
      // Arch: semicircle on top, straight sides down to the sand.
      ctx.moveTo(c.x - rx, c.y + ry);
      ctx.lineTo(c.x - rx, c.y - ry * 0.15);
      ctx.arc(c.x, c.y - ry * 0.15, rx, Math.PI, 0);
      ctx.lineTo(c.x + rx, c.y + ry);
      ctx.closePath();
    }
    ctx.fill();

    ctx.strokeStyle = '#b9ae99';
    ctx.lineWidth = Math.max(1, 3 * c.scale * view.unit);
    ctx.stroke();
  }
}

function drawStrays(ctx, strays, view) {
  // Painter's algorithm: furthest first, so nearer cats overlap them.
  for (const s of [...strays].sort((a, b) => b.z - a.z)) {
    const p = project({ x: s.x, y: 0, z: s.z }, view);
    const size = CAT_RADIUS * 2.4 * p.scale * view.unit;
    emoji(ctx, '🐈', p.x, p.y - size * 0.4, size);
  }
}

function drawCat(ctx, cat, view) {
  const p = project(cat, view);
  emoji(ctx, '🐱', p.x, p.y, CAT_RADIUS * 2 * p.scale * view.unit);
}

// The slingshot sits in the foreground, fixed. Drawn in screen space rather
// than projected: it never moves, and it frames the shot.
function drawSling(ctx, view, loaded, pull) {
  const cx = view.width / 2;
  const base = view.height * 1.02;
  const span = view.height * 0.16;
  const armTop = view.height * 0.74 + pull * view.height * 0.05;

  ctx.strokeStyle = '#b07d4a';
  ctx.lineCap = 'round';
  ctx.lineWidth = view.height * 0.035;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.lineTo(cx + dir * span, armTop);
    ctx.stroke();
  }

  ctx.strokeStyle = '#3a2b1c';
  ctx.lineWidth = view.height * 0.014;
  const pouchY = armTop + view.height * (0.03 + pull * 0.06);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * span, armTop);
    ctx.lineTo(cx, pouchY);
    ctx.stroke();
  }

  if (loaded) emoji(ctx, '🐱', cx, pouchY - view.height * 0.02, view.height * 0.1);
}

function drawCrosshair(ctx, aimPx, view) {
  if (!aimPx) return;
  const r = view.height * 0.045;
  ctx.strokeStyle = '#d92b2b';
  ctx.lineWidth = Math.max(2, view.height * 0.006);
  ctx.beginPath();
  ctx.arc(aimPx.x, aimPx.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(aimPx.x, aimPx.y, r * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.moveTo(aimPx.x + dx * r * 0.45, aimPx.y + dy * r * 0.45);
    ctx.lineTo(aimPx.x + dx * r * 1.45, aimPx.y + dy * r * 1.45);
  }
  ctx.stroke();
}

// Vertical meter on the left, filling green to red, as in the original.
export function drawPower(ctx, power, view) {
  const w = view.width * 0.022;
  const h = view.height * 0.42;
  const x = view.width * 0.035;
  const y = view.height * 0.34;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x, y, w, h);

  const segments = 10;
  const gap = h * 0.012;
  const segH = (h - gap * (segments - 1)) / segments;
  for (let i = 0; i < segments; i++) {
    const lit = power > i / segments;
    if (!lit) continue;
    const frac = i / (segments - 1);
    ctx.fillStyle = frac < 0.5 ? '#4caf50' : frac < 0.8 ? '#ff9800' : '#e53935';
    ctx.fillRect(x, y + h - (i + 1) * segH - i * gap, w, segH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#f2e8cf';
  ctx.font = `600 ${view.height * 0.026}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Power', x, y + h + view.height * 0.012);
}

function drawHud(ctx, hud, view) {
  const pad = view.height * 0.035;
  const size = view.height * 0.05;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8443a';
  ctx.fillText(`🐱 x ${hud.catsLeft}`, view.width - pad, pad);

  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${hud.score}`, view.width / 2, view.height - pad - size);

  if (hud.best > 0) {
    ctx.textAlign = 'left';
    ctx.font = `600 ${size * 0.7}px system-ui, sans-serif`;
    ctx.fillStyle = '#f2e8cf';
    ctx.fillText(`Best ${hud.best}`, pad, pad);
  }
}

export function drawOverlay(ctx, lines, view) {
  if (!lines) return;
  ctx.fillStyle = 'rgba(30, 20, 10, 0.82)';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const base = view.height / 2 - (lines.length - 1) * view.height * 0.05;
  lines.forEach((line, i) => {
    const px = view.height * (i === 0 ? 0.085 : 0.045);
    ctx.font = `${i === 0 ? '700' : '400'} ${px}px system-ui, sans-serif`;
    ctx.fillStyle = i === 0 ? '#ffb703' : '#f2e8cf';
    ctx.fillText(line, view.width / 2, base + i * view.height * 0.1);
  });
}

export function drawScene(ctx, scene, view) {
  drawSky(ctx, view);
  drawWall(ctx, view);
  drawGround(ctx, view);
  drawHoles(ctx, view);
  drawStrays(ctx, scene.strays, view);
  if (scene.cat) drawCat(ctx, scene.cat, view);
  drawSling(ctx, view, scene.slingLoaded, scene.pull);
  drawCrosshair(ctx, scene.aimPx, view);
  drawPower(ctx, scene.power, view);
  drawHud(ctx, scene.hud, view);
  drawOverlay(ctx, scene.overlay, view);
}
