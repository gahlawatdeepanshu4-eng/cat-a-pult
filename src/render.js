import { project } from './project.js';
import { radiusOf, centreOf, KIND } from './creatures.js';
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

// Vector creatures, drawn solid with a heavy outline so they read as physical
// objects. The emoji versions looked like flat translucent stickers, which is
// what "glassy" meant. s is the body radius in screen pixels; (x, y) is the
// body centre. face = +1 looking right, -1 looking left.
function outlined(ctx, s, fill, draw) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.strokeStyle = 'rgba(30, 22, 12, 0.95)';
  ctx.fillStyle = fill;
  draw();
  ctx.stroke();
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function drawVectorCat(ctx, x, y, s, face) {
  const f = face;
  // Tail
  outlined(ctx, s, '#e8973a', () => {
    ctx.beginPath();
    ctx.moveTo(x - f * s * 0.75, y + s * 0.2);
    ctx.quadraticCurveTo(x - f * s * 1.5, y - s * 0.1, x - f * s * 1.2, y - s * 0.8);
  });
  // Body
  outlined(ctx, s, '#f2a24c', () => ellipse(ctx, x, y + s * 0.25, s * 0.95, s * 0.72));
  // Head
  outlined(ctx, s, '#f4ac5c', () => ellipse(ctx, x + f * s * 0.35, y - s * 0.45, s * 0.62, s * 0.56));
  // Ears
  outlined(ctx, s, '#f2a24c', () => {
    for (const dx of [-0.3, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x + f * s * (dx), y - s * 0.85);
      ctx.lineTo(x + f * s * (dx + 0.14), y - s * 1.25);
      ctx.lineTo(x + f * s * (dx + 0.32), y - s * 0.9);
      ctx.closePath();
    }
  });
  // Stripes
  ctx.strokeStyle = 'rgba(180, 110, 30, 0.8)';
  ctx.lineWidth = Math.max(1, s * 0.09);
  for (const dx of [-0.2, 0.15, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + f * s * dx, y - s * 0.15);
    ctx.lineTo(x + f * s * dx, y + s * 0.55);
    ctx.stroke();
  }
  // Eyes
  ctx.fillStyle = '#1e160c';
  for (const dx of [0.12, 0.6]) {
    ellipse(ctx, x + f * s * dx, y - s * 0.5, s * 0.09, s * 0.12);
    ctx.fill();
  }
  // Nose
  ctx.fillStyle = '#c94f3a';
  ellipse(ctx, x + f * s * 0.36, y - s * 0.32, s * 0.08, s * 0.06);
  ctx.fill();
}

function eyeDot(ctx, x, y, r) {
  ctx.fillStyle = '#1e160c';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The shared reptile body — tail, hind legs, torso. Every "-rex" sits on this,
// so the six of them read as one family and only the head and colours change.
function dinoBody(ctx, x, y, s, f, pal) {
  outlined(ctx, s, pal.limb, () => {
    ctx.beginPath();
    ctx.moveTo(x - f * s * 0.5, y + s * 0.1);
    ctx.quadraticCurveTo(x - f * s * 1.6, y - s * 0.1, x - f * s * 1.7, y + s * 0.35);
    ctx.quadraticCurveTo(x - f * s * 1.2, y + s * 0.4, x - f * s * 0.5, y + s * 0.5);
    ctx.closePath();
  });
  outlined(ctx, s, pal.limb, () => {
    ctx.beginPath();
    for (const dx of [-0.05, 0.4]) {
      if (ctx.roundRect) ctx.roundRect(x + f * s * dx, y + s * 0.5, s * 0.3, s * 0.6, s * 0.12);
      else ctx.rect(x + f * s * dx, y + s * 0.5, s * 0.3, s * 0.6);
    }
  });
  outlined(ctx, s, pal.body, () => ellipse(ctx, x, y + s * 0.15, s * 0.98, s * 0.8));
}

// Heads. Each draws itself at a neck point up and forward of the body centre.
function trexHead(ctx, x, y, s, f, pal) {
  outlined(ctx, s, pal.head, () => {
    ctx.beginPath();
    ctx.moveTo(x + f * s * 0.2, y - s * 0.9);
    ctx.quadraticCurveTo(x + f * s * 1.5, y - s * 0.85, x + f * s * 1.5, y - s * 0.3);
    ctx.quadraticCurveTo(x + f * s * 1.4, y - s * 0.05, x + f * s * 0.4, y - s * 0.15);
    ctx.quadraticCurveTo(x - f * s * 0.1, y - s * 0.5, x + f * s * 0.2, y - s * 0.9);
    ctx.closePath();
  });
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const tx = x + f * s * (0.6 + i * 0.22);
    ctx.moveTo(tx, y - s * 0.18);
    ctx.lineTo(tx + f * s * 0.08, y - s * 0.02);
    ctx.lineTo(tx + f * s * 0.16, y - s * 0.18);
    ctx.closePath();
    ctx.fill();
  }
  eyeDot(ctx, x + f * s * 0.75, y - s * 0.55, s * 0.1);
}

