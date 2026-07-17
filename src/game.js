import { launchVelocity, stepBody } from './ballistics.js';
import {
  spawn, stepAll, tryDodge, resetDodges, firstHitSwept, pointsOf, centreOf,
} from './creatures.js';
import { levelSpec } from './levels.js';
import { GROUND_Y, SLING_Y, WALL_Z, ARENA_HALF_WIDTH } from './constants.js';

// phase: 'aiming' -> 'flying' -> 'aiming' | 'cleared' | 'failed'
export function createRun(levelNumber, rand = Math.random) {
  const spec = levelSpec(levelNumber);
  if (!spec) return null;

  const creatures = [
    ...Array.from({ length: spec.groundCats }, () => spawn('cat', { flying: false }, rand)),
    ...Array.from({ length: spec.groundTrexes }, () => spawn('trex', { flying: false }, rand)),
  ];

  return {
    spec,
    phase: 'aiming',
    rocksLeft: spec.rocks,
    score: 0,
    rock: null,
    creatures,
    lastHit: null,
  };
}

export function fire(run, aim, rand = Math.random) {
  if (run.phase !== 'aiming' || !aim) return run;
  const v = launchVelocity(aim.heading, aim.elevation, aim.power);
  return {
    ...run,
    phase: 'flying',
    rocksLeft: run.rocksLeft - 1,
    rock: { x: 0, y: SLING_Y, z: 0, ...v },
    creatures: resetDodges(run.creatures),
    lastHit: null,
  };
}

export function aliveCount(run) {
  return run.creatures.filter((c) => c.alive).length;
}

export function tick(run, dt, rand = Math.random) {
  const opts = { jumpChance: run.spec.jumpChance, rand };

  if (run.phase !== 'flying') {
    return { ...run, creatures: stepAll(run.creatures, dt, opts) };
  }

  const from = run.rock;
  const rock = stepBody(run.rock, dt);

  // Dodge before the hit test, so a successful dodge actually saves them.
  const dodged = run.creatures.map((c) => tryDodge(c, rock, run.spec.dodgeChance, rand));
  const creatures = stepAll(dodged, dt, opts);

  // Sweep the whole path travelled this frame. Checking only where the rock
  // landed lets a fast rock skip straight over an animal.
  const struck = firstHitSwept(from, rock, creatures);
  if (struck) {
    const after = creatures.map((c) => (c.id === struck.id ? { ...c, alive: false } : c));
    const at = centreOf(struck);
    return settle({
      ...run,
      rock: null,
      creatures: after,
      score: run.score + pointsOf(struck),
      lastHit: { kind: struck.kind, points: pointsOf(struck), x: at.x, y: at.y, z: at.z },
    });
  }

  // The wall is solid scenery. Its holes are painted on, so a rock that
  // reaches the wall always stops there and never passes through a hole.
  const missed = rock.y <= GROUND_Y
    || rock.z >= WALL_Z
    || Math.abs(rock.x) > ARENA_HALF_WIDTH;

  if (missed) return settle({ ...run, rock: null, creatures });

  return { ...run, rock, creatures };
}

function settle(run) {
  if (run.creatures.every((c) => !c.alive)) return { ...run, phase: 'cleared' };
  if (run.rocksLeft <= 0) return { ...run, phase: 'failed' };
  return { ...run, phase: 'aiming' };
}
