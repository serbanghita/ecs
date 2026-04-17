# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