function catrexHead(ctx, x, y, s, f, pal) {
  const hx = x + f * s * 0.5, hy = y - s * 0.6, r = s * 0.5;
  for (const dx of [-0.55, 0.55]) {
    outlined(ctx, s, pal.head, () => {
      ctx.beginPath();
      ctx.moveTo(hx + dx * r, hy - r * 0.4);
      ctx.lineTo(hx + dx * r * 1.25, hy - r * 1.25);
      ctx.lineTo(hx + dx * r * 0.15, hy - r * 0.7);
      ctx.closePath();
    });
  }
  outlined(ctx, s, pal.head, () => ellipse(ctx, hx, hy, r, r * 0.92));
  eyeDot(ctx, hx - f * r * 0.32, hy - r * 0.05, s * 0.08);
  eyeDot(ctx, hx + f * r * 0.32, hy - r * 0.05, s * 0.08);
  ctx.fillStyle = '#c94f3a';
  ellipse(ctx, hx + f * r * 0.02, hy + r * 0.3, s * 0.07, s * 0.05);
  ctx.fill();
}

function frogrexHead(ctx, x, y, s, f, pal) {
  const hx = x + f * s * 0.55, hy = y - s * 0.48, r = s * 0.5;
  outlined(ctx, s, pal.head, () => ellipse(ctx, hx, hy, r * 1.2, r * 0.8));
  for (const dx of [-0.55, 0.55]) {
    outlined(ctx, s, pal.head, () => ellipse(ctx, hx + dx * r, hy - r * 0.65, r * 0.4, r * 0.4));
    eyeDot(ctx, hx + dx * r, hy - r * 0.65, s * 0.09);
  }
  ctx.strokeStyle = '#1e160c';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.8, hy + r * 0.1);
  ctx.quadraticCurveTo(hx, hy + r * 0.55, hx + r * 0.8, hy + r * 0.1);
  ctx.stroke();
}

function bunnyrexHead(ctx, x, y, s, f, pal) {
  const hx = x + f * s * 0.55, hy = y - s * 0.55, r = s * 0.46;
  for (const dx of [-0.35, 0.35]) {
    outlined(ctx, s, pal.head, () => ellipse(ctx, hx + dx * r, hy - r * 1.3, r * 0.28, r * 0.9));
  }
  outlined(ctx, s, pal.head, () => ellipse(ctx, hx, hy, r, r));
  eyeDot(ctx, hx + f * r * 0.3, hy - r * 0.05, s * 0.08);
  ctx.fillStyle = '#c94f3a';
  ellipse(ctx, hx + f * r * 0.05, hy + r * 0.35, s * 0.06, s * 0.05);
  ctx.fill();
}

