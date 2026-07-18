import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, fire, tick, aliveCount } from '../src/game.js';
import { aimFromDrag } from '../src/aim.js';
import { levelSpec } from '../src/levels.js';
import { CAT_POINTS, TREX_POINTS, TOTAL_LEVELS, MAX_DRAG_FRACTION } from '../src/constants.js';

const H = 720;
const seeded = (seed = 1) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

function flyToEnd(run, rand) {
  let g = run;
  let n = 0;
  while (g.phase === 'flying' && n++ < 40000) g = tick(g, 1 / 120, rand);
  return g;
}

test('a run starts aiming with the level rocks and nothing scored', () => {
  const run = createRun(1, seeded());
  assert.equal(run.phase, 'aiming');
  assert.equal(run.rocksLeft, levelSpec(1).rocks);
  assert.equal(run.score, 0);
  assert.equal(aliveCount(run), levelSpec(1).targets);
});

test('createRun refuses a level outside the range', () => {
  assert.equal(createRun(0, seeded()), null);
  assert.equal(createRun(TOTAL_LEVELS + 1, seeded()), null);
});

test('firing spends a rock and puts one in the air', () => {
  const aim = aimFromDrag(0, H * MAX_DRAG_FRACTION * 0.6, H);
  const run = fire(createRun(1, seeded()), aim);
  assert.equal(run.phase, 'flying');
  assert.equal(run.rocksLeft, levelSpec(1).rocks - 1);
  assert.ok(run.rock);
});

test('a cancelled drag does not fire or cost a rock', () => {
  const run = createRun(1, seeded());
  assert.equal(fire(run, null).rocksLeft, run.rocksLeft);
  assert.equal(fire(run, null).phase, 'aiming');
});

test('you cannot fire a second rock while one is in the air', () => {
  const aim = aimFromDrag(0, H * MAX_DRAG_FRACTION * 0.6, H);
  const flying = fire(createRun(1, seeded()), aim);
  assert.equal(fire(flying, aim).rocksLeft, flying.rocksLeft);
});

test('a shot always terminates rather than flying forever', () => {
  const rand = seeded();
  const g = flyToEnd(fire(createRun(1, rand), aimFromDrag(0, H * 0.2, H)), rand);
  assert.notEqual(g.phase, 'flying');
});

// Park a single, still creature dead ahead where a real drag is known to put
// the rock, then take that shot. Uses the actual aim path rather than a
// hand-made velocity, so it cannot pass while the real controls are broken.
const STRAIGHT_DRAG = { dx: 0, dy: 60 }; // lands around z=595, dead centre

function killOne(kind) {
  const rand = seeded();
  const base = createRun(1, rand);
  const target = {
    ...base.creatures[0],
    kind, flying: false, x: 0, y: 0, z: 560,
    alive: true, speed: 0, dodgedThisShot: false,
  };
  const run = {
    ...base,
    creatures: [target],
    spec: { ...base.spec, dodgeChance: 0, jumpChance: 0 },
    rocksLeft: 5,
  };
  const aim = aimFromDrag(STRAIGHT_DRAG.dx, STRAIGHT_DRAG.dy, H);
  return flyToEnd(fire(run, aim), rand);
}

test('a cat is worth 20 and a T-rex is worth 50', () => {
  assert.equal(killOne('cat').score, CAT_POINTS);
  assert.equal(killOne('trex').score, TREX_POINTS);
});

test('killing the last creature clears the level', () => {
  assert.equal(killOne('cat').phase, 'cleared');
  assert.equal(aliveCount(killOne('cat')), 0);
});

test('running out of rocks with creatures alive fails the level', () => {
  const rand = seeded();
  let run = createRun(1, rand);
  run = { ...run, rocksLeft: 1 };
  run = fire(run, aimFromDrag(0, 20, H)); // a weak shot that will miss
  run = flyToEnd(run, rand);
  assert.equal(run.phase, 'failed');
  assert.ok(aliveCount(run) > 0);
});

test('a hit is reported so the game can show the points', () => {
  const g = killOne('trex');
  assert.equal(g.lastHit.kind, 'trex');
  assert.equal(g.lastHit.points, TREX_POINTS);
});

test('creatures keep moving while a rock is in the air', () => {
  const rand = seeded();
  let run = fire(createRun(5, rand), aimFromDrag(0, H * 0.2, H));
  const before = run.creatures.map((c) => c.x);
  run = tick(run, 0.3, rand);
  assert.notDeepEqual(run.creatures.map((c) => c.x), before);
});

test('tick does not mutate the run passed in', () => {
  const rand = seeded();
  const run = fire(createRun(1, rand), aimFromDrag(0, H * 0.2, H));
  const z = run.rock.z;
  tick(run, 1 / 60, rand);
  assert.equal(run.rock.z, z);
});

// The load-bearing test. Dodging, jumping and flying stack as levels rise; a
// level where some creature can never be hit is unwinnable and nothing above
// would reveal it.
function canKillEvery(levelNumber) {
  const rand = seeded(levelNumber * 7 + 3);
  const base = createRun(levelNumber, rand);
  const unreachable = [];

  for (const creature of base.creatures) {
    let killed = false;
    // Dodging is disabled here on purpose: this asks whether the geometry
    // allows a hit at all, not whether you get lucky against a dodge roll.
    const solo = {
      ...base,
      creatures: [{ ...creature, dodgedThisShot: false }],
      spec: { ...base.spec, dodgeChance: 0, jumpChance: 0 },
    };
    // Fine enough that the step between neighbouring shots is smaller than a
    // creature. A coarse sweep steps straight over targets and reports a
    // reachable creature as unreachable.
    for (let dx = -240; dx <= 240 && !killed; dx += 4) {
      for (let dy = 8; dy <= 240 && !killed; dy += 3) {
        const aim = aimFromDrag(dx, dy, H);
        if (!aim) continue;
        const g = flyToEnd(fire({ ...solo, rocksLeft: 9 }, aim), () => 0.99);
        if (aliveCount(g) === 0) killed = true;
      }
    }
    if (!killed) unreachable.push(`${creature.kind}${creature.flying ? ' (flying)' : ''} at x=${Math.round(creature.x)} y=${Math.round(creature.y)} z=${Math.round(creature.z)}`);
  }
  return unreachable;
}

for (let n = 1; n <= TOTAL_LEVELS; n++) {
  test(`level ${n}: every creature can actually be hit`, () => {
    const unreachable = canKillEvery(n);
    assert.deepEqual(unreachable, [], `level ${n} has unhittable creatures: ${unreachable.join('; ')}`);
  });
}
