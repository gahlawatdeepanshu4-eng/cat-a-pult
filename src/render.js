import { project } from './project.js';
import { radiusOf, centreOf, KIND } from './creatures.js';
import { WALL_Z, ROCK_RADIUS } from './constants.js';
import { homeButtons, settingsButtons, pauseButtons, howtoButtons } from './ui.js';

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

// Lighten (+) or darken (-) a #rrggbb colour by a flat amount per channel.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${cl(((n >> 16) & 255) + amt)},${cl(((n >> 8) & 255) + amt)},${cl((n & 255) + amt)})`;
}

// Scenery themes. Render-only: a palette (sky, yard ground, backdrop, fence)
// plus a backdrop silhouette drawn beyond the fence. In the sampler each level
// gets its own theme — a different view per weapon; in the campaign a theme
// lasts a five-level band. The fenced yard itself is identical every level;
// only these colours and the backdrop change.
const SCENERY = [
  { name: 'hills',  sky: ['#7ec0e8', '#cfeccb'], ground: ['#6fae4e', '#a7d17a'], backdrop: 'hills',     shape: '#4f8a3a', fence: '#9a7649' },
  { name: 'desert', sky: ['#e8a44f', '#f6dca6'], ground: ['#cf9a52', '#eed6a0'], backdrop: 'mesa',      shape: '#bf7d3f', fence: '#c8a877' },
  { name: 'snow',   sky: ['#a9cbe6', '#eef5fb'], ground: ['#d7e6f0', '#ffffff'], backdrop: 'mountains', shape: '#8fa4b6', fence: '#aeb4bc' },
  { name: 'jungle', sky: ['#6fb488', '#cfe6a8'], ground: ['#4f8f3a', '#8ec062'], backdrop: 'trees',     shape: '#2f6b34', fence: '#6b4a2a' },
  { name: 'night',  sky: ['#141c46', '#33285e'], ground: ['#20463a', '#39634c'], backdrop: 'stars',     shape: '#ffd76a', fence: '#6a6490' },
];

export function sceneryFor(level, perLevel) {
  const i = perLevel ? (level - 1) : Math.floor((level - 1) / 5);
  return SCENERY[((i % SCENERY.length) + SCENERY.length) % SCENERY.length];
}