function pigrexHead(ctx, x, y, s, f, pal) {
  const hx = x + f * s * 0.5, hy = y - s * 0.6, r = s * 0.5;
  for (const dx of [-0.5, 0.5]) {
    outlined(ctx, s, pal.head, () => {
      ctx.beginPath();
      ctx.moveTo(hx + dx * r, hy - r * 0.55);
      ctx.lineTo(hx + dx * r * 1.35, hy - r * 1.1);
      ctx.lineTo(hx + dx * r * 0.1, hy - r * 0.75);
      ctx.closePath();
    });
  }
  outlined(ctx, s, pal.head, () => ellipse(ctx, hx, hy, r, r * 0.95));
  outlined(ctx, s, pal.limb, () => ellipse(ctx, hx + f * r * 0.6, hy + r * 0.15, r * 0.4, r * 0.32));
  ctx.fillStyle = '#7a4a2a';
  ellipse(ctx, hx + f * r * 0.5, hy + r * 0.15, s * 0.035, s * 0.06); ctx.fill();
  ellipse(ctx, hx + f * r * 0.75, hy + r * 0.15, s * 0.035, s * 0.06); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const dx of [0.32, 0.72]) {
    ctx.beginPath();
    const tx = hx + f * r * dx;
    ctx.moveTo(tx, hy + r * 0.34);
    ctx.lineTo(tx + f * s * 0.03, hy + r * 0.58);
    ctx.lineTo(tx + f * s * 0.1, hy + r * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  eyeDot(ctx, hx - f * r * 0.12, hy - r * 0.15, s * 0.08);
}

function ducktrexHead(ctx, x, y, s, f, pal) {
  const hx = x + f * s * 0.52, hy = y - s * 0.62, r = s * 0.5;
  outlined(ctx, s, pal.head, () => ellipse(ctx, hx, hy, r, r));
  outlined(ctx, s, '#e79a2a', () => ellipse(ctx, hx + f * r * 0.95, hy + r * 0.12, r * 0.7, r * 0.22));
  eyeDot(ctx, hx + f * r * 0.2, hy - r * 0.2, s * 0.09);
}

// Colours per kind (body / limbs / head) and which head to draw.
const PAL = {
  trex: { body: '#63a85a', limb: '#4f9048', head: '#6cb162' },
  catrex: { body: '#f0a24c', limb: '#e0902f', head: '#f4ac5c' },
  frogrex: { body: '#74c247', limb: '#5aa531', head: '#84d257' },
  bunnyrex: { body: '#c2bab0', limb: '#a69e94', head: '#d0c8be' },
  pigrex: { body: '#f2a6b4', limb: '#e087a0', head: '#f6b4c2' },
  ducktrex: { body: '#e8c84f', limb: '#d0af30', head: '#f0d65f' },
};
const HEAD = {
  trex: trexHead, catrex: catrexHead, frogrex: frogrexHead,
  bunnyrex: bunnyrexHead, pigrex: pigrexHead, ducktrex: ducktrexHead,
};

function drawCreatureBody(ctx, c, x, y, s) {
  const f = c.dir >= 0 ? 1 : -1;
  if (c.kind === 'cat') {
    drawVectorCat(ctx, x, y, s, f);
    return;
  }
  const pal = PAL[c.kind];
  dinoBody(ctx, x, y, s, f, pal);
  HEAD[c.kind](ctx, x, y, s, f, pal);
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
    const size = radiusOf(c) * 2.2 * project(c, view).scale * view.unit;

    // A shadow on the sand sells how high a jumper actually is, and gives the
    // player a depth cue for aiming.
    const g = project({ x: c.x, y: 0, z: c.z }, view);
    const lift = Math.min(1, c.y / 400);
    ctx.fillStyle = `rgba(90, 60, 30, ${0.32 * (1 - lift * 0.7)})`;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, size * 0.34 * (1 - lift * 0.3), size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Drawn at the shared centre, so the sprite sits exactly on its hitbox.
    const mid = project(centreOf(c), view);
    drawCreatureBody(ctx, c, mid.x, mid.y, size * 0.5);
  }
}

