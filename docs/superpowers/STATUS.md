# Cat-a-pult — Status

**Last updated:** 2026-07-19

A single-player landscape PWA for Android. From an elevated vantage you pull
back a slingshot and fling a rock across a distance at cats, T-rexes and five
mashup creatures roaming the field. Personal project, from scratch, no backend.
Built as a v2 "campaign" (see the campaign spec) on top of the original arena
game. **Sound now exists** (WebAudio, generated live — no files), muteable.

## What it is now

- **Elevated pseudo-3D view.** You look down across a deep field at a **fenced
  yard** the creatures roam in, with **per-level themed scenery** behind it (the
  old stone wall is gone). The rock flies *into the screen* and shrinks with
  distance so you can read how far each creature is. Camera: `EYE_Y=620`,
  `HORIZON_FRACTION=0.26`; field depth `NEAR_Z=460`..`WALL_Z=1500`.
- **Per-weapon look.** The held weapon + a hand are drawn low in the view and
  swap per level (slingshot → dart blaster → giant fork → bone spear → fireworks
  cannon), with a short throw/recoil, and the flying projectile matches the
  weapon (rock / dart / fork / bone / firework). All render-only.
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
- **NOW IN FULL CAMPAIGN MODE** (`SAMPLER_MODE = false` in `constants.js`, set
  2026-07-19): the real **50-level** game. Weapons unlock in bands (catapult
  1–15, crossbow 16–25, spear-crossbow 26–35, spear 36–45, bazooka 46–50);
  scenery theme rotates every 5 levels; difficulty ramps across all 50. Home
  "Play" drops into the furthest unlocked level and levels advance one-to-next
  (the sampler picker only appears when `TOTAL_LEVELS <= 8`, so it's off now).
  Flip `SAMPLER_MODE = true` for the 5-level test build (all 7 creatures + all 5
  weapons across 5 levels). `levels.js` has both generators; tests cover both.

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
- `sound.js` — all audio via WebAudio. Weapon fire, music, splat/boom and jingles
  are generated live (no files); creature hit cries are **real recorded clips**
  from `audio/*.mp3` (with the synth `voice()` as fallback). Pure data
  (`WEAPON_SOUND`, `MELODY`, `noteHz`, `CLIP_KINDS`, `clipUrl`) is tested;
  `createSound()` is a thin, Node-safe, muteable player (no-ops with no browser).
- `audio/` — 7 short creature-cry MP3s (Wikimedia Commons; see `audio/CREDITS.md`).
- `ui.js` — pure menu button layouts (normalised coords) + `hitTest`; shared by
  render (drawing) and main (tap dispatch). Unit-tested.
- `render.js` — all drawing (incl. home/pause/settings/how-to screens).
  `storage.js` — save + mute + music/SFX prefs. `main.js` — boot/loop/screen
  state machine/wiring. `input.js` — drag capture.

**Invariants:** the arena is a **wedge** (`xLimitAt(z)`) so creatures must live
where aim can reach — tests prove every creature on all 50 campaign levels AND
all 5 sampler levels is killable **with that level's weapon** (the sweep reads
`spec.weapon`, so flat/pierce/splash weapons can't hide an unreachable target).
Collision is **swept**, never point-sampled. Horizontal reach is weapon-
independent (x at depth z = tan(heading)·z), so weapons never move creatures.

## Tests

194 tests, all passing. Node's built-in runner, zero deps.

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
speed/dodge scaling ✅ · 4 five weapons ✅ · 5 scenery + fenced yard ✅ · 6
**sound — APPROVED** (real animal clips; see below) · 7 **menu/game-shell —
APPROVED** (home screen, pause menu, settings).

**Player's game plan from here (2026-07-19):** (1) per-level scenery ✅ · (2)
**sounds** ✅ APPROVED · (2b) **menu/game-shell** — home, pause, settings
(**APPROVED**) · (3) a friend play-tests the 5 weapons · (4)
entry/exit sounds + general game-feel features · (5) **deploy live**. "Keep
improvising as we go."

**Phase 5 done:** five scenery themes in `render.js` (`SCENERY` + `sceneryFor`),
render-only. Each level (= each weapon in the sampler) gets its own view: hills /
desert / snow / jungle / night. The old stone wall is gone; creatures now roam a
**fenced yard** (`drawFence` + `YARD`) whose shape is identical every level —
only its colour and the surrounding scenery (sky, ground, backdrop silhouette)
change. Backdrops: rolling hills, mesas, snowy peaks, jungle canopy, moon+stars.
Campaign rotates a theme every five levels; sampler shows one per level.

## Done this session (2026-07-19, menu/game-shell) — APPROVED

- **Phase 7: the game shell** — home screen, mid-game pause, settings.
  - **New pure `src/ui.js`**: button layouts in **normalised (0..1) coords** +
    `hitTest`. The SAME layout drives drawing (render.js) and tap dispatch
    (main.js), so what you see is what you tap — and it sidesteps the device-px
    vs CSS-px mismatch (render ×device size, input ÷client size). Unit-tested:
    in-bounds, non-overlap, hit-test.
  - **Screens** (state machine in `main.js`, now starts on `home`): `home`
    (title + Play / Settings / How-to-play), `paused` (Resume / Restart /
    Settings / Quit — reached via a **pause pad**, bottom-left, mirroring mute),
    `settings` (Music + SFX ON/OFF pills, Reset progress, Back), `howto` (text).
    Kept: `menu` sampler picker, `play`, `cleared/failed/done`.
  - **Pause truly freezes**: `update()` only ticks the world on the `play`
    screen, so a mid-air rock and the creatures all hold still.
  - **Settings wire-up**: `sound.js` gained independent `music`/`sfx` enables
    (layered under the master mute); `storage.js` persists them under
    `catapult.audio` (own key, never touches the save) + `freshSave()` for Reset.
    In-play corner taps (pause/mute) only fire on a genuine **tap**, never a real
    aim drag that ends in a corner (`isTap`, 14px).
  - `makeView` already exposes `dpr` (used by the pause/mute pads). Render draws
    everything via one `drawButton` (rounded pad, optional ON/OFF pill) + a
    `drawScreen` dispatcher.
  - **Service worker → `catapult-v19`** (`src/ui.js` precached). Tests **194**,
    all green (ui 6 + settings-storage 4 new); render smoke runs all 9 screens.
  - **Not done (deferred by choice):** the nicer level-select + per-level stars/
    best-score screen — the bare sampler picker still stands in for now.

## Done earlier this session (2026-07-19, sound) — APPROVED

- **Phase 6: sound.** New `src/sound.js` — all audio generated live in the
  browser with WebAudio, **no files shipped** (PWA stays tiny/offline). Style:
  playful/cartoony (chosen to match the slingshot/dart/fork look; player said
  "you pick").
  - **Effects:** a distinct fire sound per weapon (`WEAPON_SOUND`, a pitch glide
    ± noise: slingshot twang, dart "pew", fork whoosh-up, heavy bone thwip,
    firework whistle-up); a light **splat** on a normal hit / **boom + thump** on
    a bazooka splash; short win/lose jingles on level clear/fail.
  - **Per-creature pain voices (`voice()` + `VOICED_KINDS`):** each of the 7
    creatures cries out in its own way when hit — cat "me-ow", T-rex roar, catrex
    screech, frogrex croak, bunnyrex high shriek, pigrex squeal, ducktrex quack.
    `game.js` `lastHit` now carries **`kinds`** (every victim, not just the
    nearest), so a **pierced line or a bazooka blast voices each animal in turn**
    (staggered, capped at 5). A test asserts every `KIND` has a voice, so a new
    creature can't ship silent.
  - **Voices tried FORMANT synthesis** (`vox()` + `lfo()`) after "beeps not
    animals" feedback — carrier through band-pass formants + vibrato. Player
    play-tested (sent a screen recording): still read as beeps. Confirmed via the
    recording's spectrogram that the formant code WAS running (not a cache miss)
    and that much of the perceived "beeping" was actually the background MUSIC
    (a note every 0.46s); real hits were sparse. **Conclusion: procedural synth
    can't sound like a real animal — switched to real recorded clips (below).**
    The synth `voice()` is kept only as a fallback.
  - **REAL recorded creature sounds** (`audio/*.mp3`, `CLIP_KINDS`, `clipUrl`,
    `prefetch`/`decodeClips`/`playClip` in `sound.js`): 7 short clips from
    Wikimedia Commons — cat meow, alligator-bellow (T-rex), lion roar (catrex),
    frog croak, guinea-pig wheek (bunnyrex), pig oink, duck quack. Downloaded
    with the player's approval, trimmed to ~0.3–0.9s + loudness-normalised via
    ffmpeg, re-encoded to mono MP3 (**68 KB total**). `hit()` now plays the real
    clip per victim and **falls back to the synth voice** if a clip hasn't
    decoded yet. Clips prefetch at page load (SW precached, `catapult-v18`) and
    decode once the audio context exists. Licenses/attribution in
    `audio/CREDITS.md` (mostly CC BY-SA; lion + guinea-pig are public domain).
    **Awaiting the next phone play-test to confirm they now sound like animals.**
  - **Background music:** a light looping tune (`MELODY`, C-major, two voices)
    via a small lookahead scheduler, mixed well under the effects.
  - **Mute toggle:** a speaker button drawn bottom-right (`drawMute` in
    `render.js`), tapped via a matching corner hit-zone in `main.js`
    (`muteRectCss`/`tappedMute`). Setting persists in its **own** localStorage
    key (`catapult.muted`, `loadMuted`/`writeMuted` in `storage.js`) so it never
    touches the save. Muting silences the master bus and stops the loop;
    un-muting mid-game restarts it.
  - **Wiring (`main.js`):** context is created/resumed on the first tap (browsers
    require a gesture); `sound.fire` on release, `sound.hit(lastHit)` when a hit
    is detected, `cleared()`/`failed()` on those transitions, `startMusic()` on
    entering a level. `makeView` now also returns `dpr` (for the mute button's
    CSS↔device sizing).
  - **Safety:** importing `sound.js` in Node never throws and every method
    no-ops without a browser or when muted, wrapped so an audio hiccup can't
    crash the animation frame.
  - **Tests** (`test/sound.test.js` + extended game/weapons tests): noteHz, every
    weapon has a valid fire sound, every creature has a voice, fallback, melody
    shape, Node import-safety no-op (incl. every voice), mute toggle+persistence,
    and `lastHit.kinds` lists all victims (single / pierce-line / bazooka blast).
    **Suite now 183, all green.** Render smoke re-run clean.
  - **Service worker → `catapult-v18`**, `src/sound.js` in precache.

## Done earlier this session (2026-07-19, continued)

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
- **Start-menu level picker** (`drawMenu` in `render.js`, wired in `main.js`).
  Clearing site data resets the save to level 1, so a player could only ever see
  the catapult without grinding. The picker shows one tappable column per level,
  labelled with its weapon, so every weapon is one tap away. Only shown for a
  short build (`TOTAL_LEVELS <= 8`); the campaign keeps the plain menu. In the
  sampler, clearing/failing a level returns to the picker (not auto-advance) so
  weapon-hopping is trivial. `input.js` now also reports the tap's absolute x.
- **Service worker → `catapult-v8`**, and `src/weapons.js` added to its precache
  (it was missing, which would break the game offline).
- **Per-weapon visuals (render-only).** The held weapon is drawn in the view and
  swaps per level, each with a gripping **hand** (`drawHand`) and a short
  **throw/recoil** on release (`launchAnim` in `main.js`, `launch` 1→0 lunges it
  forward). The **projectile matches the weapon** (`drawProjectile`), used both
  in flight and as the loaded round.
  - **Two rounds of play-test feedback applied:** (1) the weapons were too big
    and drawn up the centre, blocking aim → now **compact, low in the bottom
    margin, 90% alpha**, tilt/lunge damped. (2) The medieval set looked too
    similar and the player chose **fun/cartoon variants**: catapult = slingshot
    (rock); crossbow = **toy dart blaster** (foam dart); spear-crossbow = **giant
    fork** (flying fork — literally skewers a line, matching pierce); spear =
    **T-rex-bone spear** (bone, on-theme with the mashups); bazooka = **fireworks
    cannon** (firework rocket, bursts = splash). **Player approved the cartoon set.**
- **Scenery + fenced yard, then two polish rounds (all approved):**
  - Five per-level themes (`SCENERY`/`sceneryFor`), fenced yard replaces the wall.
  - Fence reworked into a **big rectangular cattle pen** (`YARD.penW=790`,
    front open, two side walls receding from the player's corners to the back
    wall) after creatures were spilling outside the old trapezoid — `penW` beats
    the widest wander (xLimitAt caps at 730), so all creatures are always inside.
  - **Night level fix:** ground recoloured to moonlit green + a faint horizon
    line on every theme, so creatures no longer look like they float. SW `v14`.
  - Verified via mock-ctx smoke (`scratchpad/smoke-render.mjs`, run against every
    weapon × theme); the player play-tested and approved all of it on the phone.

## Earlier this session (2026-07-19)

- **Removed flying**; jumping is a **random per-second hop chance** ramping with level.
- Phase 1 **POV** (elevated vantage + deep field; two shot detours tried and
  **reverted** — player preferred the original shot feel).
- Phase 2 **distance scoring** (`scoring.js`); Phase 3 **50 levels, 7 creatures,
  speed/dodge scaling**; **5-level SAMPLER mode**.
- **Fixed a blank-screen crash:** a save whose `unlockedLevel` exceeded the
  build's level count made `createRun` return null. `main.js` now clamps the
  start level to `TOTAL_LEVELS`; `recordClear` never lowers progress.

## State of play — what's approved, what's open

The player (Deepanshu) play-tests on an Android phone; logic/geometry/render are
checked by importing real modules and reading state/pixels back.

**Approved this session:** all 7 creatures, the difficulty ramp, all 5 weapons'
feel (pierce + bazooka splash), the 5 cartoon weapon looks, and the scenery +
fenced pen (incl. the night fix).

**Awaiting play-test:** **sound** (built this session — effects + music + mute).
The player has NOT heard it on the phone yet; it is verified only by tests +
Node import. This is the one open feel item now.

**Not yet done (the next arc):** confirm the sound feels right on the phone, then
a **friend play-tests the 5 weapons**, then entry/exit sounds + game-feel polish,
then **deploy live**.

## Gotchas for the next session

- **The preview pane will NOT render live** — the animation loop (rAF) is paused
  when the preview isn't truly on screen, and screenshots time out. Verify by
  importing the real modules and reading state/pixels back (e.g. build a run,
  call `drawScene` on a real canvas, sample pixels), not by screenshotting.
- **Bump the service-worker cache (`sw.js`, currently `catapult-v19`) on any
  file change**, and hard-refresh / clear site data — it is network-first but an
  old cache-first worker can still pin stale files. On phone: Chrome → site
  settings → Clear & reset. **Note:** clearing site data also wipes the save
  (`unlockedLevel` back to 1) — use the start-menu level picker to jump straight
  to any level/weapon afterwards.
- **Verify render changes with `scratchpad/smoke-render.mjs`** (mock-ctx runs
  `drawScene` for every weapon × theme × state). It only catches JS errors, not
  appearance — the player is the only judge of looks.
- **Never do `createRun(save.unlockedLevel)` raw** — always clamp to
  `TOTAL_LEVELS` (a longer-build save must not break a shorter build).
- The dev server (`npm run serve`) sometimes dies between turns; restart it.
- Windows line-ending (LF→CRLF) warnings on commit are harmless.
- No HP, no flying by decision. Audio now exists (lightweight WebAudio +
  muteable); don't reintroduce HP or flying.
- **Sound can't be verified in-session** — no audio device, and it needs a real
  tap gesture to start (browser policy). Verified only by tests + Node import;
  the player is the judge of how it *sounds*. Tune values live in `sound.js`
  (`WEAPON_SOUND`, `MELODY`, gain levels).

## Next steps

1. **Now on the full 50-level campaign** (`SAMPLER_MODE = false`, done
   2026-07-19) — play it through on the phone and watch difficulty/weapon-band
   pacing over the long haul.
2. A **friend play-tests** the 5 weapons; tune from feedback.
3. **Game-feel polish**: level-select screen (best score/stars per level —
   deferred from the menu work), entry/exit sounds, score-tally + "stars" on
   level-complete, transitions.
4. **Deploy live.**
