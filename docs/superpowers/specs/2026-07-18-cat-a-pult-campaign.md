# Cat-a-pult — Campaign Design (v2)

**Date:** 2026-07-18
**Status:** Current. Supersedes `2026-07-17-cat-a-pult-design.md`, which described
the fixed close-up arena. The core (drag-to-aim, pseudo-3D, wedge reachability,
swept collision, pure-logic/render split) is kept; everything else grows.

## What changes, in one breath

The close-up sand arena becomes an **open landscape campaign**: you fire from a
raised vantage point across a distance at creatures roaming grassy hills, the
scenery re-themes every five levels, there are **50 levels**, **five weapons**
that unlock as you climb, **seven creature types**, and hits score **more the
farther away** they land.

Player is still non-technical and plays on an Android phone; feel is verified by
playing, not in-session.

## Build order (each phase is independently playable)

The project has been rebuilt twice for building on an unplayed "feel." So the
foundational, feel-defining change — the raised point of view and shooting from
a distance — is **Phase 1**, gated on a real play-test before anything is built
on top of it.

1. **This spec.** (Phase 0.)
2. **New point of view.** Raised launch height, creatures pushed into the
   distance, depth that reads. *PLAY-TEST GATE.*
3. **Distance-based scoring.**
4. **50 levels + 7 creatures + faster/dodgier scaling + more creatures/level.**
5. **Five weapons, each with its own feel.**
6. **Scenery themes, rotating every five levels.**

Invariants that do not move:
- Pure logic (`ballistics/project/aim/creatures/levels/game/weapons/storage`)
  stays split from drawing (`render.js`). Every rule/geometry change gets a unit
  test.
- The arena is a **wedge**: creatures must live where the current weapon's aim
  can actually reach them (`xLimitAt(z)` generalised per weapon). A test proves
  **every creature on every level is killable by the level's weapon**.
- Collision is **swept**, never point-sampled.

---

## Phase 2 — Point of view

- The launch point sits at a **height** and looks slightly **down** across the
  land, so nearer ground is low on screen and the world recedes to a horizon.
  This is a projection/eye-height change in `project.js` + `constants.js`; the
  world model (x right, y up, z into screen) is unchanged.
- Creatures start **farther away** (larger `NEAR_Z`) and range deeper, so the
  player reads "how far" each one is. More open ground = room for more targets.
- A rock that flies past the far edge of the play space (a hill crest / horizon
  line) or hits the ground short is a **miss**. No wall backdrop anymore.
- Everything downstream (weapon reach, creature placement, scenery horizon) is
  tuned against this camera, so it is settled first.

## Phase 3 — Distance-based scoring

- A hit scores `base(kind) × distanceMultiplier(z)`, rounded to a tidy number.
- `distanceMultiplier` rises with depth: roughly **1.0 near → ~2.5 far**, a pure
  function in `game.js` (or a small `scoring.js`), unit-tested at both ends and
  the middle. Farther, riskier shots pay more; this is the reward for the new
  long-range POV.
- Best-score persistence already exists and keeps working.

## Phase 4 — Levels, creatures, scaling

**Fifty levels**, still generated from a formula in `levels.js`, not hand-written.

**Seven creature types.** All share the *same capabilities* (wander, random
jump, dodge). They differ in look, size, base speed, and points only — no health
system. "Harder to kill" comes from **more speed and more dodging** as levels
rise, plus **more creatures** on screen, not from hit-points.

| # | Creature | Points | Build | Enters around |
|---|---|---|---|---|
| 1 | **Cat** | 20 | small, nimble, orange | level 1 |
| 2 | **T-rex** | 50 | big, slower, green | level 2 |
| 3 | **Catrex** | 40 | cat head on a T-rex body (your idea) | ~level 8 |
| 4 | **Frogrex** | 30 | wide frog head, dino body, bright green, low & hoppy | ~level 16 |
| 5 | **Bunnyrex** | 25 | tall rabbit ears, dino body, grey, the fastest | ~level 24 |
| 6 | **Pigrex** | 45 | pig snout + tusks, dino body, pink, big & slow | ~level 32 |
| 7 | **Ducktrex** | 35 | flat duck bill, dino body, yellow, mid | ~level 40 |