function drawRock(ctx, rock, view) {
  // Shadow first: it is the only thing telling the player how deep into the
  // arena the rock actually is, which is what makes a near-miss readable
  // instead of looking like the rock went through the animal.
  const g = project({ x: rock.x, y: 0, z: rock.z }, view);
  const gr = Math.max(2, ROCK_RADIUS * 1.4 * g.scale * view.unit);
  ctx.fillStyle = 'rgba(90, 60, 30, 0.3)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y, gr, gr * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

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

// Ghost arc plus a landing ring on the sand.
//
// The ring is the important half. On a flat screen a rock passing in front of
// an animal looks identical to one hitting it, so depth has to be shown some
// other way: match the ring to an animal's shadow and they are at the same
// depth.
function drawGhost(ctx, ghost, view) {
  if (!ghost?.points?.length) return;

  ctx.fillStyle = '#ffffff';
  ghost.points.forEach((pt, i) => {
    const p = project(pt, view);
    ctx.globalAlpha = 0.7 * (1 - (i / ghost.points.length) * 0.75);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.2, 4 * p.scale * view.unit), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const l = project(ghost.landing, view);
  const r = Math.max(4, 46 * l.scale * view.unit);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)';
  ctx.lineWidth = Math.max(1.5, 3 * l.scale * view.unit);
  ctx.beginPath();
  ctx.ellipse(l.x, l.y, r, r * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(l.x - r * 0.5, l.y);
  ctx.lineTo(l.x + r * 0.5, l.y);
  ctx.stroke();
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
  if (hud.weapon) {
    ctx.font = `600 ${size * 0.72}px system-ui, sans-serif`;
    ctx.fillStyle = '#f2e8cf';
    ctx.fillText(hud.weapon, view.width - pad, pad + size * 1.2);
  }

  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${hud.score}`, view.width / 2, view.height - pad - size);
}

// A small splat at the point of impact, then the score. The blood lands first
// and the number follows a beat later, so the hit reads before the reward.
const SPLAT = [
  { a: 0, d: 0.0, r: 0.34 },
  { a: 0.9, d: 0.62, r: 0.2 },
  { a: 2.1, d: 0.78, r: 0.15 },
  { a: 3.4, d: 0.55, r: 0.17 },
  { a: 4.4, d: 0.85, r: 0.12 },
  { a: 5.5, d: 0.66, r: 0.16 },
];

function drawSplat(ctx, pop, view) {
  const p = project(pop, view);
  const size = 46 * p.scale * view.unit;
  // Fades only at the very end, so the mark is clearly visible on impact.
  ctx.globalAlpha = Math.min(1, pop.life * 2.2);
  ctx.fillStyle = '#a81b1b';
  const grow = Math.min(1, (1 - pop.life) * 6);
  for (const b of SPLAT) {
    ctx.beginPath();
    ctx.arc(
      p.x + Math.cos(b.a) * size * b.d * grow,
      p.y + Math.sin(b.a) * size * b.d * grow,
      size * b.r * grow,
      0, Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// A splash weapon's blast: an expanding shockwave ring the size of the real
// kill radius, so the player can see how wide the explosion reached.
function drawBlast(ctx, pop, view) {
  const p = project(pop, view);
  const grow = Math.min(1, (1 - pop.life) * 5);
  const r = pop.blast * p.scale * view.unit * grow;
  if (r < 2) return;
  ctx.globalAlpha = Math.max(0, Math.min(0.8, pop.life * 1.6));
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 150, 40, 0.18)';
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFloatingPoints(ctx, pop, view) {
  if (!pop) return;
  if (pop.blast) drawBlast(ctx, pop, view);
  drawSplat(ctx, pop, view);

  // Hold the number back for a beat so the blood mark is seen first.
  if (pop.life > 0.78) return;
  const p = project(pop, view);
  const shown = (0.78 - pop.life) / 0.78;
  ctx.globalAlpha = Math.max(0, Math.min(1, pop.life * 2));
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${view.height * 0.05}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+${pop.points}`, p.x, p.y - shown * view.height * 0.11);
  ctx.globalAlpha = 1;
}

// The start-screen level picker: one tappable column per level, labelled with
// its weapon, so the whole game (and every weapon) is reachable without having
// to grind up from level 1. The columns divide the width evenly, and main.js
// hit-tests a tap by the same even division, so what you tap is what you get.
export function drawMenu(ctx, menu, view) {
  ctx.fillStyle = 'rgba(30,20,10,0.9)';
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb703';
  ctx.font = `700 ${view.height * 0.085}px system-ui, sans-serif`;
  ctx.fillText('Cat-a-pult', view.width / 2, view.height * 0.16);
  ctx.fillStyle = '#f2e8cf';
  ctx.font = `400 ${view.height * 0.036}px system-ui, sans-serif`;
  ctx.fillText('Tap a level to play it — each has its own weapon', view.width / 2, view.height * 0.29);

  const n = menu.length;
  const top = view.height * 0.4;
  const h = view.height * 0.44;
  const gap = view.width * 0.014;
  const colW = (view.width - gap * (n + 1)) / n;

  menu.forEach((lvl, i) => {
    const x = gap + i * (colW + gap);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, top, colW, h, view.height * 0.02);
    else ctx.rect(x, top, colW, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,183,3,0.7)';
    ctx.lineWidth = Math.max(1.5, view.height * 0.004);
    ctx.stroke();

    ctx.fillStyle = '#ffb703';
    ctx.font = `700 ${view.height * 0.07}px system-ui, sans-serif`;
    ctx.fillText(`${lvl.n}`, x + colW / 2, top + h * 0.26);

    // Weapon name, shrunk to fit the column so long names ("Spear-crossbow")
    // don't spill over the edge.
    let fs = view.height * 0.03;
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    const maxW = colW * 0.86;
    while (fs > 6 && ctx.measureText(lvl.weapon).width > maxW) {
      fs *= 0.9;
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
    }
    ctx.fillStyle = '#f2e8cf';
    ctx.fillText(lvl.weapon, x + colW / 2, top + h * 0.62);
  });
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
  if (scene.menu) drawMenu(ctx, scene.menu, view);
  else drawOverlay(ctx, scene.overlay, view);
}
