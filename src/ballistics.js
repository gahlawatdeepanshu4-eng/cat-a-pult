import {
  GRAVITY, MAX_DT, MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, CHARGE_SECONDS,
} from './constants.js';

// heading: left/right angle away from straight ahead (+ is right)
// elevation: upward angle from level
// power: 0..1, maps onto the speed range
export function launchVelocity(heading, elevation, power) {
  const speed = MIN_LAUNCH_SPEED + power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
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

// Charging clamps at full rather than looping back to zero, so holding too
// long costs you nothing.
export function chargeToPower(heldSeconds) {
  return Math.min(heldSeconds / CHARGE_SECONDS, 1);
}
