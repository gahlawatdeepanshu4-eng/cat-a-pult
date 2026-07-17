export const MAX_DRAG_FRACTION = 0.35;
export const MIN_DRAG_PX = 8;

const MIN_ANGLE = 0;
const MAX_ANGLE = Math.PI / 2;

export const maxDragPx = (canvas) => canvas.clientHeight * MAX_DRAG_FRACTION;

// Slingshot drag: pull back and away from where you want the cat to go, so
// the launch direction is the opposite of the drag vector. Angle is clamped
// to the up-and-right quadrant so the player cannot fire backwards or into
// the dirt.
//
// Exported because the trajectory hint has to preview exactly the shot this
// would fire. Two copies of this maths would drift apart and the hint would
// start lying.
export function shotFromDrag(dx, dy, maxPx) {
  const dist = Math.hypot(dx, dy);
  if (dist < MIN_DRAG_PX) return null;
  // Screen y grows downward, world y grows upward, so dy is negated twice:
  // once to invert the drag, once to flip into world space. They cancel.
  const angle = Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, Math.atan2(dy, -dx)));
  const power = Math.min(dist / maxPx, 1);
  return { angle, power };
}

export function createInput(canvas, { onLaunch, onTap }) {
  let drag = null;

  function onDown(e) {
    drag = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    };
    canvas.setPointerCapture(e.pointerId);
  }

  function onMove(e) {
    if (!drag) return;
    drag.currentX = e.clientX;
    drag.currentY = e.clientY;
  }

  function onUp() {
    if (!drag) return;
    const dx = drag.currentX - drag.startX;
    const dy = drag.currentY - drag.startY;
    drag = null;

    const shot = shotFromDrag(dx, dy, maxDragPx(canvas));
    if (shot) onLaunch?.(shot);
    else onTap?.(); // too short to be a shot, so treat it as a tap
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    getDrag: () => drag,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
