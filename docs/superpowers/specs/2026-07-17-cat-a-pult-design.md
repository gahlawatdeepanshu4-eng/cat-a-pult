# Cat-a-pult — Design

**Date:** 2026-07-17 (third pass)
**Status:** Current

## History, and why it matters

Two earlier designs were wrong and are abandoned:

1. **Side-on trajectory game.** Designed from a one-line verbal description.
   Angry-Birds-style scrolling camera, land the cat in a ground zone. Nothing
   like the real game.
2. **Fixed-view, cats-through-holes.** Designed from reference footage. Right
   shape, but two fatal aiming flaws (below) and it was not the game wanted.

The lesson recorded here so it is not repeated: this version's aiming is the
one thing that must be verified by playing before anything is built on top.

### The bugs that killed v2

- **A tap did nothing.** Power charged over 1.1s while held. Any tap under
  ~0.3s left the rock so slow it fell in the sand. Measured: 0.05s hold
  reached z=336 of the 800 needed.
- **You could not aim before committing.** `pointermove` only fires while the
  finger is already down, so touching the screen started the power charge
  immediately. Aim and power were welded to the same gesture and the same
  clock — taking time to aim forced power to full.

Drag-to-aim fixes both: one gesture carries direction *and* power, with no
clock running.

## Summary

A fixed forward view of an arena. Cats and mini T-rexes roam the sand in front
of a stone wall. You pull back a slingshot and fling a rock at them. Hit a cat
for 20, a T-rex for 50. Twenty levels; each one the creatures get better at
dodging, and later they jump and fly.

## Controls

**Drag to aim, Angry Birds style.** Press anywhere, drag *back* from the
direction you want to fire, release to loose the rock.

- **Drag direction** sets aim. Pulling back-and-down fires forward-and-up.
  Horizontal drag sets heading (left/right), vertical drag sets elevation.
- **Drag length** sets power, clamped at full.
- **No timer.** Take as long as you like. Releasing under a minimum drag
  cancels rather than firing a dud.
- While dragging, a **ghost arc** previews the shot.

## World

Same pseudo-3D as before, which worked and is kept:

- **x** left/right, 0 at centre; **y** up, 0 at sand; **z** depth into screen.
- Gravity acts on y only.
- Pinhole projection: `scale = FOCAL / (z + FOCAL)`. Distant things shrink.
  `project.js` is the only module that knows this.
- The wall stands at `WALL_Z` as a **backdrop**. Its holes are decoration and
  score nothing. A rock reaching the wall is a miss.

## Creatures

| Kind | Points | Size |
|---|---|---|
| Cat | 20 | small |
| Mini T-rex | 50 | larger, slower |

Each creature wanders left and right along the sand at its own speed, turning
at the arena edge.

**Dodging.** While a rock is in flight, a creature that is threatened (the
rock will pass near it) rolls once against the level's `dodgeChance`. On a
success it leaps sideways, away from the rock's path. One dodge attempt per
creature per shot: it cannot dodge forever.

**Jumping** (level 2+). Idle creatures hop on their own, on a per-creature
timer. A jumping creature is harder to hit low and easier to hit high.

**Flying** (level 4+). Two flying cats and two flying T-rexes per level.
They hold an altitude and drift, so they need elevation rather than a flat
shot.

## Levels

Twenty levels, generated from the level number rather than hand-written, so
the curve is a formula that can be tuned in one place:

- `dodgeChance` climbs from 0 at level 1 toward a cap. Never 1: a target that
  always dodges is unhittable.
- `canJump` from level 2.
- T-rexes appear from level 2, increasing with level.
- Flying creatures from level 4: 2 flying cats and 2 flying T-rexes.
- Rocks per level are finite.

**Clear** a level by hitting every creature before the rocks run out.
**Fail** and the level restarts with a fresh set of rocks. No lives, no game
over. Clearing unlocks the next level; progress persists.

Every level must be **provably clearable**: enough rocks to kill every
creature, and every creature reachable. This is a test, not a hope.

## Modules

| Module | Responsibility |
|---|---|
| `constants.js` | Tuning and arena geometry |
| `ballistics.js` | Pure 3D projectile maths |
| `project.js` | Pure world→screen projection |
| `aim.js` | Pure: drag vector → `{heading, elevation, power}` |
| `creatures.js` | Spawn, wander, jump, fly, dodge, hit tests |
| `levels.js` | The 20-level curve, as data derived from a formula |
| `game.js` | Rules: fire, resolve, score, clear/fail |
| `input.js` | Pointer drag capture only |
| `render.js` | All drawing. Reads state, never writes |
| `storage.js` | Progress and best score |
| `main.js` | Boot, loop, wiring |

`aim.js` is split out from `input.js` precisely so the ghost arc and the real
shot share one calculation and cannot drift apart.

## Testing

Unit tested in Node, no browser:

- Aim: drag back-and-down fires forward-and-up; power scales with drag length;
  a tiny drag cancels; aim clamps so you cannot fire behind yourself.
- Ballistics: trajectory, no mutation.
- Creatures: wander stays in bounds, dodge fires at most once per shot, a
  dodge chance of 0 never dodges and 1 always does, hit tests at the edges.
- Levels: 20 of them, the difficulty curve is monotonic, dodge never reaches
  1, flying only from level 4, T-rexes only from level 2.
- Game: score by kind, ammo decrement, clear on last creature, fail at zero
  rocks.
- **Playability, per level:** enough rocks to clear it, and every creature
  hittable by some drag.
- Storage: validation, corrupt data, throwing storage.

Feel is verified by playing. Nothing gets built on top of the aiming until it
is confirmed.

## Non-goals

- Blood and gore.
- Audio.
- Backend, accounts, leaderboards.
- iOS-specific workarounds.
