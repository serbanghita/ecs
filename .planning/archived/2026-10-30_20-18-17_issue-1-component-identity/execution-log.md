# Execution Log: Issue 1 Component Identity

Started: 2026-10-30 16:51:55 UTC

Starting point: the uncommitted working tree (earlier implementation), per the plan note. Step 6 (frame guard)
pauses for the user's go-ahead because it depends on the monorepo plan.

---

## Step 1: Chapter 1, identity storage in the registry

Result: COMPLETED
Duration: 1m 19s
Files changed: src/Component.ts, src/ComponentRegistry.ts, src/tests/ComponentRegistry.test.ts
Tests: `npx vitest run src/tests/ComponentRegistry.test.ts` PASSED (18); `npm test` PASSED (106); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED

Output:
Tests first: two new tests failed on the working tree before the change:
  x rejects values that are not component classes without consuming a bit index (expected [Function] to throw an error)
  x indexOf returns the registered index and undefined otherwise (TypeError: reg.indexOf is not a function)
The added `delete Component.prototype.bitIndex` assertion passed before the change (positive control: the
getter was already non-configurable in the working tree).
Changes: identity Map moved onto the registry instance (`bitIndexByConstructor`), public `indexOf`,
`bitIndexOf` reads the singleton; `registerComponent` rejects non-Component classes
(`"bitIndex" in Object(prototype)`) and empty names before any state change; `Component.ts` keeps
`declare readonly bitIndex` and installs the non-configurable runtime getter after the class body.
After: `Tests  18 passed (18)`, `Tests  106 passed (106)`, TSC_OK, lint clean.
Consumer compile check (scratch tsconfig target es2020, subclass with `declare readonly bitIndex`):
TS2610 gone; remaining TS2352 x1, TS2367 x1 (pre-existing on HEAD) and TS2550 x1 (`Object.hasOwn` in
Entity.ts, fixed by step 3).

---

## Step 2: Chapter 3, library reads identity only through the registry

Result: COMPLETED
Duration: 1m 44s
Files changed: src/Entity.ts, src/World.ts, src/tests/Entity.test.ts (restored to 598735c), src/tests/ComponentRegistry.test.ts
Tests: `npx vitest run src/tests/Entity.test.ts src/tests/ComponentRegistry.test.ts` PASSED (25); `npm test` PASSED (107); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED

Output:
Tests first (3 expected failures before the change):
  x Entity > addComponent: expected "notifyQueriesOfEntityComponentAddition" to be called with arguments: [ Entity, component ]
  x Entity > removeComponent: expected "notifyQueriesOfEntityComponentRemoval" to be called with arguments: [ Entity, component ]
  x addComponent of an unregistered class throws before constructing it: expected 1 to be +0
Changes: `Entity.addComponent` resolves the bit index right after the generation check and throws before the
instance cache or `new`; `notifyQueriesOfEntityComponentAddition/Removal` keep the two-argument signature and
resolve the index once in their first statement; `Entity.onAdd/onRemoveComponent` pass two arguments.
After: `Tests  25 passed (25)`, `Tests  107 passed (107)`, TSC_OK, lint 0 errors.
`grep -nE "\.bitIndex\b" src/*.ts` outside tests: no matches. `git diff 598735c -- src/tests/Entity.test.ts`: empty.
Benchmark (3 runs each, `.planning/issue-1-component-identity/bench.ts`):
  branch:   add+remove 2.616 / 2.653 / 2.633 ms/iter, hasComponent x3000 0.030 / 0.032 / 0.032 ms/iter
  baseline 598735c (worktree): add+remove 2.609 / 2.606 / 2.557 ms/iter, hasComponent 0.036 / 0.036 / 0.036 ms/iter
  add+remove within 5% of baseline (worst 3.8%); hasComponent faster than baseline. Acceptance met.

---

## Step 3: Chapter 4, entity-level identity checks

Result: COMPLETED
Duration: 0m 50s
Files changed: src/Entity.ts
Tests: `npm test` PASSED (107); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED; consumer compile check on lib es2020 PASSED (only pre-existing TS2352/TS2367 remain)

