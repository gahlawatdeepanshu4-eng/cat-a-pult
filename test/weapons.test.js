import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON, WEAPON_ORDER, weaponOf, weaponForCampaign, weaponForSampler,
} from '../src/weapons.js';
import { allHitsSwept, withinBlast, centreOf } from '../src/creatures.js';
import { launchVelocity } from '../src/ballistics.js';
import { tick, aliveCount } from '../src/game.js';
import { SAMPLER_LEVELS, CAMPAIGN_LEVELS } from '../src/constants.js';

// A still, hand-placed creature with every field the engine touches, so tests
// stay deterministic (no wander, dodge, or jump).
function still(kind, x, z, id) {
  return {
    id: id ?? `${kind}-${x}-${z}`, kind, flying: false, alive: true,
    x, y: 0, z, dir: 1, speed: 0, vy: 0, airborne: false, dodgedThisShot: false,
  };
}

// Drive a hand-made flying run to its end. No aim/drag: the rock velocity is set
// directly so the geometry is exact.
function flyToEnd(run, rand = () => 0.99) {
  let g = run;
  let n = 0;
  while (g.phase === 'flying' && n++ < 5000) g = tick(g, 1 / 120, rand);
  return g;
}

function flyingRun(weapon, creatures, rock) {
  return {
    spec: { weapon, dodgeChance: 0, jumpChance: 0 },
    phase: 'flying', rocksLeft: 5, score: 0, rock, creatures, lastHit: null,
  };
}

// --- the weapon table ---

test('every weapon in the unlock order exists and is well-formed', () => {
  for (const name of WEAPON_ORDER) {
    const w = WEAPON[name];
    assert.ok(w, `missing weapon ${name}`);
    assert.equal(typeof w.name, 'string');
    assert.ok(w.speedScale > 0, `${name} has no launch speed`);
    assert.ok(w.gravityScale >= 0, `${name} has negative gravity`);
    assert.ok(w.blastRadius >= 0);
  }
});

test('there are five weapons and the catapult is first', () => {
  assert.equal(WEAPON_ORDER.length, 5);
  assert.equal(WEAPON_ORDER[0], 'catapult');
});

test('weaponOf falls back to the catapult for an unknown name', () => {
  assert.equal(weaponOf('nope'), WEAPON.catapult);
  assert.equal(weaponOf(undefined), WEAPON.catapult);
  assert.equal(weaponOf('bazooka'), WEAPON.bazooka);
});

// --- selection by level ---

test('campaign weapons unlock in bands, in order, covering all 50 levels', () => {
  const seen = [];
  for (let n = 1; n <= CAMPAIGN_LEVELS; n++) {
    const w = weaponForCampaign(n);
    assert.ok(WEAPON[w], `campaign L${n} picks unknown weapon ${w}`);
    if (seen[seen.length - 1] !== w) seen.push(w);
  }
  // The bands appear once each, in unlock order — never jumping around.
  assert.deepEqual(seen, WEAPON_ORDER);
});

test('the sampler plays one weapon per level, all five in order', () => {
  const picks = Array.from({ length: SAMPLER_LEVELS }, (_, i) => weaponForSampler(i + 1));
  assert.deepEqual(picks, WEAPON_ORDER);
});

// --- launch speed scaling ---

test('a higher speedScale launches proportionally faster', () => {
  const slow = launchVelocity(0, 0.4, 0.7, 1);
  const fast = launchVelocity(0, 0.4, 0.7, 2);
  assert.ok(Math.abs(fast.vz - slow.vz * 2) < 1e-6, 'vz should scale');
  assert.ok(Math.abs(fast.vy - slow.vy * 2) < 1e-6, 'vy should scale');
});

// --- pierce ---

test('allHitsSwept returns every creature on the path, firstHit only the nearest', () => {
  const line = [still('cat', 0, 500), still('cat', 0, 800), still('cat', 0, 1100)];
  const hit = allHitsSwept({ x: 0, y: 30, z: 0 }, { x: 0, y: 30, z: 1300 }, line);
  assert.equal(hit.length, 3, 'a straight sweep through all three should hit all three');

  const offset = [still('cat', 0, 500), still('cat', 600, 800)];
  const hit2 = allHitsSwept({ x: 0, y: 30, z: 0 }, { x: 0, y: 30, z: 1300 }, offset);
  assert.equal(hit2.length, 1, 'the creature off to the side is spared');
});

test('a piercing shot kills a whole line; an ordinary shot stops at the first', () => {
  const line = () => [still('cat', 0, 500), still('cat', 0, 900)];
  const rock = { x: 0, y: 30, z: 0, vx: 0, vy: 0, vz: 2000 };

  const pierced = flyToEnd(flyingRun('spearcrossbow', line(), { ...rock }));
  assert.equal(aliveCount(pierced), 0, 'the bolt should skewer both cats');

  const lobbed = flyToEnd(flyingRun('catapult', line(), { ...rock }));
  assert.equal(aliveCount(lobbed), 1, 'the rock should stop at the first cat');
});

// --- splash ---

test('withinBlast catches creatures inside the radius and spares those outside', () => {
  const cluster = [still('cat', -40, 800), still('cat', 40, 800), still('cat', 400, 800)];
  const point = centreOf(still('cat', 0, 800));
  const caught = withinBlast(point, 150, cluster);
  assert.equal(caught.length, 2, 'the two near cats are caught, the far one is not');
  assert.ok(!caught.some((c) => c.x === 400), 'the far cat survives');
});

test('withinBlast never catches a dead creature', () => {
  const dead = { ...still('cat', 0, 800), alive: false };
  assert.equal(withinBlast(centreOf(dead), 300, [dead]).length, 0);
});

test('a bazooka landing in a cluster kills all of it; a catapult kills one', () => {
  // Spread wider than a cat's hit sphere, so only the centre cat is a *direct*
  // hit — the two flanking cats can only die to splash.
  const cluster = () => [still('cat', -70, 800), still('cat', 0, 800), still('cat', 70, 800)];
  // A slight upward launch so the shot is still at cat height when it reaches
  // z=800, rather than falling short.
  const rock = { x: 0, y: 30, z: 0, vx: 0, vy: 80, vz: 2000 };

  const boom = flyToEnd(flyingRun('bazooka', cluster(), { ...rock }));
  assert.equal(aliveCount(boom), 0, 'the blast should clear the cluster');
  assert.ok(boom.lastHit.blast > 0, 'the hit reports its blast radius for the ring');
  assert.equal(boom.lastHit.kills, 3, 'all three are reported as killed');
  // Every victim's kind is listed so each can cry out — here all three cats.
  assert.deepEqual(boom.lastHit.kinds, ['cat', 'cat', 'cat']);

  const lob = flyToEnd(flyingRun('catapult', cluster(), { ...rock }));
  assert.equal(aliveCount(lob), 2, 'a lob with no splash kills only the cat it touches');
});
