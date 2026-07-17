# Cat-a-pult — Design

**Date:** 2026-07-17
**Status:** Approved, ready for implementation planning

## Summary

A single-player mobile web game. The player drags back a catapult to launch a cat, aiming to land it in a distant target zone and hit bonus moving targets along the way. Rebuilt from scratch as a personal project, inspired by an old PC game of the same name. No original source or assets are available; all mechanics here are newly designed.

## Goals

- A game that is genuinely fun to play in short bursts on an Android phone.
- Installable to the home screen and playable offline.
- Simple enough that new levels are data, not code.

## Non-goals

- Multiplayer, accounts, leaderboards, or any backend.
- App store distribution.
- iOS support. Chrome on Android is the only target.
- Audio. Deliberately excluded from v1; may be added later.
- Destructible structures or block physics (Angry Birds style). Targets are zones and moving objects, not stacks to topple.

## Platform and constraints

- **Target device:** Android phone, Chrome browser.
- **Orientation:** Landscape, locked via the PWA manifest. A "rotate your device" overlay covers the game in portrait rather than reflowing the layout.
- **Distribution:** Static files on a free host, installable as a PWA.
- **Stack:** HTML5 Canvas and vanilla JavaScript. No framework, no build step, no dependencies.
- **iOS-specific PWA workarounds are intentionally skipped** (Apple touch-icon meta tags, iOS safe-area insets, Safari standalone-mode quirks). The codebase is one codebase regardless; only these accommodations are omitted.

## Core gameplay loop

The catapult sits centered on screen at level start. The player drags back from the cat: drag distance sets power, drag angle sets launch angle, slingshot-style. On release the cat flies a parabolic arc under gravity and the camera scrolls to follow it, so levels extend well beyond one screen-width to the right.

Each level contains:

- A **target zone**: a marked strip of ground out in the distance. Landing the cat inside it is a hit.
- Optionally a **moving target**: slides back and forth along a set path, worth bonus points if struck in flight or on landing.

The player gets a limited number of shots per level, tuned per level, roughly three to five. Each shot scores distance points plus any moving-target bonus.

**Level clear:** land in the target zone, OR cross a score threshold, before shots run out.
**Level fail:** shots run out. The level resets for a fresh retry. There are no lives and no game over.

A shot ends when the cat comes to rest or leaves the level bounds. The camera then pans back to the catapult for the next shot.

## Screen and presentation

Fullscreen canvas sized to the device viewport and scaled for device pixel ratio for sharpness.

The game world uses its own coordinate system with a fixed virtual height (e.g. 720 units). Rendering scales that virtual space to the actual screen, so the game plays identically regardless of the phone's exact resolution.

**Art:** emoji sprites drawn to canvas. Cat is an emoji; moving targets are emoji; catapult and ground are simple shapes. A parallax background of a few bands scrolling at different speeds conveys distance as the camera follows.

**HUD** (screen-fixed, does not scroll): shots remaining, current score, level number, and the level's target/threshold.

**Trajectory hint:** during drag, a short dotted arc shows initial direction and power, fading out after a few points. It aids aiming without revealing the full shot.

## Architecture

Each module has one responsibility and a narrow interface.

| Module | Responsibility |
|---|---|
| `main.js` | Boots the game, owns the requestAnimationFrame loop, wires modules together |
| `physics.js` | Pure projectile math. Given position, velocity, gravity, dt, returns new position. No canvas, no DOM |
| `input.js` | Touch drag to `{angle, power}` on release. Owns nothing else |
| `level.js` | Loads a level definition; tracks shots, score, and pass/fail state for the current attempt |
| `levels.js` | Plain data. Array of level definitions: zone position and width, moving target config, shot limit, score threshold |
| `camera.js` | Tracks the visible region of the world; follows the cat, pans back to the catapult |
| `render.js` | Draws world and HUD from game state. Read-only, never mutates state |
| `storage.js` | localStorage read/write for progress and best scores. Wraps failures so a blocked storage API cannot crash the game |

**The invariant that keeps this clean:** state lives in `level.js` and the main loop. `render.js` and `physics.js` are pure functions of that state. This makes physics and level rules testable without a browser, and lets presentation change without touching behaviour.

Level definitions are data, so adding levels later means appending to an array with no code changes.

## Data and persistence

No backend, no accounts. All state persists to `localStorage` under a single key holding one small object:

- Levels unlocked
- Best score per level
- Total shots taken

`storage.js` wraps every read and write in try/catch. If storage is unavailable or full, the game continues with in-memory state and does not persist between sessions. A save failure must never interrupt a shot.

On read, the saved object is validated against its expected shape before use. A corrupted or partially written entry falls back to a fresh default rather than crashing on load.

**Accepted tradeoff:** progress lives on the device and browser it was played in, and is lost if site data is cleared. This is acceptable for a solo game and is the cost of having no backend.

## Error handling

- The main loop wraps each frame's update in try/catch. An exception cannot leave a frozen black canvas.
- Physics clamps `dt`. If the tab is backgrounded and resumed, a large time delta must not teleport the cat through the ground.
- A cat that leaves the level bounds, or moves below a speed threshold for a short duration, is considered at rest and ends the shot. No shot can hang indefinitely.

## Testing

Physics and level rules are pure functions and get unit tests runnable in Node with no browser:

- Trajectory math
- At-rest detection
- Hit/miss zone logic
- Score threshold and shot-limit rules
- Storage fallback on failure

Rendering and touch feel are not unit tested. Those are verified by driving the game in a browser preview at phone dimensions.

## Scope of v1

**Five levels.** Enough to introduce the mechanics and vary them: early levels teach drag-to-launch against a simple distance zone, later ones introduce moving targets and tighter zones. Levels are data, so extending beyond five later requires no code changes.

## Open items for implementation planning

- Exact tuning values (gravity, power scaling, at-rest thresholds, virtual world height) to be determined by feel during implementation. These cannot be settled on paper.