Output:
Check first: before the change the scratch consumer compile (target es2020) reported TS2550 x1
(`Object.hasOwn` in src/Entity.ts:40) next to the pre-existing TS2352 x1 and TS2367 x1.
Change: `Object.hasOwn(instance, "bitIndex")` replaced by `Object.prototype.hasOwnProperty.call(instance, "bitIndex")`.
The cached-instance constructor check, the `getComponent` constructor check and the declaration-based error
messages were already in place from the working tree and are covered by the existing tests
("getComponent rejects a different class with the same name", "a component declaring its own bitIndex field
is rejected", "an unregistered subclass does not inherit its parent's identity"): 3 passed.
After: `Tests  107 passed (107)`, TSC_OK, lint 0, `grep -n "Object.hasOwn" src/*.ts` empty, consumer compile:
TS2352 x1, TS2367 x1 only.

---

## Step 4: Chapter 5, component group validation

Result: COMPLETED
Duration: 0m 47s
Files changed: src/ComponentRegistry.ts, src/tests/ComponentRegistry.test.ts
Tests: `npm test` PASSED (      Tests  110 passed (110)); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED

Output:
Tests first (3 expected failures before the change):
  x re-registering a group with identical members and options is a no-op (expected group object to be the first one)
  x re-registering a group with different members or options throws and keeps the old group (expected [Function] to throw)
  x a component cannot belong to two groups (expected [Function] to throw)
The no-op test asserts object identity of the stored group, so it is stricter than the plan's positive control
and fails on the old code.
Change: `registerComponentGroup` validates every member, then returns when a group with the same name has the
same members (same constructors, same order) and the same `mutuallyExclusive` value, throws
`A component group named "g" is already registered with different members.` otherwise, throws
`Component X already belongs to the group "h".` when a member is already mapped to another group, and only
then writes the group bitset and maps.
After:       Tests  110 passed (110), TSC_OK, lint 0. `src/tests/ComponentGroup.test.ts` unchanged and passing.

---

## Step 5: Chapter 2A, generation guard placement

Result: COMPLETED
Duration: 0m 44s
Files changed: src/Entity.ts, src/Query.ts, src/World.ts, src/tests/ComponentRegistry.test.ts, src/tests/ComponentGroup.test.ts (setup order, carried from the working tree)
Tests: `npm test` PASSED (110); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED

Output:
Tests first: the stale-world test gained `new Entity(oldWorld, "x")`, `new Query(oldWorld, "q", ...)` and
`oldWorld.start()` assertions and failed on the first of them (expected [Function] to throw an error).
Change: `assertRegistryIsCurrent()` is called in the `Entity` and `Query` constructors and at the top of
`World.start()`; the calls in `createEntity` and `createQuery` were removed because the constructors cover them.
Call sites after the change: Entity constructor, addComponent, removeComponent, hasComponent; Query constructor;
World.start.
`src/tests/ComponentGroup.test.ts`: `beforeEach` now resets the registry before creating the `World`
(the old order is invalid under the new contract); its assertions are untouched.
After: `Tests  110 passed (110)`, TSC_OK, lint 0.

---

## Paused before step 6: Chapter 2B, frame guard on reset()

Execution stopped at the user's request on 2026-10-30 18:02:13 UTC. Step 6 depends on chapter 2 of
/Users/sghita/work/GameMonorepo/.planning/ecs-identity-downstream-fixes/ (deferred death restart in game-app).
Steps 1 to 5 are committed: 2004de6, 3562def, 35d2757, 881856a, 057a44d. Remaining: 6 (frame guard),
7 (documentation), 8 (downstream verification). Uncommitted: CHANGELOG.md and CLAUDE.md edits from the earlier
working tree, to be completed in step 7.

Execution stopped at step 6. Run `/plan:execute` to resume.

---

Resumed on 2026-10-30 18:06:41 UTC at step 6. Last plan-execute commit 057a44d matches the state file.
Dependency check: game-app `useGameEngine.ts` defers the death restart with `queueMicrotask` and has a
`.catch` (uncommitted in the monorepo); the kilmil2d MeleeRadiusSystem test fix (monorepo plan chapter 1) is
not done yet.

---

## Step 6: Chapter 2B, frame guard on reset()

Result: COMPLETED
Duration: 1m 34s
Files changed: src/frameGuard.ts (new), src/World.ts, src/ComponentRegistry.ts, src/tests/World.test.ts
Tests: `npx vitest run src/tests/World.test.ts -t "frame guard"` PASSED (5); `npm test` PASSED (115); `npx tsc --noEmit -p .` PASSED; `npm run lint` PASSED

Output:
Dependency: game-app's `playerDied` handler already defers the restart with `queueMicrotask` (monorepo working
tree) and its hook test "restarts the engine after the emitting frame, not synchronously inside it" passes.
Tests first (new `describe("frame guard")` in World.test.ts, 5 tests): 3 failed before the change because
`reset()` did not throw (from a system, from callbackFnAfterSystemsUpdate, from a one-shot system in start());
2 are positive controls that passed before and after (unrelated error releases the guard, queueMicrotask deferral).
Change: new internal module `src/frameGuard.ts` (enterFrame/exitFrame/isFrameRunning, not exported from
index.ts); `World.start()` wraps the one-shot pass and the loop wraps the systems pass plus
`callbackFnAfterSystemsUpdate` in enterFrame/try/finally exitFrame; `ComponentRegistry.reset()` throws
`reset() was called while a World frame is running; defer it with queueMicrotask.` before changing any state.
After: frame guard 5 passed, `Tests  115 passed (115)`, TSC_OK, lint 0.

