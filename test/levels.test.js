import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignSpec, samplerSpec, LEVELS } from '../src/levels.js';
import { WEAPON } from '../src/weapons.js';
import {
  FIRST_JUMP_LEVEL, FIRST_TREX_LEVEL, MAX_JUMP_CHANCE, MAX_DODGE_CHANCE,
  MAX_SPEED_MULT, CAMPAIGN_LEVELS, SAMPLER_LEVELS, TOTAL_LEVELS,
} from '../src/constants.js';

const KINDS = ['cat', 'trex', 'catrex', 'frogrex', 'bunnyrex', 'pigrex', 'ducktrex'];
const countOf = (spec, kind) => spec.roster.find((r) => r.kind === kind)?.count ?? 0;

const CAMPAIGN = Array.from({ length: CAMPAIGN_LEVELS }, (_, i) => campaignSpec(i + 1));
const SAMPLER = Array.from({ length: SAMPLER_LEVELS }, (_, i) => samplerSpec(i + 1));

// Shared shape checks that must hold for any generated level set.
function assertWellFormed(levels, label) {
  for (const l of levels) {
    let sum = 0;
    for (const r of l.roster) {
      assert.ok(KINDS.includes(r.kind), `${label} L${l.n}: unknown kind ${r.kind}`);
      assert.ok(r.count > 0, `${label} L${l.n}: ${r.kind} listed with no count`);
      sum += r.count;
    }
    assert.equal(sum, l.targets, `${label} L${l.n}: targets do not match roster`);
    assert.ok(l.targets >= 1, `${label} L${l.n}: nothing to shoot`);
    assert.ok(l.dodgeChance < 1, `${label} L${l.n}: dodge ${l.dodgeChance} is unwinnable`);
    assert.ok(l.rocks > l.targets, `${label} L${l.n}: ${l.rocks} rocks <= ${l.targets} targets`);
    assert.ok(l.rocks - l.targets >= 3, `${label} L${l.n}: slack only ${l.rocks - l.targets}`);
    assert.ok(WEAPON[l.weapon], `${label} L${l.n}: unknown weapon ${l.weapon}`);
    assert.equal(l.flyingCats, undefined, `${label} L${l.n}: still has flying fields`);
  }
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i].targets >= levels[i - 1].targets, `${label}: targets shrank at L${i + 1}`);
    assert.ok(levels[i].dodgeChance >= levels[i - 1].dodgeChance, `${label}: dodge eased at L${i + 1}`);
    assert.ok(levels[i].jumpChance >= levels[i - 1].jumpChance, `${label}: jump eased at L${i + 1}`);
    assert.ok(levels[i].speedMult >= levels[i - 1].speedMult, `${label}: speed dropped at L${i + 1}`);
  }
}

// --- the full 50-level campaign ---

test('campaign has fifty levels, numbered in order', () => {
  assert.deepEqual(CAMPAIGN.map((l) => l.n), Array.from({ length: CAMPAIGN_LEVELS }, (_, i) => i + 1));
});

test('campaignSpec refuses levels outside its range', () => {
  assert.equal(campaignSpec(0), null);
  assert.equal(campaignSpec(CAMPAIGN_LEVELS + 1), null);
});

test('campaign is well-formed and its curves only get harder', () => {
  assertWellFormed(CAMPAIGN, 'campaign');
});

test('campaign difficulty spans the full range end to end', () => {
  assert.equal(CAMPAIGN[0].dodgeChance, 0);
  assert.equal(CAMPAIGN[0].jumpChance, 0);
  assert.equal(CAMPAIGN[0].speedMult, 1);
  assert.equal(CAMPAIGN[CAMPAIGN_LEVELS - 1].dodgeChance, MAX_DODGE_CHANCE);
  assert.equal(CAMPAIGN[CAMPAIGN_LEVELS - 1].speedMult, MAX_SPEED_MULT);
  for (const l of CAMPAIGN) assert.ok(l.jumpChance <= MAX_JUMP_CHANCE);
});

test('jumping starts at the second level, not the first', () => {
  assert.equal(campaignSpec(1).jumpChance, 0);
  assert.ok(campaignSpec(FIRST_JUMP_LEVEL).jumpChance > 0);
});

test('each creature kind first appears on its scheduled campaign level', () => {
  const firstLevel = {
    cat: 1, trex: FIRST_TREX_LEVEL, catrex: 8, frogrex: 15,
    bunnyrex: 22, pigrex: 29, ducktrex: 36,
  };
  for (const [kind, from] of Object.entries(firstLevel)) {
    if (from > 1) assert.equal(countOf(campaignSpec(from - 1), kind), 0, `${kind} appeared too early`);
    assert.ok(countOf(campaignSpec(from), kind) >= 1, `${kind} missing at level ${from}`);
  }
});

// --- the 5-level sampler ---

test('sampler has five levels', () => {
  assert.equal(SAMPLER.length, SAMPLER_LEVELS);
  assert.equal(samplerSpec(0), null);
  assert.equal(samplerSpec(SAMPLER_LEVELS + 1), null);
});

test('sampler is well-formed and its curves only get harder', () => {
  assertWellFormed(SAMPLER, 'sampler');
});

test('every creature kind is seen somewhere across the five sampler levels', () => {
  for (const kind of KINDS) {
    const seen = SAMPLER.some((l) => countOf(l, kind) > 0);
    assert.ok(seen, `${kind} never appears in the sampler`);
  }
});

test('the last sampler level fields all seven kinds at once', () => {
  for (const kind of KINDS) {
    assert.ok(countOf(samplerSpec(SAMPLER_LEVELS), kind) >= 1, `${kind} missing from the finale`);
  }
});

test('the sampler reaches full difficulty by its last level', () => {
  const last = samplerSpec(SAMPLER_LEVELS);
  assert.equal(last.dodgeChance, MAX_DODGE_CHANCE);
  assert.equal(last.jumpChance, MAX_JUMP_CHANCE);
  assert.equal(last.speedMult, MAX_SPEED_MULT);
});

// --- the active mode ---

test('the active level set matches TOTAL_LEVELS', () => {
  assert.equal(LEVELS.length, TOTAL_LEVELS);
});
