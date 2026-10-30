# Issue 1 Component Identity

Fix serbanghita/ecs#1: component registration must be idempotent and component identity (bit index) must not be
corruptible. Reviewed against the 2.0.0 code (Uint32Array bitsets): none of the six acceptance criteria are met
today. Two adversarial reviews of a first fix attempt (prototype data property with `writable: false` plus a
registry Map) found four more holes: unregistered subclasses inherit the parent's index through the prototype
chain, `Object.defineProperty` still overwrites a configurable property, `reset()` leaves live worlds aliasing
re-registered components, and `registerComponentGroup` half-writes state before throwing on an unregistered
member. Critique iteration 1 added: the generation guard is bypassed by `new Query(...)`, identity state is split
between module scope and the instance, group re-registration keeps stale membership, and two compile breaks for
consumers (TS2610 on subclasses that declare `bitIndex`, `Object.hasOwn` below `lib: es2022`). Critique
iteration 2 (downstream impact on the monorepo at `/Users/sghita/work/GameMonorepo`, which links this working
tree through a `file:` dependency) added: the game's death-restart path resets the registry from inside a frame,
two kilmil2d tests relied on stale identity, and the plan had no downstream verification. game-mapeditor does
not use ECS at all.

Design decision: the registry instance is the single owner of identity. The library never reads
`prototype.bitIndex` internally. `Component.prototype.bitIndex` is a runtime getter over the registry, kept for
user code, and typed with `declare readonly` so subclasses keep compiling.

Non-goals: world-local registries, removing the singleton, changing the name-keyed `Entity.components` map,
supporting two distinct classes with the same name, protecting against a duplicated copy of this package in
`node_modules` (a second module has its own `Component` class and its own registry; nothing can be shared with
it). Release work (rebuild, version bump, tag) lives in the separate plan `.planning/release-2-1-0/`. The
`World.stop()`/`clear()` defect (the loop keeps rescheduling when stopped from inside a frame; present on HEAD)
lives in `.planning/world-stop-inside-frame/`. Consumer-side fixes in the monorepo (deferred death restart in
game-app, test registration in kilmil2d) live in
`/Users/sghita/work/GameMonorepo/.planning/ecs-identity-downstream-fixes/`.

Note: the working tree contains an earlier implementation (uncommitted). After this merge it differs from the plan
in: identity Map at module scope, accessor instead of `declare` plus runtime getter, `Object.hasOwn`, guard
placement, the third `notify*` parameter, group re-registration, construction before the registration check,
the frame guard on `reset()`, and the README. Execution adjusts the working tree to the plan.

## Acceptance criteria to tests

| Criterion from the issue | Proven by (`src/tests/ComponentRegistry.test.ts` unless stated) |
|---|---|
| Registering the same constructor twice is idempotent | "registering the same class twice keeps its bit index" |
| A second `World` re-registering cannot invalidate an existing world | "re-registering through a second world keeps the first world's entities and queries valid" |
| Reset cannot leave stale identities that alias new registrations | "reset removes bit indices so stale classes cannot alias new registrations", "a world created before reset refuses to operate on stale identities" (including `new Query(...)` and `start()`) |
| Same-named distinct constructors are rejected explicitly | "rejects a different class with an already registered name", "getComponent rejects a different class with the same name" |
| Identity cannot be externally overwritten | "bit index cannot be overwritten from outside the registry", "a component declaring its own bitIndex field is rejected", "an unregistered subclass does not inherit its parent's identity" |
| Regression tests for duplicate registration, two worlds, reset then re-register, duplicate names | the five rows above, plus the group tests in chapter 5 |

Test-first proof: every new test that asserts new behaviour must fail on HEAD (see the positive controls below).
Run before claiming any chapter done, and again whenever a test is added:

```
git worktree add /tmp/ecs-head HEAD && ln -s "$PWD/node_modules" /tmp/ecs-head/node_modules
cp src/tests/ComponentRegistry.test.ts src/tests/World.test.ts /tmp/ecs-head/src/tests/
(cd /tmp/ecs-head && npx vitest run src/tests/ComponentRegistry.test.ts src/tests/World.test.ts)
git worktree remove --force /tmp/ecs-head
```