(Types 4–7 are my invention for you to veto or rename. All grounded — no flying.)

**Scaling with level (the formula):**
- **Count** grows with level, filling the larger space — more creatures, more
  variety, more of the tougher/faster kinds toward the top.
- **Speed** ramps up with level (a per-level multiplier on each kind's base).
- **Dodge chance** keeps ramping toward its cap (never 1).
- **Jump chance** keeps ramping (the random hop we just added).
- **Rocks/ammo** stay provably generous: every level hands more shots than there
  are creatures, with comfortable slack. A test guards this at 50 levels too.

## Phase 5 — Weapons

Five weapons unlock by level band. Each is a different *feel*, expressed through
projectile **speed**, **arc** (gravity felt over its flight), and a **special**
behaviour. All reuse the existing swept-collision core.

| Weapon | Levels | Feel | Special |
|---|---|---|---|
| **Catapult** | 1–15 | high, floaty lob; the current feel | none |
| **Crossbow** | 16–25 | fast, flat bolt; little drop | none |
| **Spear crossbow** | 26–35 | fast, flat | **pierces**: hits every creature along its path, not just the first |
| **Spear** | 36–45 | heavy, fast, some drop (between lob and bolt) | **pierces** |
| **Bazooka** | 46–50 | slower shell, arced | **explodes**: kills every creature within a blast radius of impact |

Design intent: the endgame (46–50) is peak dodge + peak speed, and the bazooka's
splash is the **equalizer** — you stop needing a pixel-perfect hit and start
aiming at clusters.

Mechanics map onto what exists:
- **Pierce** = take *all* creatures the swept path touches, not just the nearest
  (`firstHitSwept` → an "all hits" variant).
- **Splash** = on impact, kill every living creature within `blastRadius` of the
  impact point.
- Reachability: the per-level "every creature is killable" test runs **with that
  level's weapon**, so a flat crossbow level can't hide an unreachable high
  target, etc.

A weapon is data in a new `weapons.js` (`{name, launchSpeed, gravityScale or
arc, pierce, blastRadius, ammoModifier}`), chosen by level. `levels.js` says
which weapon a level uses.

## Phase 6 — Scenery

Ten themes (50 levels ÷ 5) rotate every five levels. Each is a palette + backdrop
shapes drawn in `render.js`; **render-only**, no logic. Proposed set (swappable):

1. Green rolling hills  2. Alpine mountains  3. Desert canyon  4. Snowy peaks
5. Autumn forest  6. Volcanic badlands  7. Coastal cliffs  8. Moonlit night
9. Jungle  10. Sunset mesa

Foreground is grassy hilly ground the creatures roam; mid/background is that
theme's mountains/horizon. The horizon doubles as the "flew past = miss" line.

## Testing (unchanged discipline)

Everything pure is unit-tested in Node, no browser:
- **POV/projection:** depth ordering, horizon placement, no mutation.
- **Scoring:** distance multiplier at near/mid/far; a far hit beats a near one.
- **Weapons:** each weapon's reach; pierce hits multiple in a line; splash kills
  within radius and spares those outside; ammo per level.
- **Creatures:** the seven types spawn in-cone; speed/dodge/jump scale up; all
  stay reachable.
- **Levels:** 50 of them; difficulty curves are monotonic; dodge < 1; each
  level's weapon can reach each of its creatures; rocks always exceed creatures.

Feel — POV, weapon heft, scenery — is verified by playing.

## Non-goals (still)

- No health/hit-point system (toughness is speed + dodge only, by decision).
- No audio. No backend/accounts/leaderboards. No flying creatures.
