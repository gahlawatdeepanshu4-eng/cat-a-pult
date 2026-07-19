import { FOCAL, VIRTUAL_HEIGHT, EYE_Y, HORIZON_FRACTION } from './constants.js';

export function makeView(canvas) {
  return {
    width: canvas.width,
    height: canvas.height,
    // Device pixels per CSS pixel, so drawing that must line up with a CSS-space
    // hit target (e.g. the mute button) can convert. 1 when clientWidth is 0.
    dpr: canvas.clientWidth ? canvas.width / canvas.clientWidth : 1,
    unit: canvas.height / VIRTUAL_HEIGHT,
    horizonY: canvas.height * HORIZON_FRACTION,
  };
}

// Pinhole perspective. Everything shrinks as z grows; this single function is
// the whole 3D illusion. Clamped at zero so a point behind the camera cannot
// produce a negative or infinite scale.
export function depthScale(z) {
  return Math.max(FOCAL / (z + FOCAL), 0);
}

export function project(point, view) {
  const scale = depthScale(point.z);
  return {
    x: view.width / 2 + point.x * scale * view.unit,
    y: view.horizonY - (point.y - EYE_Y) * scale * view.unit,
    scale,
  };
}