Expected: every new test that asserts new behaviour fails on HEAD; the six pre-existing `ComponentRegistry`
tests and the existing `World` tests pass. Three new tests are positive controls that pin behaviour HEAD already
has, and pass on HEAD by design: the identical group re-registration test (chapter 5), the `queueMicrotask`
deferral test and the guard-released-after-an-unrelated-error test (both chapter 2). Any other new test that
passes on HEAD is a defect in the test. Current state for `ComponentRegistry.test.ts`: 11 failed, 6 passed on
`598735c`.

## Chapter 1: Identity storage in the registry

`ComponentRegistry` gains a private instance field `bitIndexByConstructor: Map<typeof Component, number>` keyed by
constructor. All identity state (the Map, `nextBitIndex`, `_generation`) lives on the instance, one owner. The
exported function `bitIndexOf(ctor)` reads the singleton:

```ts
export function bitIndexOf(ctor: typeof Component): number | undefined {
  return ComponentRegistry.getInstance().indexOf(ctor);
}
```

`indexOf` is a public method on the registry (one `Map.get`). `ComponentRegistry.ts` imports `Component` with
`import type`, so `Component.ts` can import `bitIndexOf` at runtime without a cycle.

`registerComponent`, in this order, before any state changes:

- throws `Only classes extending Component can be registered.` unless the value is a function whose prototype
  chain contains the `bitIndex` getter: `typeof d === "function" && "bitIndex" in Object(d.prototype)`. The
  getter exists only on `Component.prototype`, so this is exactly "extends Component" without a value import
- throws `Component classes must have a non-empty name.` when `d.name === ""` (anonymous and factory-made
  classes), because the name is the `Entity.components` key
- returns early (no-op) when the constructor is already in the Map
- throws `A different component class named "X" is already registered.` when the name is taken by another
  constructor
- otherwise allocates `nextBitIndex++` and writes the Map, `bitIndexToComponentMap` and `components` (by name)

A failed call never consumes an index.

`Component.ts`:

- keeps `declare readonly bitIndex: number;` in the class body for typing. Subclasses that re-declare the field
  (the pattern shown by the 2.0.0 source) keep compiling
- after the class body installs the runtime getter with `Object.defineProperty(Component.prototype, "bitIndex",
  { get() { return bitIndexOf(this.constructor) }, enumerable: false, configurable: false })`
- `this.constructor` on a subclass prototype is the subclass, so an unregistered subclass reads `undefined`
- `Object.defineProperty(Component.prototype, "bitIndex", ...)`, `delete`, and plain assignment
  `instance.bitIndex = n` all throw `TypeError`

Accepted limit: `Object.defineProperty(SubClass.prototype, "bitIndex", ...)` can still shadow the getter for user
code reading `instance.bitIndex`. The library does not read from there (chapter 3), so entities and queries stay
correct.

Affected files:

- src/ComponentRegistry.ts
- src/Component.ts

Verification:

- `src/tests/ComponentRegistry.test.ts`: registering `Body` twice and via `registerComponents([Body, Pos, Body])`
  keeps `Body.prototype.bitIndex === 0` and `getComponentCount() === 2`
- two classes both named `Dup`: second `registerComponent` throws, count stays 1, `getComponent("Dup")` is the first
- `class Plain { constructor(public properties: object) {} }` throws `Only classes extending Component`, count
  stays 0; `class extends Component<{}> {}` (name `""`) throws `non-empty name`, count stays 0;
  `registerComponent(() => {})` throws, count stays 0; `Body` registered next gets index 0
- `prototype.bitIndex = 99`, `instance.bitIndex = 99`, `delete Body.prototype.bitIndex` and
  `Object.defineProperty(Component.prototype, "bitIndex", {value: 99})` all throw `TypeError`;
  `Object.hasOwn(Body.prototype, "bitIndex")` is false
- `class SubBody extends Body {}` unregistered: `SubBody.prototype.bitIndex` and `new SubBody().bitIndex` are
  `undefined`; after registering it gets index 1
- `src/tests/Component.test.ts` (existing): unregistered `PositionOnScreen` instance reads `bitIndex` undefined
- consumer compile check, run from a scratch folder with a `tsconfig` of `target: es2020, lib: [es2020, dom],
  strict: true` and the file `class WithDeclare extends Component<{}> { declare readonly bitIndex: number; }`
  importing `src/index.ts`: no TS2610 and no TS2550. The two TS2367/TS2352 errors at `src/Entity.ts` (group
  loop cast) are pre-existing on HEAD and out of scope
