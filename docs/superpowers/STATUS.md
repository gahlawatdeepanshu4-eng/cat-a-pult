# Cat-a-pult — Status

**Last updated:** 2026-07-18

A single-player landscape PWA for Android. You pull back a slingshot and fling
a rock at cats and T-rexes roaming an arena. Personal project, built from
scratch, no backend, no audio.

## What it is now

- **Pseudo-3D, fixed forward view.** You look at an arena wall (a painted
  backdrop, the holes score nothing). Creatures roam the sand in front of it.
  The rock flies *into the screen* and shrinks with distance.
- **Drag to aim, Angry Birds style.** Pull back, let go. Drag direction sets
  aim, drag length sets power, and there is **no timer**. A drag too short to
  be a shot cancels instead of firing a dud.
- **Targets:** cat 20 points, T-rex 50. They wander on the sand, and per level
  gain dodging (ramps from level 1) and jumping (level 2+). **No flying** — all
  creatures stay on the ground. Jumping is a random per-second hop chance that
  climbs with the level, so some creatures walk while others hop, and the whole
  arena gets jumpier and less predictable the higher you go.
- **20 levels** generated from a formula in `levels.js`. Clear every creature
  before the rocks run out. Failing just restarts the level: no lives, no game
  over. Progress and best scores persist in localStorage.

## Architecture (all in `src/`)

Pure logic is split from rendering and unit tested in Node with no browser.

- `constants.js` — all tuning and arena geometry. Change feel here.
- `ballistics.js` — 3D projectile maths. Pure.
- `project.js` — the perspective projection (world → screen). Pure.
- `aim.js` — drag vector → heading/elevation/power. Pure. Shared by the ghost
  arc and the real shot so the preview cannot lie.
- `creatures.js` — cats and T-rexes: spawn, wander, jump, fly, dodge, and the
  collision maths (`centreOf`, `hitsSwept`, `firstHitSwept`).
- `levels.js` — the 20-level difficulty curve, as data from a formula.
- `game.js` — the rules. Returns new state, never mutates.
- `render.js` — all drawing. Reads state, never writes it.
- `input.js` — pointer drag capture only.
- `storage.js` — progress + best scores, with safe fallback.
- `main.js` — boot, loop, wiring.

**Two invariants that keep it correct:**
- The arena is a **wedge, not a box**: a rock's reach at depth z is
  `tan(MAX_HEADING) * z`, so creatures must spawn/wander/dodge inside that
  cone (`xLimitAt(z)`) or they are visible but unhittable. Tests prove every
  creature on all 20 levels is killable.
- Collision is **swept** along the rock's whole path per frame, not point
  sampled — a fast rock would otherwise step clean over an animal.

## Tests

118 tests, all passing. Node's built-in runner, zero dependencies.

```bash
npm test        # run everything
npm run serve   # static server on http://localhost:5173
```

## Done this session (2026-07-18)

- Rebuilt the game twice after reference footage showed the real thing: it is
  slingshot-into-an-arena, not side-on trajectory. See the spec history.
- Switched crosshair-and-charge controls (broken: taps died, and touch could
  not aim before charging) to **drag-to-aim with no timer**.
- Added cats + T-rexes as dodging/jumping/flying targets across 20 levels.
- Fixed "rock passes through animals": swept collision, one shared `centreOf`
  hitbox, and depth cues (landing ring on the sand + a rock shadow).
- Added a **blood splat at the point of impact that lands before the score**.
- Replaced emoji creatures with **vector-drawn** ones (fix for "glassy").
- **Lowered the flyer band to y=95..210** so flyers sit in the forgiving
  middle of the arc instead of only at its razor-thin apex.
- **+10% rocks** per level.
- Added project-scoped `/handover` and `/resume-catapult` commands (in
  `.claude/commands/`) and this STATUS doc, so sessions hand off cleanly.

## The one big open item: FEEL IS UNVERIFIED

Every bit of logic, geometry, and rendering has been checked by importing the
real modules and reading pixels/state back. But **nobody has actually played
it.** The in-app browser pane will not render in these sessions, and Chrome
blocks localhost by extension permission, so I cannot drive it live.

The player (Deepanshu) plays on an Android phone and reports back. Recently
changed and most in need of a real play-test:
- Do the **vector creatures** read as solid (the "glassy" complaint)?
- Does the **random jumping** feel good? Is level 2 gentle enough and level 20
  chaotic-but-fair? (Tune `MAX_JUMP_CHANCE` in `constants.js`.)
- Does **drag aiming** feel right, and is the **landing ring** a useful depth
  cue or clutter?

Note: flying was **removed** this session (all creatures are ground-based now).
The flyer engine code in `creatures.js` is kept but dormant — no level spawns a
flyer — so the design spec's "Flying (level 4+)" section is now out of date.

## Gotchas for the next session

- **Hard-refresh (Ctrl+Shift+R) after any change.** The service worker is
  network-first now, but an old cache-first worker may still be registered
  from earlier; unregister it if changes do not appear.
- The static dev server (`npm run serve`) sometimes dies between turns.
  Restart it before verifying.
- Windows line-ending warnings on commit are harmless.
- No audio in v1 by decision. Blood is intentionally light.

## v2 CAMPAIGN — in progress

We are rebuilding this into an open-landscape campaign. Full design in
`docs/superpowers/specs/2026-07-18-cat-a-pult-campaign.md` (supersedes the
close-up arena spec). Approved decisions: build **phased with a play-test
between each phase**; toughness is **speed + dodge only, no hit-points**;
**each weapon plays differently**; the 4 extra creatures are mine to invent.

Phases: 1 POV ✅ · 2 distance scoring · 3 fifty levels + 7 creatures +
speed/dodge scaling · 4 five weapons (catapult/crossbow/spear-crossbow/spear/
bazooka, with pierce + splash) · 5 scenery themes every 5 levels.

**Phase 1 (POV) is done and needs a play-test.** Raised the vantage and pushed
creatures into the distance (`EYE_Y=620`, `HORIZON_FRACTION=0.26`, `NEAR_Z=460`,
`WALL_Z=1500`). The sling stays at the **bottom** and shots use the **original
aim** (`SLING_Y=70`, `MIN_ELEVATION=-0.05`, `MAX_ELEVATION=0.85`, power from
total drag length).

Two detours were tried and **reverted** at the player's request: (1) a high
launch shooting DOWN from a perch, and (2) steep lob shots via a decoupled aim
(sideways=heading, down=power). Both worked and passed tests; the player just
preferred the original shot feel. Lesson if steepness comes up again: with the
coupled aim the steepest reachable `MIN_ELEVATION` is only ~0.10 (side targets
need flat shots) — going steeper *requires* decoupling power from sideways pull,
which the player did not like. Camera is kept steep per the player's choice.

All reachability tests pass. Tuning knobs: the four camera ones, `SLING_Y`, the
two elevation limits, `MAX_LAUNCH_SPEED`.

## Next steps

1. **Play-test Phase 1 on the phone:** does the raised, shoot-across-distance
   view feel good? Can you read how far each creature is? Report back; tune the
   four camera knobs above from that.
2. Then Phase 2 (distance-based scoring), and on down the phase list.
3. Old v1 to-dos still open: the "glassy" complaint was a stale phone cache, not
   the code (creatures are solid vectors); confirm once the cache is cleared.
