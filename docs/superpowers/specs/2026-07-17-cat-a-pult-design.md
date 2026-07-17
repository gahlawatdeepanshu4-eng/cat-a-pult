# Cat-a-pult — Design

**Date:** 2026-07-17 (rewritten after reference footage arrived)
**Status:** Approved in outline, superseded v1's side-on design

## What happened to v1

The first version of this spec described a side-on, Angry-Birds-style
trajectory game: camera scrolling left to right, drag-to-launch, land the cat
in a target zone on the ground. That was designed from a one-line verbal
description and it was wrong. Reference footage of the original game showed a
completely different shape of game. v1 is abandoned, not patched — the
difference is in the foundation, not the details.

The v1 code remains in git history. Nothing below reuses its physics, camera,
levels, or rendering.

## Summary

A single-player game. You stand behind a slingshot facing an arena wall
pierced with holes. A cat sits in the sling. Aim with a crosshair, hold to
charge power, release to fling the cat into the screen at the wall. Get it
through a hole to score. You have a limited number of cats.

## Reference

Rebuilt from footage of the original Flash game. Observed directly in the
frames:

- Fixed, forward-facing view. The camera never moves.
- An arena wall across the back with **7 holes**: 3 round holes on an upper
  row, 4 arched holes on a lower row.
- A Y-shaped slingshot at bottom-centre with a cat loaded in the pouch.
- A crosshair reticle that moves with the pointer.
- A vertical **power meter** on the left, filling green → orange → red while
  charging.
- A cat-icon **ammo counter** top-right, counting down (10 → 9 → 8 → 7).
- A **score** readout, rising in steps of **20**.
- Cats wandering loose on the arena floor between the player and the wall.

## Goals

- Reproduce the feel of the original: aim, charge, fling, watch it recede.
- Runs on an Android phone, installable, offline.

## Non-goals

- Multiplayer, accounts, leaderboards, backend.
- iOS support. Chrome on Android only.
- Audio in v1.
- Blood and gore. The original has heavy blood splatter; this version leaves
  it out unless asked for.
- Real 3D. A pseudo-3D projection is enough and much simpler.

## Platform

- **Orientation:** landscape, locked. The reference footage is a landscape
  game letterboxed inside a portrait phone recording, so landscape stands.
- **Stack:** HTML5 Canvas, vanilla JS, no framework, no build step, no deps.
- **Distribution:** static files, installable PWA.

## Core gameplay loop

A cat sits in the slingshot at bottom-centre. The player's pointer drives a
**crosshair**, which sets aim: horizontal position sets left/right direction,
vertical position sets elevation. **Press and hold** to charge the power
meter; **release** to fire.

The cat flies *into the screen*, away from the camera, under gravity. As it
recedes it is drawn smaller. When it reaches the wall's depth one of three
things happens:

- It passes through a **hole** → score **+20**, cat is gone.
- It hits the **wall** → no score, cat drops.
- It falls short and lands on the sand before reaching the wall → no score.

Either way the shot ends, ammo decrements, and the next cat loads.

**Run ends** when ammo reaches zero. Final score is shown; the player can
restart.

Ammo starts at **10 cats**. There are no levels and no lives — one continuous
run against a score, matching the reference.

## Coordinate system

World space is 3D and right-handed from the player's point of view:

- **x** — left/right, 0 at the arena centre, positive right.
- **y** — up/down, 0 at the sand, positive up.
- **z** — depth, 0 at the slingshot, positive **into the screen** toward the
  wall. The wall stands at `WALL_Z`.

Gravity acts on **y** only.

### Projection

A pinhole projection turns world space into screen space:

```
scale   = FOCAL / (z + FOCAL)
screenX = centreX + x * scale * unit
screenY = horizonY - (y - EYE_Y) * scale * unit
```

Objects further away (larger z) get a smaller `scale`, so they shrink and
drift toward the horizon. This is the whole 3D illusion. `render.js` is the
only module that knows about it.

## Modules

| Module | Responsibility |
|---|---|
| `constants.js` | Tuning values and arena geometry |
| `ballistics.js` | Pure 3D projectile maths. No canvas, no DOM |
| `project.js` | Pure world→screen projection maths |
| `arena.js` | Hole layout, hole/wall hit tests, wandering-cat motion |
| `game.js` | The rules: aim, charge, fire, resolve, ammo, score |
| `input.js` | Pointer → crosshair position, press/release for charge |
| `render.js` | All drawing. Reads state, never writes it |
| `storage.js` | High score in localStorage, with safe fallback |
| `main.js` | Boot, loop, wiring |

`ballistics.js`, `project.js`, `arena.js`, and `game.js` are pure and unit
tested in Node with no browser.

## Aiming and power

- **Crosshair x** maps to a launch heading (angle away from straight ahead),
  clamped so the cat cannot be fired behind the player.
- **Crosshair y** maps to elevation. The upper row of holes needs more
  elevation than the lower row.
- **Power** charges while held, on a loop that fills over `CHARGE_SECONDS`
  and clamps at full rather than resetting. Power scales launch speed.

Hitting an upper hole should require noticeably more power or elevation than
a lower one, so the two rows are meaningfully different targets.

## Scoring

**+20 per cat through a hole.** That is the only way to score, matching the
observed +20 steps in the footage.

Assumption flagged during design: the cats wandering the arena floor are
scenery, not targets. If they turn out to be scoreable, that is an additive
change to `arena.js` and `game.js`.

Best score persists in `localStorage`.

## Data and persistence

One `localStorage` key holding `{version, bestScore, totalCatsFired}`.
Every read and write is wrapped; a blocked or full storage degrades to
in-memory play. A corrupt entry falls back to defaults. A save failure must
never interrupt a shot.

## Error handling

- The main loop wraps each frame in try/catch.
- `dt` is clamped so a backgrounded tab cannot teleport the cat through the
  wall on resume.
- A shot always terminates: it either reaches the wall plane, lands on the
  sand, or leaves the arena bounds.

## Testing

Unit tested in Node, no browser:

- Ballistics: trajectory, apex, no mutation of inputs.
- Projection: distant things are smaller; a point at the wall projects inside
  its hole.
- Arena: hole hit/miss including exact edges, wandering-cat motion staying in
  bounds.
- Game rules: charge clamping, ammo decrement, score only on hole, run ends
  at zero ammo.
- Storage: validation, corrupt data, throwing storage.

Reachability, proven by test rather than by eye: **every hole must be
hittable** by some (aim, power) combination, and the upper row must require
more than the lower row. A hole that no shot can reach is a dead target and
no unit test on the pieces would reveal it.

Rendering and feel are verified by playing.

## Open items

- Exact tuning (gravity, focal length, wall depth, charge rate, speed range)
  by feel during implementation.
