import { project } from './project.js';
import { radiusOf, KIND } from './creatures.js';
import { WALL_Z, ARENA_HALF_WIDTH, ROCK_RADIUS } from './constants.js';

// Decoration only. The holes score nothing now; they are what the arena wall
// looks like.
const HOLES = [
  { row: 'upper', x: -430, y: 470, rx: 60, ry: 56 },
  { row: 'upper', x: 0, y: 470, rx: 60, ry: 56 },
  { row: 'upper', x: 430, y: 470, rx: 60, ry: 56 },
  { row: 'lower', x: -600, y: 150, rx: 70, ry: 115 },
  { row: 'lower', x: -200, y: 150, rx: 70, ry: 115 },
  { row: 'lower', x: 200, y: 150, rx: 70, ry: 115 },
  { row: 'lower', x: 600, y: 150, rx: 70, ry: 115 },
];

function emoji(ctx, glyph, x, y, px) {
  if (px < 3) return;
  ctx.font = `${px}px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y);
}

function drawSky(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#6d4f2f');
  g.addColorStop(1, '#b98d54');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawWall(ctx, view) {
  const left = project({ x: -ARENA_HALF_WIDTH, y: 0, z: WALL_Z }, view);
  const right = project({ x: ARENA_HALF_WIDTH, y: 0, z: WALL_Z }, view);
  const top = project({ x: 0, y: 950, z: WALL_Z }, view);
  const r = { x: left.x, y: top.y, w: right.x - left.x, h: left.y - top.y };
  const s = left.scale * view.unit;

  ctx.fillStyle = '#9a9184';
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const course = 48 * s;
  ctx.strokeStyle = 'rgba(60,54,44,0.32)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  let row = 0;
  for (let y = r.y; y < r.y + r.h; y += course) {
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x + r.w, y);
    ctx.stroke();
    const offset = (row++ % 2) * course * 1.1;
    for (let x = r.x + offset; x < r.x + r.w; x += course * 2.2) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + course, r.y + r.h));
      ctx.stroke();
    }
  }

  for (const h of HOLES) {
    const c = project({ x: h.x, y: h.y, z: WALL_Z }, view);
    const rx = h.rx * c.scale * view.unit;
    const ry = h.ry * c.scale * view.unit;
    ctx.fillStyle = '#150f09';
    ctx.beginPath();
    if (h.row === 'upper') {
      ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(c.x - rx, c.y + ry);
      ctx.lineTo(c.x - rx, c.y - ry * 0.15);
      ctx.arc(c.x, c.y - ry * 0.15, rx, Math.PI, 0);
      ctx.lineTo(c.x + rx, c.y + ry);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = '#b8ad98';
    ctx.lineWidth = Math.max(1, 3 * c.scale * view.unit);
    ctx.stroke();
  }
}

function drawGround(ctx, view) {
  const atWall = project({ x: 0, y: 0, z: WALL_Z }, view).y;
  const g = ctx.createLinearGradient(0, atWall, 0, view.height);
  g.addColorStop(0, '#c39d63');
  g.addColorStop(1, '#eed6a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, atWall, view.width, view.height - atWall);
}

function drawCreatures(ctx, creatures, view) {
  // Painter's algorithm: furthest first, so nearer things overlap them.
  const living = creatures.filter((c) => c.alive).sort((a, b) => b.z - a.z);
  for (const c of living) {
    const p = project(c, view);
    const size = radiusOf(c) * 2.2 * p.scale * view.unit;

    // A shadow on the sand sells how high a jumper or flyer actually is, and
    // gives the player a depth cue for aiming.
    const g = project({ x: c.x, y: 0, z: c.z }, view);
    const lift = Math.min(1, c.y / 400);
    ctx.fillStyle = `rgba(90, 60, 30, ${0.32 * (1 - lift * 0.7)})`;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, size * 0.34 * (1 - lift * 0.3), size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    emoji(ctx, KIND[c.kind].glyph, p.x, p.y - size * 0.4, size);
  }
}

function drawRock(ctx, rock, view) {
  const p = project(rock, view);
  const r = Math.max(2, ROCK_RADIUS * p.scale * view.unit);
  ctx.fillStyle = '#5b5348';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f2a22';
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.stroke();
}

// Ghost arc: where the rock would go for the drag being made right now.
function drawGhost(ctx, points, view) {
  if (!points?.length) return;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  points.forEach((pt, i) => {
    const p = project(pt, view);
    ctx.globalAlpha = 0.75 * (1 - i / points.length);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5, 5 * p.scale * view.unit), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// The band the player is pulling: a straight line from the sling to the
// finger, so the gesture reads as a slingshot rather than a mystery.
function drawSling(ctx, view, drag, loaded) {
  const cx = view.width / 2;
  const base = view.height * 1.04;
  const span = view.height * 0.15;
  const armTop = view.height * 0.76;
  const pouch = drag ? { x: drag.x, y: drag.y } : { x: cx, y: armTop + view.height * 0.04 };

  ctx.strokeStyle = '#3a2b1c';
  ctx.lineWidth = view.height * 0.012;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * span, armTop);
    ctx.lineTo(pouch.x, pouch.y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#b07d4a';
  ctx.lineWidth = view.height * 0.034;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.lineTo(cx + dir * span, armTop);
    ctx.stroke();
  }

  if (loaded) {
    ctx.fillStyle = '#5b5348';
    ctx.beginPath();
    ctx.arc(pouch.x, pouch.y, view.height * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f2a22';
    ctx.lineWidth = view.height * 0.006;
    ctx.stroke();
  }
}

export function drawPower(ctx, power, view) {
  const w = view.width * 0.02;
  const h = view.height * 0.4;
  const x = view.width * 0.035;
  const y = view.height * 0.32;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, w, h);

  const segs = 10;
  const gap = h * 0.012;
  const segH = (h - gap * (segs - 1)) / segs;
  for (let i = 0; i < segs; i++) {
    if (power <= i / segs) continue;
    const f = i / (segs - 1);
    ctx.fillStyle = f < 0.5 ? '#4caf50' : f < 0.8 ? '#ff9800' : '#e53935';
    ctx.fillRect(x, y + h - (i + 1) * segH - i * gap, w, segH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#f2e8cf';
  ctx.font = `600 ${view.height * 0.024}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Power', x, y + h + view.height * 0.01);
}

