// The pointer does two jobs at once: where it is sets the aim, and holding it
// down charges the power. Matches the original's click-and-hold slingshot.
export function createInput(canvas, { onPress, onRelease }) {
  let pointer = null;
  let held = false;

  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e) {
    pointer = toCanvas(e);
    held = true;
    canvas.setPointerCapture?.(e.pointerId);
    onPress?.();
  }

  function move(e) {
    pointer = toCanvas(e);
  }

  function up() {
    if (!held) return;
    held = false;
    onRelease?.();
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', move);

  return {
    getPointer: () => pointer,
    isHeld: () => held,
    destroy() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', move);
    },
  };
}

// Screen pixels to the -1..1 across / 0..1 up space the rules speak in.
// Pure, so the aim the crosshair shows and the aim that fires are the same
// calculation rather than two that can drift apart.
export function pointerToAim(pointer, width, height) {
  if (!pointer) return { nx: 0, ny: 0.5 };
  const nx = (pointer.x / width) * 2 - 1;
  const ny = 1 - pointer.y / height;
  return {
    nx: Math.min(1, Math.max(-1, nx)),
    ny: Math.min(1, Math.max(0, ny)),
  };
}
