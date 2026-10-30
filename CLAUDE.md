# ECS - Entity Component System

## Overview

A TypeScript ECS library using Uint32Array bitsets for component matching and fast entity filtering. Each registered component gets a bit index; entities and queries hold fixed-width bitsets that grow by 32-bit words as components are registered. Provides reactive queries that automatically update when entities gain or lose components.

## Source Structure

| File | Description |
|------|-------------|
| `src/Component.ts` | Base class for components with `properties` field and optional `init()` for reuse |
| `src/ComponentRegistry.ts` | Singleton assigning a unique `bitIndex` to each component class; owns the bitset capacity |
| `src/Entity.ts` | Container holding components and a `componentsBitset` signature; notifies queries on changes |
| `src/Query.ts` | Filters entities using `all`/`any`/`none` bitset filters; reactive updates |
| `src/System.ts` | Abstract base class with `update(now)`, tick scheduling, pause support |
| `src/World.ts` | Main orchestration: game loop via rAF, entity/query/system management, FPS |
| `src/frameGuard.ts` | Internal frame counter (not exported); `ComponentRegistry.reset()` throws while a `World` frame is running |
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
| `ComponentGroup` | Type | `{ components, bitset, options }` |

## Dependencies

| Package | Version |
|---------|---------|
| `@serbanghita-gamedev/bitmask` | ^2.0.1 (`bitset` namespace) |

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

## Bitset Representation

- `ComponentRegistry.registerComponent` assigns bit index 0, 1, 2, ... in registration order; the index is stored in the registry keyed by constructor, and `Component.prototype.bitIndex` is a read-only getter over it (unregistered classes, including unregistered subclasses, read `undefined`)
- Registering the same class twice is a no-op; a different class with an already registered name throws
- `ComponentRegistry.getBitsetCapacity()` is the component count rounded up to a 32-bit word, minimum 32
- `Entity.componentsBitset` and `Query.all/any/none` are `Uint32Array` created from the registry capacity; an entity grows its bitset in `addComponent` if a later-registered component does not fit
- `ComponentRegistry.reset()` clears the singleton in place and bumps `generation`; a `World` created before the reset throws in the `Entity` and `Query` constructors, `addComponent`, `hasComponent`, `removeComponent` and `start()`. `reset()` itself throws while a `World` frame is running: defer it with `queueMicrotask`
- `registerComponentGroup` validates every member first; registering a group again with identical members and options is a no-op, a different definition under the same name throws, and a component belongs to at most one group

## Coding Guidelines

- Consider ECS design paradigms when suggesting changes.
- Avoid unnecessary comments in code.
- Components are plain data holders; logic goes in Systems.
