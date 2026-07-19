import { launchVelocity, stepBody } from './ballistics.js';
import {
  spawn, stepAll, tryDodge, resetDodges, firstHitSwept, allHitsSwept,
  withinBlast, pointsOf, centreOf,
} from './creatures.js';
import { hitScore } from './scoring.js';
import { levelSpec } from './levels.js';
import { weaponOf } from './weapons.js';
import { GROUND_Y, SLING_Y, WALL_Z, ARENA_HALF_WIDTH, GRAVITY } from './constants.js';

// phase: 'aiming' -> 'flying' -> 'aiming' | 'cleared' | 'failed'
export function createRun(levelNumber, rand = Math.random) {
  const spec = levelSpec(levelNumber);
  if (!spec) return null;
  return createRunFromSpec(spec, rand);
}

// Split out so tests can build a run from any spec (campaign or sampler)
// without depending on which mode is active.
export function createRunFromSpec(spec, rand = Math.random) {
  const creatures = spec.roster.flatMap(({ kind, count }) =>
    Array.from({ length: count }, () =>
      spawn(kind, { flying: false, speedMult: spec.speedMult }, rand)),
  );

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
  const weapon = weaponOf(run.spec.weapon);
  const v = launchVelocity(aim.heading, aim.elevation, aim.power, weapon.speedScale);
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

// Kill a set of creatures (by id), returning the new list plus the total
// distance-scaled score. Farther kills pay more, so points and the floating
// "+N" both use the scaled value, not the flat base.
function killAll(creatures, victims) {
  const ids = new Set(victims.map((c) => c.id));
  const next = creatures.map((c) => (ids.has(c.id) ? { ...c, alive: false } : c));
  const gained = victims.reduce((sum, c) => sum + hitScore(pointsOf(c), c.z), 0);
  return { next, gained };
}

export function tick(run, dt, rand = Math.random) {
  const weapon = weaponOf(run.spec.weapon);
  const opts = { jumpChance: run.spec.jumpChance, rand };

  if (run.phase !== 'flying') {
    return { ...run, creatures: stepAll(run.creatures, dt, opts) };
  }

  const from = run.rock;
  // Each weapon feels its own gravity: low gravity is the flat bolt, full
  // gravity the floaty lob.
  const rock = stepBody(run.rock, dt, GRAVITY * weapon.gravityScale);

  // Dodge before the hit test, so a successful dodge actually saves them.
  const dodged = run.creatures.map((c) => tryDodge(c, rock, run.spec.dodgeChance, rand));
  const creatures = stepAll(dodged, dt, opts);

  // The wall is solid scenery. Its holes are painted on, so a rock that
  // reaches the wall always stops there and never passes through a hole.
  const outOfBounds = rock.y <= GROUND_Y
    || rock.z >= WALL_Z
    || Math.abs(rock.x) > ARENA_HALF_WIDTH;

  // Pierce: the shot flies THROUGH every creature on its swept path this frame,
  // killing all of them, and keeps going. It only ends when it leaves the field
  // (or clears the level), so you can skewer a whole line with one bolt.
  if (weapon.pierce) {
    const struck = allHitsSwept(from, rock, creatures);
    let out = { ...run, rock, creatures, lastHit: null };
    if (struck.length) {
      const { next, gained } = killAll(creatures, struck);
      const near = struck.reduce((b, c) => (c.z < b.z ? c : b));
      const at = centreOf(near);
      out = {
        ...out,
        creatures: next,
        score: run.score + gained,
        // `kinds` lists every creature the shot struck, so the audio can voice
        // each one's pain cry — a skewered line yowls all the way down.
        lastHit: {
          kind: near.kind, points: gained, x: at.x, y: at.y, z: at.z,
          kills: struck.length, kinds: struck.map((c) => c.kind),
        },
      };
    }
    if (out.creatures.every((c) => !c.alive) || outOfBounds) {
      return settle({ ...out, rock: null });
    }
    return out;
  }

  // Splash: the shell ends on first contact — a creature, or the ground/wall it
  // lands on — and explodes, killing everything within its blast of that point.
  // Landing among a cluster is enough; you stop needing a pixel-perfect hit.
  if (weapon.blastRadius > 0) {
    const direct = firstHitSwept(from, rock, creatures);
    if (direct || outOfBounds) {
      const impact = direct
        ? centreOf(direct)
        : { x: rock.x, y: Math.max(rock.y, GROUND_Y), z: Math.min(rock.z, WALL_Z) };
      const caught = withinBlast(impact, weapon.blastRadius, creatures);
      const { next, gained } = killAll(creatures, caught);
      const lastHit = caught.length
        ? {
            kind: (direct ?? caught[0]).kind, points: gained,
            x: impact.x, y: impact.y, z: impact.z,
            kills: caught.length, blast: weapon.blastRadius,
            kinds: caught.map((c) => c.kind),
          }
        : null;
      return settle({ ...run, rock: null, creatures: next, score: run.score + gained, lastHit });
    }
    return { ...run, rock, creatures };
  }

  // Ordinary weapons: the first creature on the swept path stops the shot.
  // Sweeping matters — a full-power rock outruns its own hit sphere in one
  // frame, so checking only where it landed would step over an animal.
  const struck = firstHitSwept(from, rock, creatures);
  if (struck) {
    const { next, gained } = killAll(creatures, [struck]);
    const at = centreOf(struck);
    return settle({
      ...run,
      rock: null,
      creatures: next,
      score: run.score + gained,
      lastHit: { kind: struck.kind, points: gained, x: at.x, y: at.y, z: at.z, kinds: [struck.kind] },
    });
  }

  if (outOfBounds) return settle({ ...run, rock: null, creatures });

  return { ...run, rock, creatures };
}

function settle(run) {
  if (run.creatures.every((c) => !c.alive)) return { ...run, phase: 'cleared' };
  if (run.rocksLeft <= 0) return { ...run, phase: 'failed' };
  return { ...run, phase: 'aiming' };
}
