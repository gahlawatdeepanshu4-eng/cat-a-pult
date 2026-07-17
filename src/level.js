import { stepProjectile, launchVelocity, circlesOverlap } from './physics.js';
import {
  CATAPULT_X, GROUND_Y, CAT_RADIUS, TARGET_RADIUS,
  MOVING_TARGET_POINTS, EFFICIENCY_POINTS_PER_SHOT, MAX_ACCURACY_POINTS,
} from './constants.js';

const LAUNCH_Y = 90;

export function createRun(def) {
  return {
    def,
    shotsLeft: def.shots,
    phase: 'aiming',
    cat: null,
    target: def.movingTarget
      ? { x: def.movingTarget.xMin, y: def.movingTarget.y, dir: 1 }
      : null,
    targetHit: false,
    landing: null,
    cleared: false,
    score: 0,
  };
}

export function launch(run, { angle, power }) {
  if (run.phase !== 'aiming') return run;
  const v = launchVelocity(angle, power);
  return {
    ...run,
    phase: 'flying',
    shotsLeft: run.shotsLeft - 1,
    targetHit: false,
    landing: null,
    cat: { x: CATAPULT_X, y: LAUNCH_Y, vx: v.vx, vy: v.vy },
  };
}

function moveTarget(target, spec, dt) {
  if (!target) return null;
  let x = target.x + spec.speed * target.dir * dt;
  let dir = target.dir;
  if (x >= spec.xMax) { x = spec.xMax; dir = -1; }
  if (x <= spec.xMin) { x = spec.xMin; dir = 1; }
  return { x, y: target.y, dir };
}

export function tick(run, dt) {
  if (run.phase !== 'flying') return run;

  const cat = stepProjectile(run.cat, dt);
  const target = moveTarget(run.target, run.def.movingTarget, dt);

  const targetHit = run.targetHit || (target
    ? circlesOverlap(cat.x, cat.y, CAT_RADIUS, target.x, target.y, TARGET_RADIUS)
    : false);

  const hitGround = cat.y <= GROUND_Y;
  const outOfBounds = cat.x > run.def.bounds.maxX || cat.x < 0;

  if (hitGround || outOfBounds) {
    const x = cat.x;
    return {
      ...run,
      cat,
      target,
      targetHit,
      phase: 'landed',
      landing: { x, inZone: hitGround && inZone(run.def.zone, x) },
    };
  }

  return { ...run, cat, target, targetHit };
}

export function inZone(zone, x) {
  return x >= zone.x && x <= zone.x + zone.width;
}

export function accuracyPoints(zone, x) {
  const half = zone.width / 2;
  const centre = zone.x + half;
  const d = Math.abs(x - centre);
  if (d > half) return 0;
  return Math.round(MAX_ACCURACY_POINTS * (1 - d / half));
}

export function scoreShot(zone, landingX, targetHit, shotsLeft) {
  return accuracyPoints(zone, landingX)
    + (targetHit ? MOVING_TARGET_POINTS : 0)
    + shotsLeft * EFFICIENCY_POINTS_PER_SHOT;
}

export function resolveShot(run) {
  if (run.phase !== 'landed') return run;

  if (run.landing.inZone) {
    return {
      ...run,
      phase: 'cleared',
      cleared: true,
      score: scoreShot(run.def.zone, run.landing.x, run.targetHit, run.shotsLeft),
    };
  }
  if (run.shotsLeft <= 0) {
    return { ...run, phase: 'failed' };
  }
  return { ...run, phase: 'aiming' };
}

export function nextShot(run) {
  return { ...run, cat: null, landing: null, targetHit: false };
}
