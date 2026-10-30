# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- `World.stop()` and `World.clear()` now end the game loop when called from inside a frame (from a system, from `callbackFnAfterSystemsUpdate` or from an event handler they invoke). Previously the frame that was already running requested the next frame anyway and the world looped forever. Each `start()` now owns a loop token: `stop()` retires it, a frame queued before the stop runs nothing, a one-shot system that stops the world prevents the loop from starting, and `start()` while a loop runs replaces that loop instead of adding a second one

## [2.1.0] - 2026-10-30

### Fixed
- Component identity can no longer be corrupted (serbanghita/ecs#1):
  - registering the same class twice advanced its bit index, so a second `World` registering the same components invalidated the entities and queries of the first; registration is now idempotent per class
  - two distinct classes with the same name silently overwrote each other in `Entity.components`; the second registration now throws
  - `reset()` left the old bit indices on the prototypes, so classes registered before a reset aliased classes registered after it; identity now lives in the registry and is cleared with it
  - an unregistered subclass inherited its parent's bit index through the prototype chain and passed every registration check; it now reads `undefined`
  - `registerComponentGroup` wrote half of its state before throwing on an unregistered member; it now validates every member first

### Changed
- `ComponentRegistry.registerComponent` throws `Only classes extending Component can be registered.` for values that are not `Component` subclasses and `Component classes must have a non-empty name.` for anonymous classes; a failed call never consumes a bit index. Migration: give factory-made classes a name
- `ComponentRegistry.registerComponent` throws `A different component class named "X" is already registered.` when another class with that name is registered. Migration: keep class names unique across every package that registers into the same process; for hot module reloads that produce new constructors, call `reset()` and create a new `World`
- `Component.prototype.bitIndex` is a non-configurable, read-only getter over the registry; assigning to it throws a `TypeError`, and `Entity.addComponent` rejects an instance that carries its own `bitIndex` field (`must not declare its own "bitIndex" field`). Subclasses may still write `declare readonly bitIndex: number`
- `Entity.getComponent` throws `Component requested X is non-existent.` when the stored instance belongs to a different class with the same name
- `ComponentRegistry.reset()` increments `ComponentRegistry.generation`; a `World` created before the reset throws `The ComponentRegistry was reset after this World was created. Create a new World.` from the `Entity` and `Query` constructors, `addComponent`, `hasComponent`, `removeComponent` and `start()`. Migration: after `reset()`, re-register and create a new `World`
- `ComponentRegistry.reset()` throws `reset() was called while a World frame is running; defer it with queueMicrotask.` when called from a system, from `callbackFnAfterSystemsUpdate`, or from an event handler they invoke. Migration: wrap the reset in `queueMicrotask`
- `registerComponentGroup` throws `Please register the component X in the ComponentRegistry before adding it to the group "g".` for an unregistered member, is a no-op when the same group is registered again with the same members and options, throws `A component group named "g" is already registered with different members.` otherwise, and throws `Component X already belongs to the group "h".` when a member is in another group
- New public members: `ComponentRegistry.generation`, `ComponentRegistry.indexOf(ctor)`, `World.assertRegistryIsCurrent()`
- The npm package ships TypeScript source only; `dist/ecs.js` is no longer included
- First 2.x version on npm; see the 2.0.0 entry for the migration from 1.x

## [2.0.0] - 2026-10-29

### Changed
- **Breaking:** component matching moved from BigInt bitmasks to `Uint32Array` bitsets (`@serbanghita-gamedev/bitmask` 2.x `bitset` namespace). There is no longer any practical limit on the number of registered components, and matching is 2-3x faster past 64 components (serbanghita/ecs#10). Migration:

| 1.x | 2.0 |
|-----|-----|
| `Component.bitmask: bigint` | `Component.bitIndex: number` (0-based registration order) |
| `Entity.componentsBitmask: bigint` | `Entity.componentsBitset: Uint32Array` |
| `Query.all/any/none: bigint` | `Query.all/any/none: Uint32Array` |
| `ComponentRegistry.getLastBitmask()` | `ComponentRegistry.getComponentCount()` / `getBitsetCapacity()` |
| `ComponentRegistry.getComponentByBitmask(bigint)` | `ComponentRegistry.getComponentByBitIndex(number)` |
| `ComponentRegistry.getComponentGroupName(bigint)` | `ComponentRegistry.getComponentGroupName(number)` |
| `ComponentGroup.bitmask: bigint` | `ComponentGroup.bitset: Uint32Array` |

- `ComponentRegistry.reset()` clears the singleton in place instead of replacing the instance, so previously obtained references remain valid
- `World.createQuery` compares an existing query's filters with `Query.hasSameFilters()`
- `ComponentRegistry.createBitset()` returns a bitset sized for every registered component; entities grow their bitset on demand when a component registered later is added

### Added
- `ComponentGroup` type export
- Tests for registries with more than 32 and more than 64 components, bitset growth, and mutually exclusive groups across word boundaries

### Fixed
- `coverage/` and `scratch.ts` are excluded from the published npm package

## [1.1.0] - 2026-07-18

### Fixed
- Game loop no longer skips all system updates during the first second after `start()`
- `getSystem()` looked up the base `System` class instead of its argument and threw for every real lookup
- `System.runEveryTicks()` is now honored by the loop; `preUpdate()` was never being called
- `preUpdate()` returns whether the tick should run instead of overwriting the user-facing `isPaused` flag
- Loop timestamp trackers use `-1` sentinels, so a frame at rAF timestamp `0` no longer collapses the next frame's delta to zero
- `build:demo` was broken by default-imports of named exports
- `tsconfig.json` no longer lists `dom` under `types` (it belongs in `lib` only), so `tsc --noEmit` runs clean

### Changed
- `Query.execute()` is O(1): returns the reactively-maintained entity set with no redundant first-run re-filter
- `ticksToRunBeforeExit` values greater than 1 are implemented: the system deregisters after running N times
- `world.fps` and `world.frameDuration` are published before systems update, so `update()` reads the current frame's delta
- `world.frameNo` is a monotonically increasing frame counter (previously mirrored the FPS window counter and reset every second)
- `Component.bitmask` is a `declare` field instead of an unsafe class/interface declaration merge
- Constructor types no longer use `any`; `ComponentConstructor` is exported from `ComponentRegistry`
- ESLint reports zero errors; unused-vars rule ignores `_`-prefixed identifiers
- Refreshed transitive dev dependencies in the lockfile

### Added
- `System` test suite (100% coverage) pinning tick cadence and pause semantics
- rAF-driven game-loop tests for `World`: first-frame updates, delta publishing, fpsCap, pause/resume, tick scheduling, `getSystem` (88 tests total)

## [1.0.2] - 2026-04-17

### Changed
- `.npmignore` expanded to exclude `.idea/`, `.vscode/`, `*.iml`, `src/example.ts`, `src/fixtures.ts`, and demo/example artifacts in `dist/`. Published tarball is now 12 files (was 25).

## [1.0.1] - 2026-04-17

### Fixed
- Query notification fixes when components are added/removed from entities
- `World` FPS cap loop rewritten to skip frames up-front and advance by fixed intervals, eliminating drift on high-refresh-rate monitors
- Resolved security advisories in transitive dev dependencies (`ajv`, `brace-expansion`, `flatted`, `glob`, `js-yaml`, `minimatch`, `picomatch`, `rollup`, `vite`) via `npm audit fix`

### Added
- CLAUDE.md documentation
- Query tests for `all`/`any`/`none` filters

## [1.0.0] - 2025-04-01

### Added
- `Component<T>` base class with `properties` field and optional `init()` for reuse
- `ComponentRegistry` singleton assigning unique bigint bitmasks to component classes
- `Entity` container with component add/remove/get/has and bitmask signature
- `Query` reactive entity filter with `all`/`any`/`none` bitmask-based filtering
- `System` abstract base class with tick scheduling and pause support
- `World` game loop orchestration via `requestAnimationFrame` with FPS capping
- Component groups with `mutuallyExclusive` option for FSM-like behavior
- Demo application with canvas rendering
- Comprehensive unit tests (66 tests across 7 files)
- esbuild bundling with keep-names
- ESLint and Prettier configuration
