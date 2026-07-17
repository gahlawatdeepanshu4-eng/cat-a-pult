---
description: Refresh the Cat-a-pult handover/status doc so a fresh chat can pick up
---

Update `docs/superpowers/STATUS.md` so a new session can continue exactly where
we are. Refresh:

- The "Last updated" date.
- "Done this session": what actually changed, in plain language.
- Current state and any new decisions (game rules, tuning, controls).
- The immediate next step(s).
- Any new gotchas worth warning the next session about.
- Keep the "feel is unverified" section honest about what has and has not been
  play-tested on a real phone.

First run `npm test` and put the current pass count in the doc. Keep it concise
and skimmable. Then:

1. Update any memory files whose durable facts changed.
2. Commit the changes to git.
3. Give me a one-paragraph recap of where we are and what to say to start next
   time.
