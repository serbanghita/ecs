# Entity Component System
> ECS library

[![Node.js CI](https://github.com/serbanghita/ecs/actions/workflows/node.js.yml/badge.svg)](https://github.com/serbanghita/ecs/actions/workflows/node.js.yml)

## About

* A `ComponentRegistry` where `Component`'s class declaration is registered beforehand.
* A `Component` has `properties`, which is a plain key => value data store.
  * A `Component` can belong to a "components group" via `ComponentRegistry::registerComponentGroup`.
* An `Entity` can have multiple `Components` attached to it via a bitmask.
* A `System` can receive a `Query` that is based on `Entities` that have specific `Components`.
* A `World` class which ties everything together and also contains a game loop.