function drawHud(ctx, hud, view) {
  const pad = view.height * 0.035;
  const size = view.height * 0.046;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f2e8cf';
  ctx.fillText(`Level ${hud.level}`, pad, pad);
  ctx.font = `600 ${size * 0.72}px system-ui, sans-serif`;
  ctx.fillText(`${hud.left} left`, pad, pad + size * 1.2);

  ctx.textAlign = 'right';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = '#e8443a';
  ctx.fillText(`🪨 x ${hud.rocks}`, view.width - pad, pad);

  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${hud.score}`, view.width / 2, view.height - pad - size);
}

function drawFloatingPoints(ctx, pop, view) {
  if (!pop) return;
  const p = project(pop, view);
  ctx.globalAlpha = Math.max(0, pop.life);
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${view.height * 0.05}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`+${pop.points}`, p.x, p.y - (1 - pop.life) * view.height * 0.1);
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, lines, view) {
  if (!lines) return;
  ctx.fillStyle = 'rgba(30,20,10,0.84)';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const base = view.height / 2 - (lines.length - 1) * view.height * 0.055;
  lines.forEach((line, i) => {
    const px = view.height * (i === 0 ? 0.08 : 0.042);
    ctx.font = `${i === 0 ? '700' : '400'} ${px}px system-ui, sans-serif`;
    ctx.fillStyle = i === 0 ? '#ffb703' : '#f2e8cf';
    ctx.fillText(line, view.width / 2, base + i * view.height * 0.095);
  });
}

export function drawScene(ctx, scene, view) {
  drawSky(ctx, view);
  drawWall(ctx, view);
  drawGround(ctx, view);
  drawCreatures(ctx, scene.creatures, view);
  if (scene.rock) drawRock(ctx, scene.rock, view);
  drawGhost(ctx, scene.ghost, view);
  drawSling(ctx, view, scene.drag, scene.loaded);
  drawPower(ctx, scene.power, view);
  drawFloatingPoints(ctx, scene.pop, view);
  drawHud(ctx, scene.hud, view);
  drawOverlay(ctx, scene.overlay, view);
}
