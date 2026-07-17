// Level definitions are data. Adding a sixth level means appending here and
// changing nothing else. Catapult sits at x=200; a full-power 45-degree shot
// lands around x=2460.
export const LEVELS = [
  {
    id: 1,
    name: 'First Toss',
    shots: 5,
    zone: { x: 1000, width: 400 },
    movingTarget: null,
    bounds: { maxX: 2200 },
  },
  {
    id: 2,
    name: 'Long Shot',
    shots: 5,
    zone: { x: 1600, width: 300 },
    movingTarget: null,
    bounds: { maxX: 2600 },
  },
  {
    id: 3,
    name: 'Something Moves',
    shots: 4,
    zone: { x: 1400, width: 300 },
    movingTarget: { y: 320, xMin: 800, xMax: 1300, speed: 220 },
    bounds: { maxX: 2400 },
  },
  {
    id: 4,
    name: 'Threading It',
    shots: 4,
    zone: { x: 1900, width: 220 },
    movingTarget: { y: 380, xMin: 1100, xMax: 1700, speed: 300 },
    bounds: { maxX: 2800 },
  },
  {
    id: 5,
    name: 'The Far Ledge',
    shots: 3,
    zone: { x: 2150, width: 160 },
    movingTarget: { y: 420, xMin: 1300, xMax: 2000, speed: 420 },
    bounds: { maxX: 3000 },
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