- verified in a scratch copy on 2026-10-30: the `declare` plus runtime getter and the `hasOwnProperty` change
  pass all 105 tests and the consumer check. That copy still used the module-level Map; the instance-owned Map
  with `indexOf` is verified by this chapter's tests during execution

## Chapter 2: Reset generation

`reset()` clears the identity Map together with the other maps and increments a private counter exposed as
`get generation(): number`. `World` captures `registryGeneration` at construction and gains
`assertRegistryIsCurrent()`, which throws
`The ComponentRegistry was reset after this World was created. Create a new World.` when the generations differ.

Called from:

- the `Entity` constructor and the `Query` constructor, so direct `new Entity(world, id)` and
  `new Query(world, id, filters)` are covered, not only the `World` factory methods (both classes are public
  exports and the suite itself uses `new Query`)
- `Entity.addComponent`, `Entity.hasComponent`, `Entity.removeComponent`
- `World.start()`, so a world that is already stale when the loop starts fails there

A reset during a frame is a separate case that `start()` does not cover. A system, or an event handler invoked
by a system, that calls `reset()` mid-frame leaves the rest of that frame running on the old world: the next
`addComponent` or `hasComponent` throws the generation error inside the `requestAnimationFrame` callback. The
game's death-restart path does exactly this: `PunchAttackSystem` emits `playerDied` while iterating its query,
and the game-app handler destroys the engine and calls `startGame`, whose first statement is `reset()`.
Reproduced in Vitest with this library alone: no error on HEAD, generation error on the branch. The contract is
therefore: never call `reset()` from a system or from an event emitted during a frame; defer it with
`queueMicrotask`. The consumer fix is in `/Users/sghita/work/GameMonorepo/.planning/ecs-identity-downstream-fixes/`.

The contract is enforced, not only documented. A new internal module `src/frameGuard.ts` (not exported from
`index.ts`) holds a counter with `enterFrame()`, `exitFrame()` and `isFrameRunning()`. The `World` loop calls
`enterFrame()` before the systems pass and `exitFrame()` in a `finally` after `callbackFnAfterSystemsUpdate`,
so a system that throws cannot leave the counter raised. `ComponentRegistry.reset()` throws
`reset() was called while a World frame is running; defer it with queueMicrotask.` when `isFrameRunning()` is
true, before changing any state. A separate module avoids a runtime import cycle between `World.ts` and
`ComponentRegistry.ts`. A reset deferred with `queueMicrotask` runs after the callback returns, when the counter
is zero. `World.start()` wraps its one-shot pass (systems with `ticksToRunBeforeExit === 1`, run before the loop
starts) in the same `enterFrame()` / `exitFrame()` pair with `exitFrame()` in a `finally`, so a one-shot system
cannot reset the registry and leave `start()` to launch the loop on a stale world.

Depends on: chapter 2 of `/Users/sghita/work/GameMonorepo/.planning/ecs-identity-downstream-fixes/` (deferred
death restart in game-app) is executed first. Implement the frame guard after it. The monorepo links this working
tree, so the guard is live as soon as it is written; before the consumer fix, a player death would make
`startGame` reject on `reset()` after `engine.destroy()` already ran, and game-app has no `.catch` on that
promise, so the game would end instead of restarting.

Not called from `World.createEntity` and `World.createQuery` (the constructors cover them), `getEntity`,
`removeEntity`, `createSystem`, the loop body, and `Query.execute()`. `execute()` returns a `dataSet` computed
under the old generation; it is consistent with the entities' old bitsets, and every operation that could change
it already throws, so it cannot alias. Guarding it would cost a check on the hottest read path for nothing.

Cost: one method call, two property reads and one integer compare per `hasComponent`.

Affected files:

- src/ComponentRegistry.ts
- src/World.ts
- src/Entity.ts
- src/Query.ts
- src/frameGuard.ts (new, internal)
- src/tests/ComponentGroup.test.ts: its `beforeEach` created the `World` and then called `reset()` under it,
  which the new contract defines as invalid. Swapping the two lines makes the setup follow the contract; the
  assertions are untouched

Verification:

- `src/tests/ComponentRegistry.test.ts`: register `[Body, Pos]`, create world, entity with `Body`, query
  `{all:[Body]}`; `reset()`; register `[Pos, Body]` in the other order. `hasComponent(Body)`,
  `hasComponent(Pos)`, `addComponent`, `removeComponent`, `createEntity`, `createQuery`,
  `new Entity(oldWorld, "x")`, `new Query(oldWorld, "q", { all: [Pos] })` and `oldWorld.start()` all throw
  the generation error. A new `World` works and `{all:[Body]}` on it is empty
- `src/tests/ComponentRegistry.test.ts`: after `reset()`, `Body.prototype.bitIndex` is `undefined` and
  `hasComponent(Body)` / `addComponent(Body)` on a fresh world throw `Please register the component Body`
- `src/tests/World.test.ts` (already stubs `requestAnimationFrame`): a system whose `update` calls
  `ComponentRegistry.getInstance().reset()` makes the frame throw
  `reset() was called while a World frame is running`; the registry is unchanged (`getComponentCount()` and
  `generation` as before); after the frame `reset()` succeeds. The same with `reset()` called from
  `callbackFnAfterSystemsUpdate`. A system that throws an unrelated error leaves the guard released: `reset()`
  right after that frame succeeds
- the same test file: a one-shot system (`ticksToRunBeforeExit: 1`) whose `update` calls `reset()` makes
  `start()` throw the frame-guard error, `requestAnimationFrame` is not called, and `reset()` succeeds afterwards
- the same test file: a system that calls `reset()` through `queueMicrotask` does not throw; after
  `await Promise.resolve()` the reset has happened and a `World` created in that microtask works
  (`createEntity`, `addComponent`, `hasComponent`)
- whole suite: `npm test` passes; the only existing test file changed is `ComponentGroup.test.ts` (setup order)

## Chapter 3: Library reads identity only through the registry

Every internal place that read `prototype.bitIndex` or `instance.bitIndex` switches to `bitIndexOf(ctor)`:

- `Entity.addComponent`: resolves `bitIndex` from the declaration as the first step after the generation check
  and throws `Please register ...` before touching the instance cache or calling `new`, so an unregistered
  class's constructor never runs. The index is then used for the group lookup and the bitset write. The mutually
  exclusive group loop uses `this.hasComponent(groupComponent)` instead of reading the member's prototype
- `Entity.removeComponent`: resolves the index from the declaration; the old `has no bit index` guard is removed
  because `hasComponent` already threw for unregistered classes
- `Entity.hasComponent`: `bitIndexOf(ctor)`, throws `Please register ...` when undefined
- `Query`: registration check and the `all`/`any`/`none` bitset setup
- `ComponentRegistry.registerComponentGroup`: see chapter 5
- `World.notifyQueriesOfEntityComponentAddition/Removal`: keep the two-argument public signature. Each method
  resolves `const bitIndex = bitIndexOf(component.constructor)` once in its first statement and uses it in the
  loop. No third parameter: a default parameter would also be evaluated once per call, and the explicit argument
  only saved one `Map.get` per add or remove at the price of a signature change and three test edits

Affected files:

- src/Entity.ts
- src/Query.ts
- src/World.ts
- src/ComponentRegistry.ts

Verification:

- `grep -n "\.bitIndex" src/*.ts` outside `src/tests` returns only the `bitIndexToComponentMap` lines in
  `ComponentRegistry.ts`
- `src/tests/Entity.test.ts` is unchanged: its three `toHaveBeenCalledWith(entity, component)` assertions pass
  as they are
- `src/tests/ComponentRegistry.test.ts`: a class whose constructor records a call is registered, then
  unregistered via `reset()` plus a new world; `addComponent` on it throws and the constructor was not called
- benchmark: `npx tsx .planning/issue-1-component-identity/bench.ts`, run three times on HEAD and three times
  on the branch, from the repository root. Baseline on `598735c` (measured 2026-10-30): add+remove 1000
  entities x3 components with 20 queries 2.55 to 2.61 ms/iter, `hasComponent` x3000 0.036 to 0.040 ms/iter.
  Current working tree: add+remove 2.55 to 2.60 ms/iter (within noise), `hasComponent` 0.025 to 0.029 ms/iter
  (one `Map.get` plus the generation check replaced two prototype-chain reads). Acceptance: add+remove within
  5% of baseline and `hasComponent` not slower than baseline. Numbers quoted in critique iteration 1 (14.8 ms,
  0.095 ms) came from a copy of the script run outside the repository and are not comparable. The working-tree
  numbers measure the earlier module-level Map; the planned `bitIndexOf` adds a `ComponentRegistry.getInstance()`
  call per lookup. Re-run the benchmark after chapter 1 is implemented; if `hasComponent` is slower than the HEAD
  baseline, cache the instance in a module-level `let` assigned by `getInstance()`