function drawSky(ctx, view, theme) {
  const [top, bot] = theme?.sky ?? ['#6d4f2f', '#b98d54'];
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

// The themed silhouette that sits beyond the fence, on the horizon.
function drawBackdrop(ctx, view, theme) {
  const hz = project({ x: 0, y: 0, z: WALL_Z }, view).y;
  const W = view.width, H = view.height;
  const base = hz + H * 0.01;
  const kind = theme?.backdrop;

  if (kind === 'stars') {
    ctx.fillStyle = '#f2ead0';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.2, H * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 733) % 1000) / 1000 * W;
      const y = ((i * 271) % 1000) / 1000 * (hz - H * 0.02);
      ctx.beginPath();
      ctx.arc(x, y, ((i * 97) % 3 + 1) * H * 0.0016, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (kind === 'mountains') {
    for (let i = 0; i < 5; i++) {
      const cx = W * (i + 0.5) / 5;
      const ph = H * (0.2 + (i % 2) * 0.08);
      const pw = W * 0.17;
      ctx.fillStyle = shade(theme.shape, -10 + (i % 2) * 24);
      ctx.beginPath();
      ctx.moveTo(cx - pw, base); ctx.lineTo(cx, base - ph); ctx.lineTo(cx + pw, base); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - pw * 0.32, base - ph * 0.68); ctx.lineTo(cx, base - ph); ctx.lineTo(cx + pw * 0.32, base - ph * 0.68);
      ctx.closePath(); ctx.fill();
    }
    return;
  }
  if (kind === 'mesa') {
    for (const [fx, fw, fh, d] of [[0.22, 0.24, 0.15, -18], [0.55, 0.3, 0.22, 12], [0.85, 0.22, 0.12, -24]]) {
      ctx.fillStyle = shade(theme.shape, d);
      const x = W * fx, w = W * fw, h = H * fh;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.4, base - h);
      ctx.lineTo(x + w * 0.4, base - h); ctx.lineTo(x + w / 2, base);
      ctx.closePath(); ctx.fill();
    }
    return;
  }
  if (kind === 'trees') {
    ctx.fillStyle = shade(theme.shape, -14);
    for (let i = 0; i <= 7; i++) {
      ctx.beginPath(); ctx.arc(W * i / 7, base - H * 0.05, H * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = theme.shape;
    for (let i = 0; i <= 7; i++) {
      ctx.beginPath(); ctx.arc(W * (i + 0.5) / 7, base - H * 0.08, H * 0.075, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  // hills (default): two layers of rolling mounds.
  for (const [layer, d] of [[0.14, -20], [0.09, 10]]) {
    ctx.fillStyle = shade(theme?.shape ?? '#4f8a3a', d);
    const h = H * layer;
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let i = 0; i <= 4; i++) {
      ctx.quadraticCurveTo(W * (i - 0.5) / 4, base - h, W * i / 4, base - h * 0.2);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }
}

function drawGround(ctx, view, theme) {
  const [near, far] = theme?.ground ?? ['#c39d63', '#eed6a0'];
  const atWall = project({ x: 0, y: 0, z: WALL_Z }, view).y;
  const g = ctx.createLinearGradient(0, atWall, 0, view.height);
  g.addColorStop(0, near);
  g.addColorStop(1, far);
  ctx.fillStyle = g;
  ctx.fillRect(0, atWall, view.width, view.height - atWall);

  // A faint horizon line so the ground always reads as a separate plane from the
  // sky — otherwise a dark theme (the night sky) blends into its ground and the
  // creatures look like they are floating.
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = Math.max(1, view.height * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, atWall);
  ctx.lineTo(view.width, atWall);
  ctx.stroke();
}

// The fenced yard the creatures roam in — a big rectangular cattle pen. Its
// shape is identical on every level; only the colour changes with the theme.
// The front (the player's side) is open, so you see three sides: a back wall at
// the far edge and two straight side walls at a CONSTANT world half-width,
// running from right in front of the player back to the far wall. In
// perspective the sides start wide at the bottom corners and converge toward the
// back, so it reads as standing inside the pen looking at its three walls.
//
// penW must exceed the widest the creatures ever wander (xLimitAt caps at
// ARENA_HALF_WIDTH - 90 = 730), so every creature is always inside the pen.
const YARD = { penW: 790, nearZ: 90, postH: 165, rail: [150, 100, 55] };

function drawFence(ctx, view, theme) {
  const col = theme?.fence ?? '#8a6b45';
  const railCol = shade(col, -30);
  const capCol = shade(col, 18);
  const { penW, nearZ, postH } = YARD;

  // Back wall: a run of posts across the far edge.
  const back = [];
  for (let i = 0; i <= 8; i++) back.push({ x: -penW + (2 * penW) * (i / 8), z: WALL_Z });
  // Side walls: straight lines at constant world half-width, from near the
  // player back to the wall — so they converge toward the horizon like a pen.
  const zStops = [nearZ, 260, 520, 820, 1160, WALL_Z];
  const left = zStops.map((z) => ({ x: -penW, z }));
  const right = zStops.map((z) => ({ x: penW, z }));

  const drawRun = (pts) => {
    // Rails, drawn segment by segment so they taper with depth instead of
    // staying one thick width down a long receding side wall.
    ctx.strokeStyle = railCol;
    ctx.lineCap = 'round';
    for (const rh of YARD.rail) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = project({ x: pts[i].x, y: rh, z: pts[i].z }, view);
        const b = project({ x: pts[i + 1].x, y: rh, z: pts[i + 1].z }, view);
        const sc = project({ x: pts[i].x, y: 0, z: pts[i].z }, view).scale * view.unit;
        ctx.lineWidth = Math.max(1, 9 * sc);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const p of pts) {
      const bot = project({ x: p.x, y: 0, z: p.z }, view);
      const top = project({ x: p.x, y: postH, z: p.z }, view);
      const w = Math.max(2, 14 * bot.scale * view.unit);
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(bot.x, bot.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      // A little cap on each post.
      ctx.fillStyle = capCol;
      ctx.beginPath();
      ctx.arc(top.x, top.y, w * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Furthest run first.
  drawRun(back);
  drawRun(left);
  drawRun(right);
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

// What each weapon actually throws. Purely how it looks — the physics is one
// swept point regardless.
const PROJECTILE = {
  catapult: 'rock',
  crossbow: 'dart',
  spearcrossbow: 'fork',
  spear: 'bone',
  bazooka: 'firework',
};

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Draw the weapon's ammo centred at (x, y), sized by r, pointing along `angle`
// (screen radians). Shapes are drawn pointing along +x, then rotated, so "the
// pointy end leads". Used both in flight and as the loaded round on the weapon.
function drawProjectile(ctx, kind, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = 'round';
  const outline = () => { ctx.strokeStyle = '#2f2a22'; ctx.lineWidth = Math.max(1, r * 0.18); ctx.stroke(); };

  if (kind === 'dart') {
    // Toy foam dart: orange body, soft suction-cup nose, blue tail fins.
    const L = r * 2.0, w = r * 0.6;
    ctx.fillStyle = '#2a7fff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-L, 0);
      ctx.lineTo(-L - r * 0.8, s * w * 1.8);
      ctx.lineTo(-L + r * 0.6, s * w * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ff8c1a';
    roundRectPath(ctx, -L, -w, L * 1.4, w * 2, w);
    ctx.fill(); outline();
    // Suction cup.
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.ellipse(L * 0.5, 0, w * 0.9, w * 1.05, 0, 0, Math.PI * 2);
    ctx.fill(); outline();
  } else if (kind === 'fork') {
    // A flying fork — four tines that skewer everything in a line.
    const L = r * 2.6, w = r * 1.1;
    ctx.fillStyle = '#cfd3d9';
    // Handle.
    roundRectPath(ctx, -L, -r * 0.3, L * 0.95, r * 0.6, r * 0.25);
    ctx.fill(); outline();
    // Base the tines spring from.
    roundRectPath(ctx, -r * 0.2, -w, r * 0.5, w * 2, r * 0.2);
    ctx.fill(); outline();
    // Four tines.
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      roundRectPath(ctx, r * 0.2, k * (w / 1.9) - r * 0.14, L * 0.9, r * 0.28, r * 0.12);
      ctx.fill(); outline();
    }
  } else if (kind === 'bone') {
    // A dino bone used as a spear: knobbly tail, sharpened point.
    const L = r * 2.6, w = r * 0.5;
    ctx.fillStyle = '#ece0c8';
    roundRectPath(ctx, -L * 0.7, -w, L * 1.2, w * 2, w * 0.6);
    ctx.fill(); outline();
    // Double knob at the tail.
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-L * 0.7, s * w * 1.1, w * 0.95, 0, Math.PI * 2);
      ctx.fill(); outline();
    }
    // Sharpened point.
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -w * 1.1);
    ctx.lineTo(L * 1.2, 0);
    ctx.lineTo(L * 0.5, w * 1.1);
    ctx.closePath();
    ctx.fill(); outline();
  } else if (kind === 'firework') {
    // A firework rocket: striped body, party-cone nose, a stick tail and sparks.
    const L = r * 1.8, w = r * 0.9;
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L * 2.4, 0); ctx.stroke();
    ctx.fillStyle = '#e5322b';
    roundRectPath(ctx, -L, -w, L * 1.5, w * 2, w * 0.4);
    ctx.fill(); outline();
    // A white stripe.
    ctx.fillStyle = '#fff';
    roundRectPath(ctx, -L * 0.2, -w, r * 0.5, w * 2, r * 0.1);
    ctx.fill();
    // Party-cone nose.
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -w);
    ctx.lineTo(L * 1.5, 0);
    ctx.lineTo(L * 0.5, w);
    ctx.closePath();
    ctx.fill(); outline();
    // Fuse sparks at the tail.
    ctx.fillStyle = 'rgba(255,180,40,0.95)';
    for (const s of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.arc(-L * 1.9, s * w * 0.7, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Rock: a plain stone.
    ctx.fillStyle = '#5b5348';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill(); outline();
  }
  ctx.restore();
}

function drawFlyingProjectile(ctx, rock, view, weaponName) {
  // Shadow first: it is the only thing telling the player how deep into the
  // arena the shot actually is, which is what makes a near-miss readable
  // instead of looking like it went through the animal.
  const g = project({ x: rock.x, y: 0, z: rock.z }, view);
  const gr = Math.max(2, ROCK_RADIUS * 1.4 * g.scale * view.unit);
  ctx.fillStyle = 'rgba(90, 60, 30, 0.3)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y, gr, gr * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const p = project(rock, view);
  const r = Math.max(2, ROCK_RADIUS * p.scale * view.unit);
  // Point the projectile along the direction it is actually moving on screen.
  const ahead = project({
    x: rock.x + rock.vx * 0.05, y: rock.y + rock.vy * 0.05, z: rock.z + rock.vz * 0.05,
  }, view);
  const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x);
  drawProjectile(ctx, PROJECTILE[weaponName] ?? 'rock', p.x, p.y, r, angle);
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

// A gripping fist at (x, y), oriented along `angle` so it wraps the weapon it
// holds. Skin-toned to read as the player's own hand reaching into the view.
function drawHand(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = 'round';
  const line = () => { ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = Math.max(1, s * 0.12); ctx.stroke(); };
  // Wrist/forearm trailing back down out of frame.
  ctx.fillStyle = '#e3ac82';
  roundRectPath(ctx, -s * 2.2, -s * 0.7, s * 2.4, s * 1.4, s * 0.5);
  ctx.fill(); line();
  // Fist.
  ctx.fillStyle = '#eab892';
  ellipse(ctx, 0, 0, s, s * 0.85);
  ctx.fill(); line();
  // Knuckles across the top.
  ctx.fillStyle = '#e3ac82';
  for (let i = -1; i <= 2; i++) {
    ellipse(ctx, i * s * 0.42, -s * 0.7, s * 0.24, s * 0.3);
    ctx.fill();
  }
  // Thumb wrapping the front.
  ctx.fillStyle = '#eab892';
  ellipse(ctx, s * 0.5, s * 0.5, s * 0.35, s * 0.5);
  ctx.fill(); line();
  ctx.restore();
}

// Each non-catapult weapon is a fun, cartoon variant drawn compact and low in
// the bottom margin, pointing up toward the aim: big enough to read, small
// enough that it never covers the creatures. Distinct silhouette + colour each.

// Toy dart blaster (the "crossbow"): a chunky orange body, blue barrel, yellow
// hopper on top. Fires a foam dart.
function drawDartGun(ctx, view, aimAngle, reach) {
  const s = view.height;
  const grip = { x: view.width / 2, y: s * 1.06 };
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(aimAngle);
  // Body.
  ctx.fillStyle = '#ff8c1a';
  roundRectPath(ctx, -reach * 0.08, -reach * 0.18, reach * 0.7, reach * 0.36, reach * 0.1);
  ctx.fill();
  ctx.strokeStyle = '#2f2a22'; ctx.lineWidth = Math.max(1, s * 0.006); ctx.stroke();
  // Barrel.
  ctx.fillStyle = '#2a7fff';
  roundRectPath(ctx, reach * 0.55, -reach * 0.1, reach * 0.5, reach * 0.2, reach * 0.07);
  ctx.fill(); ctx.stroke();
  // Yellow hopper.
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.ellipse(reach * 0.28, -reach * 0.28, reach * 0.16, reach * 0.16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  drawHand(ctx, grip.x, grip.y, s * 0.05, aimAngle);
  return { x: grip.x + Math.cos(aimAngle) * reach, y: grip.y + Math.sin(aimAngle) * reach, grip };
}

// Giant fork (the "spear-crossbow"): four big shiny tines — it literally
// skewers a line of creatures. Fires a flying fork.
function drawGiantFork(ctx, view, aimAngle, reach) {
  const s = view.height;
  const grip = { x: view.width / 2, y: s * 1.05 };
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(aimAngle);
  ctx.fillStyle = '#cfd3d9';
  ctx.strokeStyle = '#6a6f78';
  ctx.lineWidth = Math.max(1, s * 0.006);
  // Handle.
  roundRectPath(ctx, 0, -reach * 0.06, reach * 0.55, reach * 0.12, reach * 0.05);
  ctx.fill(); ctx.stroke();
  // Base the tines spring from.
  roundRectPath(ctx, reach * 0.5, -reach * 0.5, reach * 0.12, reach, reach * 0.05);
  ctx.fill(); ctx.stroke();
  // Four tines.
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    roundRectPath(ctx, reach * 0.6, k * reach * 0.24 - reach * 0.045, reach * 0.5, reach * 0.09, reach * 0.04);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  drawHand(ctx, grip.x, grip.y, s * 0.05, aimAngle);
  return { x: grip.x + Math.cos(aimAngle) * reach, y: grip.y + Math.sin(aimAngle) * reach, grip };
}

// T-rex-bone spear (the "spear"): a knobbly dino bone with a sharpened tip. It
// is its own round, so it only shows while loaded; once thrown the hand is empty.
function drawBoneSpear(ctx, view, aimAngle, reach, loaded) {
  const s = view.height;
  const grip = { x: view.width / 2, y: s * 1.05 };
  const a = aimAngle - 0.08; // a slight throwing cant
  drawHand(ctx, grip.x, grip.y, s * 0.05, a);
  if (loaded) {
    ctx.save();
    ctx.translate(grip.x, grip.y);
    ctx.rotate(a);
    ctx.fillStyle = '#ece0c8';
    ctx.strokeStyle = '#b8a980';
    ctx.lineWidth = Math.max(1, s * 0.006);
    // Shaft.
    roundRectPath(ctx, 0, -reach * 0.05, reach, reach * 0.1, reach * 0.04);
    ctx.fill(); ctx.stroke();
    // Knobbly bone ends near the grip.
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(reach * 0.06, sgn * reach * 0.09, reach * 0.09, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // Sharpened point.
    ctx.beginPath();
    ctx.moveTo(reach * 0.95, -reach * 0.1);
    ctx.lineTo(reach * 1.22, 0);
    ctx.lineTo(reach * 0.95, reach * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  return { grip };
}

// Fireworks cannon (the "bazooka"): a festive striped mortar tube with sparks
// at the muzzle. Lobs a firework rocket that bursts on impact.
function drawFireworks(ctx, view, aimAngle, reach) {
  const s = view.height;
  const grip = { x: view.width / 2, y: s * 1.06 };
  const w = reach * 0.3;
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(aimAngle);
  // Tube.
  ctx.fillStyle = '#6a3fb0';
  roundRectPath(ctx, 0, -w, reach * 0.78, w * 2, w * 0.4);
  ctx.fill();
  ctx.strokeStyle = '#2f2a22'; ctx.lineWidth = Math.max(1, s * 0.006); ctx.stroke();
  // Star spots.
  ctx.fillStyle = '#ffd23a';
  for (const dx of [0.2, 0.45]) {
    ctx.beginPath();
    ctx.arc(reach * dx, 0, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  // Muzzle rim.
  ctx.fillStyle = '#4a2a80';
  roundRectPath(ctx, reach * 0.68, -w * 1.25, reach * 0.1, w * 2.5, w * 0.3);
  ctx.fill(); ctx.stroke();
  // Sparks at the muzzle.
  ctx.fillStyle = 'rgba(255,190,50,0.95)';
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.arc(reach * 0.86, k * w * 0.7, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawHand(ctx, grip.x, grip.y, s * 0.055, aimAngle);
  return { x: grip.x + Math.cos(aimAngle) * reach * 0.78, y: grip.y + Math.sin(aimAngle) * reach * 0.78, grip };
}

// Draw whichever weapon this level uses — held low in the view, pointing where
// the shot will go, and slightly see-through so it never hides a target.
// `launch` (1→0) briefly lunges it forward on release.
function drawLauncher(ctx, view, scene) {
  const name = scene.weaponName ?? 'catapult';
  // The catapult is a slingshot — its pouch follows the finger, so it keeps its
  // own drawing rather than the pointed-forward held-weapon frame.
  if (name === 'catapult') {
    drawSling(ctx, view, scene.drag, scene.loaded);
    return;
  }

  const heading = scene.aim ? scene.aim.heading : 0;
  const aimAngle = -Math.PI / 2 + heading * 0.5; // point up, tilt gently with aim
  const lunge = (scene.launch ?? 0) * view.height * 0.05;
  const reach = view.height * 0.2 + lunge;
  const showRound = scene.loaded && (scene.launch ?? 0) < 0.25;

  ctx.save();
  ctx.globalAlpha = 0.9;
  let muzzle;
  if (name === 'crossbow') muzzle = drawDartGun(ctx, view, aimAngle, reach);
  else if (name === 'spearcrossbow') muzzle = drawGiantFork(ctx, view, aimAngle, reach);
  else if (name === 'spear') muzzle = drawBoneSpear(ctx, view, aimAngle, reach, showRound);
  else if (name === 'bazooka') muzzle = drawFireworks(ctx, view, aimAngle, reach);

  // The loaded round on the muzzle while aiming. The bone spear is its own round
  // and draws itself above, so it is skipped here.
  if (showRound && muzzle && name !== 'spear') {
    const r = name === 'bazooka' ? view.height * 0.03 : view.height * 0.02;
    drawProjectile(ctx, PROJECTILE[name] ?? 'rock', muzzle.x, muzzle.y, r, aimAngle);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawPower(ctx, power, view) {
  const w = view.width * 0.02;
  const h = view.height * 0.4;
  // Push in past the left safe-area inset (notch / Dynamic Island) so the gauge
  // isn't clipped; 0 inset on notchless screens leaves it exactly where it was.
  // Then pull it 0.4 cm back toward the edge (player's tuning) — 1cm ≈ 37.8 CSS
  // px, times dpr for device px. Floored at 0 so it can't leave the screen.
  const nudge = 0.4 * 37.795 * (view.dpr ?? 1);
  const x = Math.max(0, (view.safe?.left ?? 0) + view.width * 0.035 - nudge);
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
  const theme = scene.scenery;
  drawSky(ctx, view, theme);
  drawBackdrop(ctx, view, theme);
  drawGround(ctx, view, theme);
  drawFence(ctx, view, theme);
  drawCreatures(ctx, scene.creatures, view);
  if (scene.rock) drawFlyingProjectile(ctx, scene.rock, view, scene.weaponName);
  drawGhost(ctx, scene.ghost, view);
  drawLauncher(ctx, view, scene);
  drawPower(ctx, scene.power, view);
  drawFloatingPoints(ctx, scene.pop, view);
  drawHud(ctx, scene.hud, view);
  drawScreen(ctx, scene, view);
}

// Draw whatever menu/overlay the current screen calls for, on top of the world.
// The full-screen menus (home/settings/how-to) paint their own opaque panel, so
// the frozen game underneath doesn't show through; the in-play family keeps the
// pause + mute controls visible.
function drawScreen(ctx, scene, view) {
  const s = scene.screen;
  if (s === 'home') { drawHome(ctx, view); return; }
  if (s === 'settings') { drawSettings(ctx, scene.audio ?? {}, view); return; }
  if (s === 'howto') { drawHowto(ctx, view); return; }

  if (s === 'paused') drawPause(ctx, view);
  else if (scene.menu) drawMenu(ctx, scene.menu, view);
  else drawOverlay(ctx, scene.overlay, view);

  if (s === 'play') drawPauseButton(ctx, view);
  drawMute(ctx, scene.muted, view); // global control, always on top when in-game
}

// --- Menu screens ----------------------------------------------------------

const PANEL_BG = '#241a10';

function byId(buttons, id) {
  return buttons.find((b) => b.id === id);
}

// One tappable button from a normalised rect (fraction of the canvas). `pill`
// draws an ON/OFF chip on the right and left-aligns the label — for toggles.
function drawButton(ctx, b, view, { label, primary = false, pill = null } = {}) {
  const x = b.x * view.width;
  const y = b.y * view.height;
  const w = b.w * view.width;
  const h = b.h * view.height;
  ctx.save();
  ctx.fillStyle = primary ? '#e8443a' : 'rgba(45,33,20,0.94)';
  roundRectPath(ctx, x, y, w, h, h * 0.26);
  ctx.fill();
  ctx.lineWidth = Math.max(1, view.height * 0.003);
  ctx.strokeStyle = 'rgba(242,232,207,0.35)';
  ctx.stroke();

  ctx.fillStyle = '#f2e8cf';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${h * 0.4}px system-ui, sans-serif`;
  if (pill) {
    ctx.textAlign = 'left';
    ctx.fillText(label, x + h * 0.4, y + h / 2);
    const pw = w * 0.26;
    const ph = h * 0.52;
    const px = x + w - pw - h * 0.3;
    const py = y + h / 2 - ph / 2;
    ctx.fillStyle = pill.on ? '#57cc99' : '#6b6258';
    roundRectPath(ctx, px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = pill.on ? '#12331f' : '#241a10';
    ctx.textAlign = 'center';
    ctx.font = `800 ${ph * 0.56}px system-ui, sans-serif`;
    ctx.fillText(pill.on ? 'ON' : 'OFF', px + pw / 2, py + ph / 2);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function screenTitle(ctx, text, view, sub) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb703';
  ctx.font = `800 ${view.height * 0.11}px system-ui, sans-serif`;
  ctx.fillText(text, view.width / 2, view.height * (sub ? 0.2 : 0.22));
  if (sub) {
    ctx.fillStyle = '#f2e8cf';
    ctx.font = `400 ${view.height * 0.037}px system-ui, sans-serif`;
    ctx.fillText(sub, view.width / 2, view.height * 0.3);
  }
}

function drawHome(ctx, view) {
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, view.width, view.height);
  screenTitle(ctx, 'Cat-a-pult', view, 'Fling stuff at silly creatures');
  const b = homeButtons();
  drawButton(ctx, byId(b, 'play'), view, { label: '▶  Play', primary: true });
  drawButton(ctx, byId(b, 'settings'), view, { label: 'Settings' });
  drawButton(ctx, byId(b, 'howto'), view, { label: 'How to play' });
}

function drawSettings(ctx, audio, view) {
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, view.width, view.height);
  screenTitle(ctx, 'Settings', view);
  const b = settingsButtons();
  drawButton(ctx, byId(b, 'music'), view, { label: 'Music', pill: { on: audio.music !== false } });
  drawButton(ctx, byId(b, 'sfx'), view, { label: 'Sound effects', pill: { on: audio.sfx !== false } });
  drawButton(ctx, byId(b, 'reset'), view, { label: 'Reset progress' });
  drawButton(ctx, byId(b, 'back'), view, { label: 'Back' });
}

function drawPause(ctx, view) {
  ctx.fillStyle = 'rgba(10,8,5,0.74)';
  ctx.fillRect(0, 0, view.width, view.height);
  screenTitle(ctx, 'Paused', view);
  const b = pauseButtons();
  drawButton(ctx, byId(b, 'resume'), view, { label: '▶  Resume', primary: true });
  drawButton(ctx, byId(b, 'restart'), view, { label: 'Restart level' });
  drawButton(ctx, byId(b, 'settings'), view, { label: 'Settings' });
  drawButton(ctx, byId(b, 'quit'), view, { label: 'Quit to menu' });
}

const HOWTO_LINES = [
  'Drag back from the slingshot and let go —',
  'like Angry Birds.',
  '',
  'Drag direction aims, drag length is power.',
  '',
  'Clear every creature before your ammo runs',
  'out. Farther hits score more, and each',
  'level hands you a new weapon.',
];

function drawHowto(ctx, view) {
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, view.width, view.height);
  screenTitle(ctx, 'How to play', view);

  const back = byId(howtoButtons(), 'back');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2e8cf';
  // Centre the text block in the gap between the title and the Back button, so
  // it can't overrun the button on a short (landscape) screen no matter how
  // many lines there are.
  const top = view.height * 0.32;
  const bottom = back.y * view.height;
  const lh = Math.min(view.height * 0.052, (bottom - top) / HOWTO_LINES.length);
  const size = lh * 0.72;
  ctx.font = `400 ${size}px system-ui, sans-serif`;
  const startY = (top + bottom) / 2 - ((HOWTO_LINES.length - 1) * lh) / 2;
  HOWTO_LINES.forEach((line, i) => {
    ctx.fillText(line, view.width / 2, startY + i * lh);
  });

  drawButton(ctx, back, view, { label: 'Back' });
}

// The in-play pause pad: bottom-left corner, mirroring the mute button's square.
function drawPauseButton(ctx, view) {
  const s = Math.max(44 * (view.dpr || 1), Math.min(view.width, view.height) * 0.13);
  const x = 0;
  const y = view.height - s;
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,26,0.45)';
  roundRectPath(ctx, x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72, s * 0.2);
  ctx.fill();
  ctx.fillStyle = '#f2e8cf';
  const cx = x + s / 2;
  const cy = y + s / 2;
  const bw = s * 0.1;
  const bh = s * 0.34;
  ctx.fillRect(cx - bw * 1.6, cy - bh / 2, bw, bh);
  ctx.fillRect(cx + bw * 0.6, cy - bh / 2, bw, bh);
  ctx.restore();
}

// The mute toggle: a rounded pad in the bottom-right corner with a speaker
// glyph. Its geometry mirrors muteRectCss() in main.js (a square of side
// max(44, 0.13·min(w,h)) tucked into the corner), so the tap target and the
// drawn button are the same place.
function drawMute(ctx, muted, view) {
  const s = Math.max(44 * (view.dpr || 1), Math.min(view.width, view.height) * 0.13);
  const x = view.width - s;
  const y = view.height - s;
  const cx = x + s / 2;
  const cy = y + s / 2;
  const g = s * 0.5;

  ctx.save();
  ctx.fillStyle = 'rgba(20,20,26,0.45)';
  roundRectPath(ctx, x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72, s * 0.2);
  ctx.fill();

  ctx.fillStyle = muted ? '#9aa0a6' : '#f2e8cf';
  ctx.strokeStyle = ctx.fillStyle;
  // Speaker body: a little box + a triangular cone.
  ctx.beginPath();
  ctx.moveTo(cx - g * 0.34, cy - g * 0.14);
  ctx.lineTo(cx - g * 0.14, cy - g * 0.14);
  ctx.lineTo(cx + g * 0.06, cy - g * 0.34);
  ctx.lineTo(cx + g * 0.06, cy + g * 0.34);
  ctx.lineTo(cx - g * 0.14, cy + g * 0.14);
  ctx.lineTo(cx - g * 0.34, cy + g * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = Math.max(1, g * 0.09);
  ctx.lineCap = 'round';
  if (muted) {
    // A red slash for "off".
    ctx.strokeStyle = '#e8443a';
    ctx.beginPath();
    ctx.moveTo(cx + g * 0.16, cy - g * 0.28);
    ctx.lineTo(cx + g * 0.42, cy + g * 0.28);
    ctx.stroke();
  } else {
    // Two sound waves for "on".
    ctx.beginPath();
    ctx.arc(cx + g * 0.06, cy, g * 0.28, -Math.PI / 3, Math.PI / 3);
    ctx.moveTo(cx + g * 0.06 + g * 0.44, cy - g * 0.22);
    ctx.arc(cx + g * 0.06, cy, g * 0.46, -Math.PI / 3.4, Math.PI / 3.4);
    ctx.stroke();
  }
  ctx.restore();
}
