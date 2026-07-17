import { MIN_CAMERA_Y, CATAPULT_X } from './constants.js';

export function createCamera(x = CATAPULT_X, y = MIN_CAMERA_Y) {
  return { x, y };
}

// Camera holds the world coordinate sitting at the centre of the viewport.
// y is clamped so the ground never drifts off the bottom of the screen, and
// x is clamped so the player cannot scroll behind the catapult.
export function followCat(camera, cat, lerp = 0.12) {
  const targetX = Math.max(cat.x, CATAPULT_X);
  const targetY = Math.max(cat.y, MIN_CAMERA_Y);
  return {
    x: camera.x + (targetX - camera.x) * lerp,
    y: camera.y + (targetY - camera.y) * lerp,
  };
}
