# Execution Log: World Stop Inside Frame

Started: 2026-10-30 18:51:24 UTC

---

## Step 1: Chapter 1, loop token

Result: COMPLETED
Duration: 1m 6s
Files changed: src/World.ts, src/tests/World.test.ts, CHANGELOG.md
Tests: `npm test` PASSED ( Test Files 9 passed (9) Tests 123 passed (123) ); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED; downstream kilmil2d  Test Files  1 failed | 35 passed (36), game-app  Test Files  3 passed (3)

Output:
Tests first: new describe("stop inside a frame") with 8 tests; 7 failed on the current code (stop() from a system,
uncancelled queued frame after stop(), clear() from a system, stop() from callbackFnAfterSystemsUpdate, system
registered after the stopping one, one-shot system calling stop(), stop() then start() inside a frame) and the
positive control "stop() then start() outside a frame runs again" passed.
Change: private `_loopId`; `start()` takes a new id, runs the one-shot pass and starts the loop only if the id
is unchanged; the loop closure captures `myLoopId` and returns at its top, skips remaining systems, skips the
after-update callback and skips the reschedule once the id no longer matches; `stop()` advances the id before
cancelling the pending frame. CHANGELOG Unreleased / Fixed entry added.
After: all 8 new tests pass; full suite  Test Files 9 passed (9) Tests 123 passed (123) ; TSC_OK; lint 0;
kilmil2d  FAIL  src/utils/__tests__/npcVision.test.ts > NPC_VISION_OVERLAY_COLOR > is a semi-transparent gray  Test Files  1 failed | 35 passed (36) (only the pre-existing npcVision failure); game-app  Test Files  3 passed (3) .

---

## Step 2: Chapter 2, release 2.1.1 (in progress)

`npm version 2.1.1 --no-git-tag-version`: v2.1.1; `git diff` on the package files shows only version lines.
CHANGELOG: "## [Unreleased]" empty, "## [2.1.1] - 2026-10-30" holds the Fixed entry, then "## [2.1.0] - 2026-10-30".
`npm run build`: dist/ecs.js rebuilt (contains _loopId).
Gate:  Test Files 9 passed (9) Tests 123 passed (123) ; lint 0; `npm pack --dry-run`: 12 files, none under dist/ or .planning/.
Release commit 0cd40cb, GPG good signature, no attribution lines. Tag v2.1.1 signed and verified; git archive v2.1.1 has
0 entries under dist/ or .planning/.
Pending user confirmation: push main and v2.1.1; then the user runs npm publish with OTP.
Push: `git push origin main` and `git push origin v2.1.1` done; `git status -sb` shows no "ahead";
`git ls-remote --tags origin v2.1.1` returns the tag. Waiting for the user's `npm publish --otp`.
Publish, run by the user with `npm publish --otp=<code>`: `+ @serbanghita-gamedev/ecs@2.1.1`, 12 files, 12.9 kB,
shasum de1eef612fdd3b29f597cc2cdba0649c4e8ab3f1. Registry: `npm view @serbanghita-gamedev/ecs version` returns
2.1.1, `dist.fileCount` is 12, the downloaded tarball holds exactly the 12 expected files.

Result: COMPLETED
Duration: 4m 47s
Files changed: package.json, package-lock.json, CHANGELOG.md, dist/ecs.js (release commit 0cd40cb, tag v2.1.1)
Tests: `npm test` PASSED (123) as the gate and again as the final run

---

## Summary

- Total steps: 2
- Completed: 2
- Failed: 0
- Skipped: 0
- Verified by tests: 2 of 2 (step 1 by its 8 new tests and the full suite; step 2 by the gate, the final run and
  the registry checks)
- Git commits: 2acc446 (step 1), 0cd40cb (release 2.1.1, tag v2.1.1)
- Final run:  Test Files 9 passed (9) Tests 123 passed (123) 
