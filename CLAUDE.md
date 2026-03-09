# ECS - Entity Component System

## Overview

A TypeScript ECS library using bitmask-based component matching for fast entity filtering. Provides reactive queries that automatically update when entities gain or lose components.

## Source Structure

| File | Description |
|------|-------------|
| `src/Component.ts` | Base class for components with `properties` field and optional `init()` for reuse |
| `src/ComponentRegistry.ts` | Singleton assigning unique bigint bitmasks to component classes |
| `src/Entity.ts` | Container holding components and a bitmask signature; notifies queries on changes |
| `src/Query.ts` | Filters entities using `all`/`any`/`none` bitmask filters; reactive updates |
| `src/System.ts` | Abstract base class with `update(now)`, tick scheduling, pause support |
| `src/World.ts` | Main orchestration: game loop via rAF, entity/query/system management, FPS |
| `src/fixtures.ts` | Test fixture components (Idle, Walking, Attacking, Renderable, etc.) |
| `src/index.ts` | Public API re-exports |

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `Component<T>` | Class | Base class for typed components |
| `ComponentRegistry` | Class | Singleton registry with `getInstance()` |
| `Entity` | Class | Entity with component add/remove/get/has |
| `Query` | Class | Reactive entity filter with `all`/`any`/`none` |
| `System` | Class | Abstract system base class |
| `World` | Class | Game loop orchestration |
| `IQueryFilters` | Interface | `{ all?, any?, none? }` filter definition |
| `SystemSettings` | Type | `{ ticksToRunBeforeExit, runEveryTicks }` |
| `WorldStartOptions` | Type | `{ fpsCap?, callbackFnAfterSystemsUpdate? }` |
| `ComponentGroupOptions` | Type | `{ mutuallyExclusive? }` |

## Dependencies

| Package | Version |
|---------|---------|
| `@serbanghita-gamedev/bitmask` | ^1.1.0 |

## Development

| Command | What it does |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Bundle with esbuild |
| `npm run test` | Run tests (vitest) |
| `npm run lint` | Lint (eslint) |

## Testing

- Framework: Vitest
- Tests: `src/tests/*.test.ts`
- Fixtures: `src/fixtures.ts`

## Query Filter Semantics

- `all` — Entity must have ALL listed components
- `any` — Entity must have AT LEAST ONE of the listed components
- `none` — Entity must NOT have ANY of the listed components
- Evaluation order: `none` (most restrictive) → `all` → `any`
- Queries are reactive — auto-update when entities gain/lose components

## Coding Guidelines

- Consider ECS design paradigms when suggesting changes.
- Avoid unnecessary comments in code.
- Components are plain data holders; logic goes in Systems.