- reviewer scenario "defineProperty(Body.prototype, 'bitIndex', {value: 1}) then addComponent(Body) makes
  hasComponent(Pos) true" no longer reproduces

## Chapter 4: Entity-level identity checks

- `addComponent` reuses the cached instance only when `instance.constructor === componentDeclaration`;
  otherwise a new instance is built. Because chapter 3 moved the registration check before this step, an
  unregistered same-named class throws without being constructed
- `addComponent` throws `Component X must not declare its own "bitIndex" field; it is assigned by the
  ComponentRegistry.` when `Object.prototype.hasOwnProperty.call(instance, "bitIndex")`, closing the
  instance-field shadowing route (TS `useDefineForClassFields` with target ES2022 defines own properties).
  `Object.hasOwn` is not used: the package ships TypeScript source (`package.json` `main` is `./src/index.ts`),
  so consumers below `lib: es2022` would fail to compile
- `getComponent(declaration)` throws `Component requested X is non-existent.` when the stored instance's
  constructor is not `declaration`, so a same-named foreign class cannot read another class's instance
- error messages use `componentDeclaration.name` rather than `instance.constructor.name`

Affected files:

- src/Entity.ts

Verification:

- `src/tests/ComponentRegistry.test.ts`: with `First` registered and `Second` (same name, unregistered),
  `addComponent(Second)` throws `Please register the component Dup`, `getComponent(First).properties.v` is still 1,
  `getComponent(Second)` throws `Dup is non-existent`
- same-named subclass `{ Body: class extends Body {} }.Body` on `addComponent` throws `Please register the
  component Body` and the real `Body` instance is untouched
- a component whose constructor defines an own `bitIndex` property: `addComponent` throws the own-field error and
  `hasComponent` stays false
- `grep -n "Object.hasOwn" src/*.ts` returns nothing; the chapter 1 consumer compile check passes on
  `lib: es2020`

## Chapter 5: Component group validation

`registerComponentGroup(name, members, options)`:

- first maps every member through `bitIndexOf`, throwing
  `Please register the component X in the ComponentRegistry before adding it to the group "g".` on the first
  unregistered member, before writing anything
- if a group with this name exists and has the same members (same constructors, same order) and the same
  `mutuallyExclusive` value, returns without changes (no-op, so an HMR re-run of module-level setup is safe)
- if a group with this name exists with different members or options, throws
  `A component group named "g" is already registered with different members.` (consistent with the same-name
  rule for components; `reset()` is the way to redefine)
- if a member already belongs to another group, throws
  `Component X already belongs to the group "h".` (`componentToGroupMap` supports one group per component)
- only then writes the group bitset, `componentToGroupMap` and `componentGroups`

Affected files:

- src/ComponentRegistry.ts

Verification:

- `src/tests/ComponentRegistry.test.ts`: `registerComponentGroup("g", [Body, Pos, Keyboard])` with `Keyboard`
  unregistered throws naming `Keyboard`; afterwards `getComponentGroup("g")` is undefined and
  `getComponentGroupName(0)` and `(1)` are undefined
