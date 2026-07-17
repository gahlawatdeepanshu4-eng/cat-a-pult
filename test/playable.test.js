import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, launch, tick, resolveShot } from '../src/level.js';
import { LEVELS } from '../src/levels.js';

// Fly a single shot to its conclusion using the real physics and rules.
function playShot(def, angle, power) {
  let run = launch(createRun(def), { angle, power });
  let guard = 0;
  while (run.phase === 'flying' && guard++ < 100000) run = tick(run, 1 / 60);
  return resolveShot(run);
}

// Sweep angle and power looking for anything that lands in the zone. If no
// combination exists the level is unwinnable, which no amount of unit testing
// on the pieces would reveal.
function findWinningShot(def) {
  for (let deg = 5; deg <= 85; deg += 1) {
    for (let power = 0.2; power <= 1.0001; power += 0.01) {
      const run = playShot(def, (deg * Math.PI) / 180, Math.min(power, 1));
      if (run.cleared) return { deg, power: +power.toFixed(2), score: run.score };
    }
  }
  return null;
}

for (const def of LEVELS) {
  test(`level ${def.id} (${def.name}) can actually be cleared`, () => {
    const win = findWinningShot(def);
    assert.ok(win, `no angle/power combination clears level ${def.id}`);
  });
}

test('every level can be cleared on the first shot, so no level is a guaranteed fail', () => {
  for (const def of LEVELS) {
    const win = findWinningShot(def);
    assert.ok(win.power <= 1, `level ${def.id} needs impossible power`);
  }
});

test('a shot that falls far short does not clear the level', () => {
  const run = playShot(LEVELS[0], Math.PI / 4, 0.05);
  assert.equal(run.cleared, false);
});

test('the moving target on level 3 is reachable by some shot', () => {
  const def = LEVELS.find((l) => l.movingTarget);
  let hit = false;
  for (let deg = 5; deg <= 85 && !hit; deg += 1) {
    for (let power = 0.2; power <= 1.0001 && !hit; power += 0.02) {
      const run = playShot(def, (deg * Math.PI) / 180, Math.min(power, 1));
      if (run.targetHit) hit = true;
    }
  }
  assert.ok(hit, 'no shot can ever hit the moving target');
});
