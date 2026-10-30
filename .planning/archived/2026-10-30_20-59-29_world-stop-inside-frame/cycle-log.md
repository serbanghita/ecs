# Plan Cycle Log: World Stop Inside Frame

Started: 2026-10-30
Plan drafted by: user

---

## Iteration 1

Findings: 4 CONFIRMED, 1 UNVERIFIED
Merged: 5
Asked: 2
Not merged: 0

Merged:

- Overview - HEAD reference updated to 2.1.0 (`2f9d56c`), identity plan path points at the archive, and the
  game-app motivation now says the bug is latent because the restart is deferred with `queueMicrotask`
- Chapter 1 - `start()` takes the loop identity at its top and skips `startLoop()` when a one-shot system
  stopped the world; test added
- Chapter 1 - downstream verification added (game-kilmil2d and game-app suites, both run on 2026-10-30)

Asked:

- Chapter 1 - a boolean `_running` lets the old loop survive `stop()` then `start()` inside one frame (UNVERIFIED,
  traced from `src/World.ts:247` and `:324`). Use a loop token, a boolean with `start()` throwing mid-frame, or a
  boolean with the limit documented?
  Answer: loop token. Chapter 1 renamed "Loop token", the design uses a private `_loopId` captured per closure,
  and a test for `stop()` then `start()` inside one frame was added.
- Scope - the plan had no release steps for 2.1.1. Add a release chapter here or create a separate plan?
  Answer: add a release chapter here. Chapter 2 "Release 2.1.1" added, mirroring the 2.1.0 flow, with the
  user's own `npm publish --otp` step.

Not merged:

- none

---

## Iteration 2

Findings: 1 CONFIRMED, 1 UNVERIFIED
Merged: 2
Asked: 0
Not merged: 0

Merged:

- Chapter 1 - (UNVERIFIED, clarification only) the out-of-scope line now states that a repeated `start()`
  replaces the running loop under the token design, instead of adding a second loop as today
- Chapter 1 - the vacuous "later queued callback" check became "no frame is queued after it", plus a new test
  for the top-of-closure guard: a queued callback fired by hand after `stop()` runs no system and requests no frame

Asked:

- none

Not merged:

- none

---

## Iteration 3

Findings: 0 CONFIRMED, 0 UNVERIFIED
Merged: 0
Asked: 0
Not merged: 0

Merged:

- none

Asked:

- none

Not merged:

- none

---

## Summary

- Iterations run: 3 of 3
- Stopped because: no new findings
- Questions asked: 2 (loop design: loop token; release: chapter in this plan)
- Open items: none
