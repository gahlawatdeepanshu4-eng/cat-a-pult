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
- **Targets:** cat 20 points, T-rex 50. They wander, and per level gain
  dodging (ramps from level 1), jumping (level 2+), and flying (level 4+: two
  flying cats and two flying T-rexes each level).
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

## The one big open item: FEEL IS UNVERIFIED

Every bit of logic, geometry, and rendering has been checked by importing the
real modules and reading pixels/state back. But **nobody has actually played
it.** The in-app browser pane will not render in these sessions, and Chrome
blocks localhost by extension permission, so I cannot drive it live.

The player (Deepanshu) plays on an Android phone and reports back. Recently
changed and most in need of a real play-test:
- Do the **vector creatures** read as solid (the "glassy" complaint)?
- Are **flyers** now comfortably reachable at y=95..210?
- Does **drag aiming** feel right, and is the **landing ring** a useful depth
  cue or clutter?

## Gotchas for the next session

- **Hard-refresh (Ctrl+Shift+R) after any change.** The service worker is
  network-first now, but an old cache-first worker may still be registered
  from earlier; unregister it if changes do not appear.
- The static dev server (`npm run serve`) sometimes dies between turns.
  Restart it before verifying.
- Windows line-ending warnings on commit are harmless.
- No audio in v1 by decision. Blood is intentionally light.

## Next steps

1. Play-test the three "feel" questions above on the phone and report back.
2. Tune from that feedback (flyer height, ring, difficulty curve, dodge rate).
3. Only after feel is right: consider juice/sound, then deploy to a free host.
