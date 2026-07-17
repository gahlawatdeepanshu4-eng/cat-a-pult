import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, aimFrom, beginCharge, tickCharge, release, tick,
} from '../src/game.js';
import { HOLES } from '../src/arena.js';
import {
  STARTING_CATS, POINTS_PER_HOLE, MAX_HEADING, MIN_ELEVATION, MAX_ELEVATION, WALL_Z,
} from '../src/constants.js';

const steadyRand = () => {
  let seed = 1;
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
};

// Fly a shot to its conclusion through the real rules.
function shoot(game, aim, power) {
  let g = beginCharge(game);
  g = tickCharge(g, power * 1.1); // CHARGE_SECONDS
  g = release(g, aim);
  let guard = 0;
  while (g.phase === 'flying' && guard++ < 100000) g = tick(g, 1 / 240);
  return g;
}

test('a new game starts aiming with a full pouch and no score', () => {
  const g = createGame(steadyRand());
  assert.equal(g.phase, 'aiming');
  assert.equal(g.catsLeft, STARTING_CATS);
  assert.equal(g.score, 0);
});

test('aim maps the crosshair to heading and elevation', () => {
  assert.equal(aimFrom(0, 0).heading, 0);
  assert.ok(aimFrom(1, 0).heading > 0);
  assert.ok(aimFrom(-1, 0).heading < 0);
});

test('aim is clamped so the cat cannot be fired behind the player', () => {
  assert.equal(aimFrom(50, 0).heading, MAX_HEADING);
  assert.equal(aimFrom(-50, 0).heading, -MAX_HEADING);
});

test('elevation stays within its limits', () => {
  assert.equal(aimFrom(0, -9).elevation, MIN_ELEVATION);
  assert.equal(aimFrom(0, 9).elevation, MAX_ELEVATION);
});

test('charging only starts from aiming', () => {
  const g = createGame(steadyRand());
  assert.equal(beginCharge(g).phase, 'charging');
  assert.equal(beginCharge(beginCharge(g)).phase, 'charging');
});

test('releasing spends a cat and starts the flight', () => {
  let g = beginCharge(createGame(steadyRand()));
  g = tickCharge(g, 0.5);
  g = release(g, aimFrom(0, 0.5));
  assert.equal(g.phase, 'flying');
  assert.equal(g.catsLeft, STARTING_CATS - 1);
  assert.ok(g.cat);
});

test('releasing without charging does nothing', () => {
  const g = createGame(steadyRand());
  assert.equal(release(g, aimFrom(0, 0.5)).catsLeft, STARTING_CATS);
});

test('a shot always terminates rather than flying forever', () => {
  const g = shoot(createGame(steadyRand()), aimFrom(0, 0.5), 1);
  assert.notEqual(g.phase, 'flying');
  assert.ok(g.lastShot);
});

test('a shot that dribbles into the sand scores nothing', () => {
  const g = shoot(createGame(steadyRand()), aimFrom(0, 0), 0);
  assert.equal(g.lastShot.result, 'sand');
  assert.equal(g.score, 0);
});

test('hitting stone between the holes scores nothing', () => {
  const g = createGame(steadyRand());
  let found = null;
  for (let ny = 0; ny <= 1 && !found; ny += 0.05) {
    for (let p = 0; p <= 1 && !found; p += 0.05) {
      const r = shoot(g, aimFrom(0, ny), p);
      if (r.lastShot.result === 'wall') found = r;
    }
  }
  assert.ok(found, 'expected some shot to hit stone');
  assert.equal(found.score, 0);
});

// Guards the tuning. If someone changes gravity, speed, or the wall depth and
// the aim space collapses, this fails loudly instead of quietly shipping a
// game where power does not matter.
test('the aim range is live: falling short and reaching the wall are both common', () => {
  const g = createGame(steadyRand());
  const tally = { hole: 0, wall: 0, sand: 0, wide: 0 };
  let total = 0;
  for (let nx = -1; nx <= 1.0001; nx += 0.2) {
    for (let ny = 0; ny <= 1.0001; ny += 0.1) {
      for (let p = 0; p <= 1.0001; p += 0.1) {
        tally[shoot(g, aimFrom(nx, ny), p).lastShot.result]++;
        total++;
      }
    }
  }
  const pct = (n) => (n / total) * 100;
  assert.ok(pct(tally.sand) < 65, `too many shots fall short: ${pct(tally.sand).toFixed(1)}%`);
  assert.ok(pct(tally.sand) > 10, `falling short should be a real risk: ${pct(tally.sand).toFixed(1)}%`);
  assert.ok(pct(tally.hole) > 4, `scoring is too hard: ${pct(tally.hole).toFixed(1)}%`);
});

