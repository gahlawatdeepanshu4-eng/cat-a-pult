import { GRAVITY, MAX_LAUNCH_SPEED, MAX_DT } from './constants.js';

// Semi-implicit Euler: velocity updates before position. More stable than
// explicit Euler at the frame rates a phone actually delivers.
export function stepProjectile(body, dt, gravity = GRAVITY) {
  const vy = body.vy + gravity * dt;
  return {
    x: body.x + body.vx * dt,
    y: body.y + vy * dt,
    vx: body.vx,
    vy,
  };
}

export function launchVelocity(angleRad, power, maxSpeed = MAX_LAUNCH_SPEED) {
  const speed = power * maxSpeed;
  return { vx: Math.cos(angleRad) * speed, vy: Math.sin(angleRad) * speed };
}

export function clampDt(dt) {
  return Math.min(dt, MAX_DT);
}

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}
