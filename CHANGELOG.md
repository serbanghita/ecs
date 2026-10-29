# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
