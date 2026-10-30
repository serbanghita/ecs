# World Stop Inside Frame

`World.stop()` cancels only `_animationFrameId`. When it is called from inside the loop callback (a system,
`callbackFnAfterSystemsUpdate`, or an event handler they invoke), that id belongs to the frame already running,
and the loop requests the next frame unconditionally at its end (`src/World.ts`, the
`requestAnimationFrame(loop)` call after the systems pass). The world keeps looping forever. `clear()` calls
`stop()` and has the same defect; it empties `systems`, so the leaked loop runs nothing, but it still fires every
frame. Any caller that stops or clears a world from inside a system, from `callbackFnAfterSystemsUpdate` or from
an event handler they invoke leaks one loop. game-app used to do this on every player death; since the 2.1.0 work
it defers the restart with `queueMicrotask`, so the bug is latent in the monorepo (no consumer stops or clears a
world mid-frame today).

Present in 2.1.0 (`2f9d56c`). Found during critique iteration 2 of the identity plan (archived at
`.planning/archived/2026-10-30_20-18-17_issue-1-component-identity/`) and independent of it. Scratch
reproduction: a system that calls `world.clear()` printed `ZOMBIE: rAF requests before frame 1 after frame 2`.

Ships as 2.1.1 (chapter 2).

## Chapter 1: Loop token

A single boolean is not enough: each `startLoop()` call creates a new `loop` closure, so `stop()` then `start()`
inside one frame would leave the old closure seeing "running" again and rescheduling, and two loops would run. The
world therefore tracks which loop is current:

- `World` gets a private `_loopId = 0`. `stop()` increments it (retiring whatever loop is running) and cancels the
  pending id as today
- `start()` increments `_loopId` at its top, after `assertRegistryIsCurrent()`, and records the value. It runs the
  one-shot pass, then calls `startLoop()` only if `_loopId` still equals the recorded value, so a one-shot system
  that calls `stop()` prevents the loop from starting
- `startLoop()` captures the current `_loopId` in the closure (`myLoopId`). The closure returns at its top when
  `this._loopId !== myLoopId` (covers a frame that was already queued when `stop()` ran and could not be cancelled)
- the systems `forEach` skips the remaining systems once the id no longer matches, so a system that stops the
  world is the last one to run in that frame
- `callbackFnAfterSystemsUpdate` runs only while the id still matches
- every `requestAnimationFrame(loop)` call inside the closure (the paused branch, the fps-cap skip branch and the
  end of the frame) happens only while the id still matches
- `pause()` and `resume()` are unchanged; they keep the loop alive by design
- calling `start()` while a loop is running, outside any frame, now replaces that loop: the old loop's queued
  frame fires once, fails the token check and stops (before this change it added a second loop). No test is
  required for this case

Affected files:

- src/World.ts
- src/tests/World.test.ts
- CHANGELOG.md (`## [Unreleased]` / `### Fixed`)

Verification:

- `src/tests/World.test.ts` (already stubs `requestAnimationFrame`): a system whose `update` calls
  `world.stop()`. After running the queued frame, the number of `requestAnimationFrame` calls is unchanged
  (1 before, 1 after), so no frame is queued after it. Test-first: on the current code the count goes from 1 to 2
- `start()`, keep the queued callback, call `world.stop()` from outside, then fire the kept callback by hand
  (simulating a cancel that lost the race): no system runs and no new frame is requested. Test-first: on the
  current code the system runs and a new frame is requested
- the same with `world.clear()` called from a system, and with `stop()` called from
  `callbackFnAfterSystemsUpdate`
- a system registered after the stopping one does not run in that frame
- a one-shot system (`runOnlyOnce()`) whose `update` calls `world.stop()`: `start()` requests no frame
- a system that calls `world.stop()` then `world.start()` in its `update`: after that frame exactly one frame is
  queued, and running it executes each system once (no second loop)
- `stop()` followed by `start()` outside a frame runs again: new frames are requested and systems run
- `npm test`, `npm run lint` and `npx tsc --noEmit -p .` pass
- downstream, because the monorepo links this working tree:
  - `cd /Users/sghita/work/GameMonorepo/packages/game-kilmil2d && npx vitest run`: no failures beyond the
    pre-existing `npcVision.test.ts > is a semi-transparent gray` (baseline on 2026-10-30: 1 failed, 35 passed)
  - `cd /Users/sghita/work/GameMonorepo/packages/game-app && npx vitest run`: 3 of 3 files pass (baseline on
    2026-10-30)

## Chapter 2: Release 2.1.1

Same flow as the 2.1.0 release (`.planning/release-2-1-0/`). The npm package ships TypeScript source only;
`.npmignore` and `.gitattributes` from 2.1.0 already exclude `dist/` and `.planning/`.

- `npm version 2.1.1 --no-git-tag-version`
- `CHANGELOG.md`: rename `## [Unreleased]` to `## [2.1.1] - <release date>` and add an empty `## [Unreleased]`
  above it; its `### Fixed` section holds the chapter 1 entry
- `npm run build` to refresh the tracked `dist/ecs.js` (not published)
- gate on the working tree: `npm test`, `npm run lint`, `npm run build`, and `npm pack --dry-run` listing the same
  12 files as 2.1.0
- commit `package.json`, `package-lock.json`, `CHANGELOG.md`, `dist/ecs.js` with the message
  `Release 2.1.1: stop() and clear() end the loop when called inside a frame`, following the commit policy
- `git tag -s v2.1.1 -m "Release 2.1.1"`; `git tag -v v2.1.1` shows a good signature from
  `6A4ACBB9E82812953232565E87AD4E16058BB1CA`; `git archive v2.1.1 | tar -t | grep -E "^dist/|^\.planning/"` prints
  nothing
- confirm with the user, then `git push origin main` and `git push origin v2.1.1`
- the user runs `! npm publish --otp=<code>` (npm requires two-factor authentication for this account)

Affected files:

- package.json
- package-lock.json (version fields)
- CHANGELOG.md
- dist/ecs.js (rebuilt, tracked, not published)

Verification:

- `git diff -- package.json package-lock.json` shows only version lines
- `grep -n "^## \[" CHANGELOG.md` shows `[Unreleased]`, then `[2.1.1] - <date>`, then `[2.1.0] - 2026-10-30`
- `git status -sb` shows no "ahead"; `git ls-remote --tags origin v2.1.1` returns the tag
- `npm view @serbanghita-gamedev/ecs version` returns 2.1.1 and `npm view @serbanghita-gamedev/ecs dist.fileCount`
  returns 12 (the registry can take a minute to list a new version)
