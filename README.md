# Entity Component System
> ECS library

[![Node.js CI](https://github.com/serbanghita/ecs/actions/workflows/node.js.yml/badge.svg)](https://github.com/serbanghita/ecs/actions/workflows/node.js.yml)

## About

* A `ComponentRegistry` where `Component`'s class declaration is registered beforehand.
* A `Component` has `properties`, which is a plain key => value data store.
  * A `Component` can belong to a "components group" via `ComponentRegistry::registerComponentGroup`.
* An `Entity` can have multiple `Components` attached to it, tracked in a `Uint32Array` bitset (one bit per registered `Component`, no limit on the number of `Components`).
* A `System` can receive a `Query` that is based on `Entities` that have specific `Components`.
* A `World` class which ties everything together and also contains a game loop.

## Component registration

* There is one `ComponentRegistry` per process, shared by every `World`. Register every component class before adding it to an entity or using it in a query.
* Registration is idempotent per class: registering a class again returns the same identity. Class names must be non-empty and unique across every package that registers components into the same process; a different class under an already registered name throws.
* `ComponentRegistry.getInstance().reset()` forgets every registration and invalidates every live `World`. A world created before the reset throws on its next entity, query or `start()` call: re-register the components and create a new `World`.
* Hot module reload: call `reset()`, re-register the components, then create a new `World`.
* Never call `reset()` from a system or from an event handler that runs during a frame; the registry throws if a frame is running. Defer it with `queueMicrotask(() => { ... })`.
* Component groups: registering a group again under the same name must repeat the same members and options (then it is a no-op); a component belongs to at most one group.
