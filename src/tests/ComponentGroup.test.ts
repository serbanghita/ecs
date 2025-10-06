// src/tests/ComponentGroup.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import World from "../World.ts";
import { Idle, Walking, Attacking } from "../fixtures.ts";
import ComponentRegistry from "../ComponentRegistry.ts";

describe("Component Groups", () => {
  let world: World;
  let registry: ComponentRegistry;

  beforeEach(() => {
    world = new World();
    registry = ComponentRegistry.getInstance();
    registry.reset();
    registry.registerComponent(Idle);
    registry.registerComponent(Walking);
    registry.registerComponent(Attacking);
  });

  it("should remove other components in a mutually exclusive group when a new one is added", () => {
    registry.registerComponentGroup("movement", [Idle, Walking, Attacking], { mutuallyExclusive: true });

    const entity = world.createEntity("player");

    entity.addComponent(Idle, {});
    expect(entity.hasComponent(Idle)).toBe(true);

    entity.addComponent(Walking, {});
    expect(entity.hasComponent(Walking)).toBe(true);
    expect(entity.hasComponent(Idle)).toBe(false);

    entity.addComponent(Attacking, {});
    expect(entity.hasComponent(Attacking)).toBe(true);
    expect(entity.hasComponent(Walking)).toBe(false);
    expect(entity.hasComponent(Idle)).toBe(false);
  });

  it("should not remove other components if the group is not mutually exclusive", () => {
    registry.registerComponentGroup("movement", [Idle, Walking, Attacking]);

    const entity = world.createEntity("player");

    entity.addComponent(Idle, {});
    expect(entity.hasComponent(Idle)).toBe(true);

    entity.addComponent(Walking, {});
    expect(entity.hasComponent(Walking)).toBe(true);
    expect(entity.hasComponent(Idle)).toBe(true);
  });
});
