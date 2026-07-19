# Cat-a-pult — Status

**Last updated:** 2026-07-19

A single-player landscape PWA for Android. From an elevated vantage you pull
back a slingshot and fling a rock across a distance at cats, T-rexes and five
mashup creatures roaming the field. Personal project, from scratch, no backend,
no audio. Built as a v2 "campaign" (see the campaign spec) on top of the
original arena game.

## What it is now

- **Elevated pseudo-3D view.** You look down across a deep field toward a stone
  wall backdrop (its holes score nothing). Creatures roam the ground; the rock
  flies *into the screen* and shrinks with distance so you can read how far each
  creature is. Camera: `EYE_Y=620`, `HORIZON_FRACTION=0.26`; field depth
  `NEAR_Z=460`..`WALL_Z=1500`.
- **Drag to aim, Angry Birds style.** Sling sits at the bottom. Drag direction
  sets aim, drag length sets power, no timer. A too-short drag cancels. Original
  "coupled" aim (`SLING_Y=70`, `MIN_ELEVATION=-0.05`, `MAX_ELEVATION=0.85`).
- **Distance scoring:** a hit = base points × a multiplier that climbs 1.0 near
  → 2.5 far (`scoring.js`). Cat 20/35/45, T-rex 50/85/115 at near/mid/far.
- **Seven creatures**, all same behaviour (wander, random hop, dodge), differ in
  size/speed/points: cat, trex, catrex, frogrex, bunnyrex, pigrex, ducktrex. The
  five mashups share one vector "dino body" with a swapped head. **No flying.**
- **Harder as you climb:** more creatures, faster (`speedMult` up to 1.9×) and
  dodgier/jumpier. No hit-points — landing the hit is the whole challenge.
- **Five weapons, each a different feel** (`weapons.js`, chosen per level):
  catapult (floaty lob, the original feel), crossbow (fast flat bolt), spear-
  crossbow (fast flat, **pierces** a whole line), spear (heavier, some drop,
  **pierces**), bazooka (slower arced shell, **splash** kills everything within
  a blast radius of impact). Weapon = pure data (`speedScale`, `gravityScale`,
  `pierce`, `blastRadius`, `ammoModifier`); the flight loop reads it.
- **CURRENTLY IN SAMPLER MODE** (`SAMPLER_MODE = true` in `constants.js`): a
  **5-level** test build that shows all 7 creatures by level 5 with difficulty
  ramping to full — and now maps **one weapon per level** (L1 catapult → L5
  bazooka), so all seven creatures AND all five weapons are play-tested in five
  levels. Flip to `false` for the real **50-level** campaign (weapons unlock in
  bands: catapult 1–15, crossbow 16–25, spear-crossbow 26–35, spear 36–45,
  bazooka 46–50). `levels.js` has both generators; tests cover both.

## Architecture (all in `src/`)

Pure logic split from rendering, unit tested in Node with no browser.

- `constants.js` — all tuning, geometry, creature stats, mode switch. Change feel here.
- `ballistics.js` / `project.js` / `aim.js` — pure maths (trajectory, world→screen, drag→aim).
- `creatures.js` — the 7 kinds (`KIND`): spawn, wander, jump, dodge, collision
  (`centreOf`, `hitsSwept`, `firstHitSwept`). Flying code is present but dormant.
- `scoring.js` — distance multiplier + `hitScore`. Pure.
- `weapons.js` — the five weapons as data + selectors (`weaponForCampaign`,
  `weaponForSampler`, `weaponOf`). Pure. `game.js` reads the level's weapon.
- `levels.js` — `campaignSpec` (50) and `samplerSpec` (5) from one builder; `levelSpec` picks by mode. Each spec carries a `weapon`.
- `game.js` — rules; returns new state. `createRun` / `createRunFromSpec`.
- `render.js` — all drawing. `storage.js` — save. `main.js` — boot/loop/wiring. `input.js` — drag capture.

**Invariants:** the arena is a **wedge** (`xLimitAt(z)`) so creatures must live
where aim can reach — tests prove every creature on all 50 campaign levels AND
all 5 sampler levels is killable **with that level's weapon** (the sweep reads
`spec.weapon`, so flat/pierce/splash weapons can't hide an unreachable target).
Collision is **swept**, never point-sampled. Horizontal reach is weapon-
independent (x at depth z = tan(heading)·z), so weapons never move creatures.

## Tests

175 tests, all passing. Node's built-in runner, zero deps.

```bash
npm test        # everything (the 55 reachability sweeps make it ~1-2 min)
npm run serve   # static server on http://localhost:5173
```

## v2 campaign — progress

