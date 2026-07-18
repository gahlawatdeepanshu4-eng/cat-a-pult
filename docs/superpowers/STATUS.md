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
- **CURRENTLY IN SAMPLER MODE** (`SAMPLER_MODE = true` in `constants.js`): a
  **5-level** test build that shows all 7 creatures by level 5 with difficulty
  ramping to full — so the whole game can be play-tested fast. Flip to `false`
  for the real **50-level** campaign. `levels.js` has both generators
  (`samplerSpec`, `campaignSpec`); tests cover both.

## Architecture (all in `src/`)

Pure logic split from rendering, unit tested in Node with no browser.

- `constants.js` — all tuning, geometry, creature stats, mode switch. Change feel here.
- `ballistics.js` / `project.js` / `aim.js` — pure maths (trajectory, world→screen, drag→aim).
- `creatures.js` — the 7 kinds (`KIND`): spawn, wander, jump, dodge, collision
  (`centreOf`, `hitsSwept`, `firstHitSwept`). Flying code is present but dormant.
- `scoring.js` — distance multiplier + `hitScore`. Pure.
- `levels.js` — `campaignSpec` (50) and `samplerSpec` (5) from one builder; `levelSpec` picks by mode.
- `game.js` — rules; returns new state. `createRun` / `createRunFromSpec`.
- `render.js` — all drawing. `storage.js` — save. `main.js` — boot/loop/wiring. `input.js` — drag capture.

**Invariants:** the arena is a **wedge** (`xLimitAt(z)`) so creatures must live
where aim can reach — tests prove every creature on all 50 campaign levels AND
all 5 sampler levels is killable. Collision is **swept**, never point-sampled.

## Tests

164 tests, all passing. Node's built-in runner, zero deps.

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
speed/dodge scaling ✅ · **4 five weapons (NEXT)** · 5 scenery themes every 5 levels.

**Phase 4 plan (next):** catapult (L1–15) · crossbow (16–25, fast/flat) ·
spear-crossbow (26–35, pierce) · spear (36–45, pierce) · bazooka (46–50, splash).
In sampler mode, map **one weapon per level** so all five are seen in 5 levels.
Pierce = hit all along the swept path (extend `firstHitSwept`); splash = kill all
within a radius of impact. Weapon data → new `weapons.js`, chosen by level.

## Done this session (2026-07-19)

- **Removed flying**; made jumping a **random per-second hop chance** that ramps
  with level (some walk, some hop).
- Phase 1 **POV**: elevated vantage + deep field. Tried and **reverted** two shot
  detours (high downward launch; steep lobs via decoupled aim) — player preferred
  the original shot feel. Lesson: steeper-than-~0.10 `MIN_ELEVATION` needs the
  decoupled aim (side targets otherwise require flat shots), which the player disliked.
- Phase 2 **distance scoring** (`scoring.js`).
- Phase 3 **50 levels, 7 creatures, speed/dodge scaling** (roster from a `SCHEDULE`).
- **5-level SAMPLER mode** so the player can test everything without grinding 50.
- **Fixed a blank-screen crash:** a save whose `unlockedLevel` exceeded the
  build's level count made `createRun` return null and the loop crashed. `main.js`
  now clamps the start level to `TOTAL_LEVELS`; `recordClear` never lowers progress.

## The open item: FEEL / LOOKS ARE UNVERIFIED

Logic/geometry/render are checked by importing real modules and reading
state/pixels back. The player (Deepanshu) play-tests on an Android phone. Most
in need of eyes now:
- Do the **5 new creatures read clearly** (send a screenshot if any looks off — I fix the drawing)?
- Does the **difficulty ramp** feel right across the sampler's 5 levels?

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

1. Player play-tests the **5 sampler levels** on the phone; reports how the
   creatures look and how the ramp feels. Tune from that.
2. **Phase 4: weapons** (plan above) — map one weapon per sampler level.
3. Then Phase 5 (scenery themes). Flip `SAMPLER_MODE=false` when ready to ship
   the full campaign.
