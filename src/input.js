// Captures the drag only. All the maths lives in aim.js so the ghost arc and
// the real shot cannot disagree.
export function createInput(canvas, { onRelease }) {
  let drag = null;

  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e) {
    const p = at(e);
    drag = { startX: p.x, startY: p.y, x: p.x, y: p.y };
    canvas.setPointerCapture?.(e.pointerId);
  }

  function move(e) {
    if (!drag) return;
    const p = at(e);
    drag.x = p.x;
    drag.y = p.y;
  }

  function up() {
    if (!drag) return;
    const finished = drag;
    drag = null;
    onRelease?.({
      dx: finished.x - finished.startX,
      dy: finished.y - finished.startY,
    });
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  return {
    getDrag: () => drag,
    destroy() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    },
  };
}