test('upper holes demand more power than lower ones, so the rows differ', () => {
  const g = createGame(steadyRand());
  const minPower = (row) => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      for (let nx = -1; nx <= 1.0001; nx += 0.1) {
        for (let ny = 0; ny <= 1.0001; ny += 0.05) {
          const r = shoot(g, aimFrom(nx, ny), p);
          if (r.lastShot.result === 'hole'
            && HOLES.find((h) => h.id === r.lastShot.holeId).row === row) return p;
        }
      }
    }
    return null;
  };
  const lower = minPower('lower');
  const upper = minPower('upper');
  assert.ok(lower !== null && upper !== null, 'both rows must be reachable');
  assert.ok(upper > lower, `upper (${upper}) should need more power than lower (${lower})`);
});

test('the run ends when the last cat is spent', () => {
  let g = createGame(steadyRand());
  for (let i = 0; i < STARTING_CATS; i++) g = shoot(g, aimFrom(0, 0.5), 0.5);
  assert.equal(g.catsLeft, 0);
  assert.equal(g.phase, 'over');
});

test('strays keep wandering while the cat is in the air', () => {
  let g = beginCharge(createGame(steadyRand()));
  g = tickCharge(g, 0.5);
  g = release(g, aimFrom(0, 0.5));
  const before = g.strays.map((s) => s.x);
  g = tick(g, 0.5);
  assert.notDeepEqual(g.strays.map((s) => s.x), before);
});

test('tick does not mutate the game passed in', () => {
  let g = beginCharge(createGame(steadyRand()));
  g = tickCharge(g, 0.5);
  g = release(g, aimFrom(0, 0.5));
  const z = g.cat.z;
  tick(g, 1 / 60);
  assert.equal(g.cat.z, z);
});

// The load-bearing test. Holes are hand-placed in 3D; one that no shot can
// reach is a dead target, and nothing above would reveal it.
//
// A cat's x where it meets the wall is exactly tan(heading) * WALL_Z, so the
// heading a hole needs is solvable rather than searchable. Only elevation and
// power get swept, which keeps this fast and pins failures on the real cause.
function canHit(holeId) {
  const hole = HOLES.find((h) => h.id === holeId);
  const nx = Math.atan(hole.x / WALL_Z) / MAX_HEADING;
  if (Math.abs(nx) > 1) return null; // hole sits outside what heading can reach
  const g = createGame(steadyRand());
  for (let ny = 0; ny <= 1.0001; ny += 0.01) {
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const r = shoot(g, aimFrom(nx, ny), p);
      if (r.lastShot.result === 'hole' && r.lastShot.holeId === holeId) {
        return { nx: +nx.toFixed(2), ny: +ny.toFixed(2), power: +p.toFixed(2) };
      }
    }
  }
  return null;
}

test('every hole sits within the heading limit, so none is geometrically stranded', () => {
  for (const h of HOLES) {
    const needed = Math.abs(Math.atan(h.x / WALL_Z));
    assert.ok(needed <= MAX_HEADING,
      `hole ${h.id} at x=${h.x} needs heading ${needed.toFixed(2)} but the limit is ${MAX_HEADING}`);
  }
});

for (const hole of HOLES) {
  test(`hole ${hole.id} (${hole.row}) can actually be hit`, () => {
    assert.ok(canHit(hole.id), `no aim and power combination reaches hole ${hole.id}`);
  });
}

test('a cat through a hole scores exactly the hole value', () => {
  const shot = canHit('l2');
  const g = shoot(createGame(steadyRand()), aimFrom(shot.nx, shot.ny), shot.power);
  assert.equal(g.score, POINTS_PER_HOLE);
});
