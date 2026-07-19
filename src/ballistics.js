import { GRAVITY, MAX_DT, MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED } from './constants.js';

// heading: left/right angle away from straight ahead (+ is right)
// elevation: upward angle from level
// power: 0..1, maps onto the speed range
// speedScale: the weapon's multiplier on that speed (1 = the catapult; a
//   crossbow bolt leaves faster, so for the same aim it flies flatter).
export function launchVelocity(heading, elevation, power, speedScale = 1) {
  const speed = (MIN_LAUNCH_SPEED + power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED)) * speedScale;
  const forward = Math.cos(elevation) * speed;
  return {
    vx: Math.sin(heading) * forward,
    vy: Math.sin(elevation) * speed,
    vz: Math.cos(heading) * forward,
  };
}

// Semi-implicit Euler: velocity updates before position.
export function stepBody(body, dt, gravity = GRAVITY) {
  const vy = body.vy + gravity * dt;
  return {
    x: body.x + body.vx * dt,
    y: body.y + vy * dt,
    z: body.z + body.vz * dt,
    vx: body.vx,
    vy,
    vz: body.vz,
  };
}

export function clampDt(dt) {
  return Math.min(dt, MAX_DT);
}