Full design: `docs/superpowers/specs/2026-07-18-cat-a-pult-campaign.md`.
Approved decisions: **phased, play-test between each**; toughness is **speed +
dodge only, no HP**; **each weapon plays differently**; the 4 extra creatures
were mine to invent (player approved all 7).

Phases: 1 POV ✅ · 2 distance scoring ✅ · 3 fifty levels + 7 creatures +
speed/dodge scaling ✅ · 4 five weapons ✅ · **5 scenery themes every 5 levels (NEXT)**.

**Phase 5 plan (next):** ten scenery themes (50 ÷ 5) rotating every five levels,
each a palette + backdrop shapes drawn in `render.js` — **render-only, no logic**.
The horizon doubles as the "flew past = miss" line. Proposed set in the spec
(green hills, alpine, desert, snow, autumn forest, volcanic, coastal, moonlit,
jungle, sunset mesa). In sampler mode, show five distinct themes across L1–5.

## Done this session (2026-07-19, continued)

- **Player approved all 7 creatures AND the difficulty ramp** — both Phase-3
  feel questions closed.
- **Phase 4: five weapons.** New pure `weapons.js` (data + selectors). Each
  weapon shapes the shot via `speedScale` (launch speed) and `gravityScale`
  (drop felt in flight), plus a special:
  - **Pierce** (spear-crossbow, spear): the shot flies *through* every creature
    on its swept path and keeps going until it leaves the field — `allHitsSwept`.
  - **Splash** (bazooka): the shell ends on first contact (creature, ground, or
    wall) and kills everything within `blastRadius` of that point — `withinBlast`.
  - Ordinary (catapult, crossbow): unchanged first-hit-stops behaviour.
  - `launchVelocity` gained an optional speed scale; `tick` feeds each weapon its
    own gravity into `stepBody`; `main.js` ghost preview + HUD are weapon-aware
    (weapon name shown; a shockwave ring draws on a splash kill).
  - `levels.js` attaches a `weapon` per level and trims ammo by `ammoModifier`
    with a `targets + 3` floor. Sampler = one weapon per level (L1→L5).
  - 11 new tests (pierce/splash mechanics, selectors, launch scaling); the 55
    reachability sweeps now run with each level's weapon and still pass.

## Earlier this session (2026-07-19)

- **Removed flying**; jumping is a **random per-second hop chance** ramping with level.
- Phase 1 **POV** (elevated vantage + deep field; two shot detours tried and
  **reverted** — player preferred the original shot feel).
- Phase 2 **distance scoring** (`scoring.js`); Phase 3 **50 levels, 7 creatures,
  speed/dodge scaling**; **5-level SAMPLER mode**.
- **Fixed a blank-screen crash:** a save whose `unlockedLevel` exceeded the
  build's level count made `createRun` return null. `main.js` now clamps the
  start level to `TOTAL_LEVELS`; `recordClear` never lowers progress.

## The open item: FEEL / LOOKS ARE UNVERIFIED

Logic/geometry/render are checked by importing real modules and reading
state/pixels back. The player (Deepanshu) play-tests on an Android phone.
Creatures and the difficulty ramp are now **approved**. Most in need of eyes now:
- **How does each of the five weapons feel** across the sampler's 5 levels
  (L1 catapult → L2 crossbow → L3 spear-crossbow → L4 spear → L5 bazooka)? The
  numbers (`speedScale`/`gravityScale`/`blastRadius` in `weapons.js`) are a first
  pass tuned for reachability, not yet for feel — expect to tune from play.
- Does **pierce** feel satisfying (line creatures up and skewer them)? Does the
  **bazooka splash** read clearly (the shockwave ring + multi-kill)?

## Gotchas for the next session

- **The preview pane will NOT render live** — the animation loop (rAF) is paused
  when the preview isn't truly on screen, and screenshots time out. Verify by
  importing the real modules and reading state/pixels back (e.g. build a run,
  call `drawScene` on a real canvas, sample pixels), not by screenshotting.
- **Hard-refresh / clear site data after any change** — service worker (now
  `catapult-v7`, network-first) plus an old cache-first worker can pin stale
  files. On phone: Chrome → site settings → Clear & reset.
- **Never do `createRun(save.unlockedLevel)` raw** — always clamp to
  `TOTAL_LEVELS` (a longer-build save must not break a shorter build).
- The dev server (`npm run serve`) sometimes dies between turns; restart it.
- Windows line-ending (LF→CRLF) warnings on commit are harmless.
- No audio, no HP, no flying by decision.

## Next steps

1. Player play-tests the **5 sampler levels** and reports how each **weapon**
   feels (esp. pierce and the bazooka splash). Tune `weapons.js` numbers from that.
2. **Phase 5: scenery themes** (plan above) — render-only, rotating every 5 levels.
3. Flip `SAMPLER_MODE=false` when ready to ship the full 50-level campaign.
