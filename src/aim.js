import {
  MAX_HEADING, MIN_ELEVATION, MAX_ELEVATION, MIN_DRAG_PX, MAX_DRAG_FRACTION,
} from './constants.js';

// Slingshot drag: pull back from where you want the rock to go, exactly like
// Angry Birds. One gesture carries direction and power, and no clock runs, so
// you can take as long as you like lining a shot up.
//
// dx, dy are the drag in screen pixels (current minus start). Screen y grows
// downward, so dragging DOWN (positive dy) must raise elevation.
//
// Returns null for a drag too short to be a shot, so a stray tap cancels
// instead of firing a dud.
//
// Pure and exported so the ghost arc and the real shot are the same
// calculation. Two copies would drift and the preview would start lying.
export function aimFromDrag(dx, dy, screenHeight) {
  const dist = Math.hypot(dx, dy);
  if (dist < MIN_DRAG_PX) return null;

  const maxDrag = screenHeight * MAX_DRAG_FRACTION;

  // The two axes of the pull are independent. Sideways aims left/right; it does
  // NOT feed power. That matters: with power tied to total drag length, aiming
  // at a side target forced a hard, flat shot, which made close-and-to-the-side
  // creatures reachable only by a near-flat line — so steep lobs could never
  // hit them. Splitting the axes lets every shot be a steep lob.
  const nx = Math.max(-1, Math.min(1, -dx / maxDrag)); // fire opposite the pull
  // The downward pull sets both how hard and how steep: a longer pull is a
  // stronger, higher-arcing lob.
  const ny = Math.max(0, Math.min(1, dy / maxDrag));

  return {
    heading: nx * MAX_HEADING,
    elevation: MIN_ELEVATION + ny * (MAX_ELEVATION - MIN_ELEVATION),
    power: ny,
  };
}
