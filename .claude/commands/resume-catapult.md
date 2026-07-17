---
description: Resume work on the Cat-a-pult game in a fresh chat
---

We're resuming work on Cat-a-pult, a single-player landscape PWA game for
Android. Before doing anything else:

1. Read `docs/superpowers/STATUS.md` for the current state.
2. Read the newest spec in `docs/superpowers/specs/` and the newest plan in
   `docs/superpowers/plans/`.
3. Run `npm test` to confirm the suite is green before changing anything.

Then give me a short, plain-language summary of where we left off and propose
the next concrete step. Remember:

- I'm non-technical. Do the hands-on building yourself and explain simply.
- **Feel is the thing that is unverified.** You cannot play it live in-session
  (the preview pane will not render and Chrome blocks localhost), so verify
  logic by importing the real modules and reading state/pixels back, and rely
  on me to play-test on my phone and report.
- Keep the split clean: pure logic in `ballistics/project/aim/creatures/levels/
  game/storage`, drawing only in `render.js`. Add a unit test for any rule or
  geometry change.
- The arena is a wedge, not a box: keep creatures inside `xLimitAt(z)` or they
  become unhittable. Collision must stay swept, not point sampled.
- After any change, remind me to hard-refresh (Ctrl+Shift+R) because of the
  service worker cache.