---

## Step 7: Chapter 6, documentation

Result: COMPLETED
Duration: 1m 39s
Files changed: README.md, CLAUDE.md, CHANGELOG.md
Tests: no test to write for documentation; `npm test` PASSED (115), `npx tsc --noEmit -p .` PASSED, `npm run lint` PASSED, every error message quoted in CHANGELOG.md found in src/ with `grep -rF` (10 of 10)

Output:
README.md: new "Component registration" section (one registry per process, idempotent registration, unique
non-empty names, reset() invalidates live worlds, HMR recipe, never reset() during a frame, group rules).
CLAUDE.md: `src/frameGuard.ts` row in Source Structure; Bitset Representation describes the generation rule for
reset() with its call sites, the frame guard, and the group rules.
CHANGELOG.md: Unreleased entry for serbanghita/ecs#1 split into "Fixed" (the corruption bugs) and "Changed"
(every new throw with its migration, the frame guard, the new public members).

---

## Step 8: Chapter 7, downstream verification

Result: COMPLETED
Duration: 6m 22s (includes the pause while the monorepo fixes landed)
Files changed: none (verification only)
Tests: monorepo suites run against this working tree; see output. Not verified by me: the manual game-app death-restart check (the user reported the monorepo fixes as done)

Output:
First run (before the monorepo MeleeRadiusSystem test fix): kilmil2d `Test Files  2 failed | 34 passed (36)`,
the two MeleeRadiusSystem failures expected by the plan plus the pre-existing npcVision colour test.
Second run, after the monorepo fix (`createTestWorld(aiMatrix)` helper, HiddenInBush registered once):
  cd /Users/sghita/work/GameMonorepo/packages/game-kilmil2d && npx vitest run
    Test Files  1 failed | 35 passed (36); Tests  1 failed | 462 passed (463)
    only failure: npcVision.test.ts > NPC_VISION_OVERLAY_COLOR > is a semi-transparent gray (present on ECS HEAD,
    uncommitted monorepo work in src/utils/npcVision.ts)
  cd /Users/sghita/work/GameMonorepo/packages/shared && npx vitest run: Test Files  16 passed (16)
  cd /Users/sghita/work/GameMonorepo/packages/game-mapeditor && npx tsc --noEmit -p .: 0 errors
  cd /Users/sghita/work/GameMonorepo/packages/game-kilmil2d && npx tsc --noEmit -p .: TS5097 x32, TS2554 x20,
    TS2322 x10, TS2367 x1, TS2352 x1; no new category versus the HEAD baseline (TS5097 grew from 28 by the four
    new .ts imports)
  cd /Users/sghita/work/GameMonorepo/packages/game-app && npx vitest run: Test Files  3 passed (3), including
    "restarts the engine after the emitting frame, not synchronously inside it"
Plan test-first block against 598735c (both test files in a worktree): 19 failed | 30 passed (49). Every new
behavioural test fails on the baseline; the 28 pre-existing tests pass; the only new tests passing are the two
frame-guard positive controls. The identical-group re-registration test asserts object identity and fails on the
baseline, stricter than the plan's positive control.

---

## Summary

- Total steps: 8
- Completed: 8
- Failed: 0
- Skipped: 0
- Verified by tests: 7 of 8 (step 8 is verification only; its manual game-app check was not run by the executor)
- Git commits: 2004de6, 3562def, 35d2757, 881856a, 057a44d, 1854d8f, 7402b63
- Final run:  ✓ src/tests/BitsetCapacity.test.ts (4 tests) 6ms ✓ src/tests/System.test.ts (8 tests) 4ms ✓ src/tests/ComponentGroup.test.ts (2 tests) 2ms ✓ src/tests/World.test.ts (27 tests) 9ms ✓ src/tests/Entity.test.ts (6 tests) 8ms ✓ src/tests/Query.test.ts (43 tests) 13ms ✓ src/tests/ComponentRegistry.test.ts (22 tests) 8ms ✓ src/tests/ComponentMixins.test.ts (1 test) 2ms ✓ src/tests/Component.test.ts (2 tests) 1ms Test Files 9 passed (9) Tests 115 passed (115) ; tsc clean; lint clean