- unregistered subclass `SubBody` in a group throws; after registering `SubBody`, `getComponentGroupName(0)` is
  still undefined (the parent's bit was never touched)
- registering `g` as `[A, B]` twice with the same options leaves one group and `getComponentGroupName` unchanged
- registering `g` as `[A, B]` then `[B, K]` throws `different members`; `getComponentGroupName(A)` is still `g`
  and `getComponentGroupName(K)` is undefined; adding `B` then `A` to an entity removes `B` (old group intact)
- registering `h` with `B` after `g` contains `B` throws `already belongs to the group "g"`
- `src/tests/ComponentGroup.test.ts` (existing) passes unchanged apart from the chapter 2 setup order

## Chapter 6: Documentation

- `README.md`: new section "Component registration" (the only user-facing document; `CLAUDE.md` is excluded
  from the npm package by `.npmignore`):
  - one registry per process, shared by every `World`
  - registration is idempotent per class; registering again returns the same identity
  - class names must be non-empty and unique across every package that registers components into the same
    process
  - `reset()` invalidates every live `World`; a stale world throws on its next entity, query or `start()` call
  - for HMR: call `reset()`, re-register, then create a new `World`
  - never call `reset()` from a system or from an event handler that runs during a frame; defer it with
    `queueMicrotask`. The registry throws if a frame is running
  - component groups: same-name re-registration must repeat the same members; a component belongs to one group
- `CLAUDE.md` "Bitset Representation": describe identity as registry-owned with a read-only getter, idempotent
  re-registration, name collision rejection, and the generation rule for `reset()`
- `CHANGELOG.md` Unreleased entry referencing serbanghita/ecs#1, split in two sections:
  - "Fixed": the corruption bugs (duplicate registration advanced identity, second world invalidated the first,
    reset aliasing, same-name collision in `Entity.components`, subclass inheriting identity, group half-writes)
  - "Changed", one line each with the migration: same-name registration throws; non-class and empty-name
    registration throws; assignment to `bitIndex` throws; a `World` created before `reset()` throws (create a
    new one); an own `bitIndex` field is rejected; `getComponent` rejects a same-named foreign class; group
    re-registration with different members throws; `reset()` during a running `World` frame throws (defer it
    with `queueMicrotask`); new public members `ComponentRegistry.generation`, `ComponentRegistry.indexOf`,
    `World.assertRegistryIsCurrent`

Affected files:

- README.md
- CLAUDE.md
- CHANGELOG.md

Verification:

- all three files read back and match the final code; every error message quoted in the CHANGELOG exists in
  `src/` (`grep -F` each one); `npm run lint` and `npx tsc --noEmit -p .` pass

## Chapter 7: Downstream verification

The monorepo at `/Users/sghita/work/GameMonorepo` resolves `@serbanghita-gamedev/ecs` through
`"file:../../../gamedev-published-repos/ecs"` in `packages/game-kilmil2d/package.json`, and
`node_modules/@serbanghita-gamedev/ecs` is a symlink to this working tree. Every working-tree state of this
repository is therefore live in `packages/game-kilmil2d` (100 importing files), `packages/shared` (16 files, no
declared dependency, resolved through the hoisted link) and, after `npm run build:engine`, in `packages/game-app`.
`packages/game-mapeditor` does not use ECS: no dependency, no import, and its only `shared` import
(`shared/maze`) contains no ECS code.

Depends on: `/Users/sghita/work/GameMonorepo/.planning/ecs-identity-downstream-fixes/` executed (test
registration fix and the deferred restart). Until then the kilmil2d suite has two expected failures in
`MeleeRadiusSystem.test.ts`.

Affected files:

- none in this repository (verification only)

Verification, run before every commit to this repository:

- `cd /Users/sghita/work/GameMonorepo/packages/game-kilmil2d && npx vitest run`: no failures beyond those
  present on ECS HEAD (currently `npcVision.test.ts > is a semi-transparent gray`, caused by uncommitted
  monorepo work in `src/utils/npcVision.ts`). Baseline on 2026-10-30 against ECS HEAD: 1 file failed, 35
  passed. Against the current branch, until the downstream test fix lands: 2 files failed, 34 passed
- `cd /Users/sghita/work/GameMonorepo/packages/shared && npx vitest run`: 16 of 16 files pass
- `cd /Users/sghita/work/GameMonorepo/packages/game-mapeditor && npx tsc --noEmit -p .`: 0 errors
- `cd /Users/sghita/work/GameMonorepo/packages/game-kilmil2d && npx tsc --noEmit -p .`: no error category
  beyond those on ECS HEAD. HEAD baseline on 2026-10-30, 60 errors: TS5097 x28 (`.ts` import extensions),
  TS2554 x20, TS2322 x10, TS2367 x1 and TS2352 x1 (group loop cast in `Entity.ts`). TS5097 may grow by the
  number of new `.ts` imports (62 on the current branch, the two extra being TS5097). kilmil2d builds with
  esbuild, which does not run `tsc`, so the build is unaffected
- manual, game-app: `npm run dev:game-app`, lose the last life while two NPCs are punching at once; the console
  shows no error and the game restarts with full lives
