import { describe, it, expectTypeOf } from "vitest";
import { Component } from "../Component.ts";
import { ComponentRegistry, type AnyComponentConstructor } from "../ComponentRegistry.ts";
import { Entity } from "../Entity.ts";
import { World } from "../World.ts";
import { Body, Idle, PositionOnScreen } from "../fixtures.ts";

// Type-only test: vitest type-checks this file under tsconfig.typecheck.json
// (strict) and never executes it.
describe("AnyComponentConstructor", () => {
  it("accepts every Component subclass, including ones whose props have required fields", () => {
    expectTypeOf(Body).toMatchTypeOf<AnyComponentConstructor>();
    expectTypeOf(PositionOnScreen).toMatchTypeOf<AnyComponentConstructor>();
    expectTypeOf(Idle).toMatchTypeOf<AnyComponentConstructor>();
    expectTypeOf(Component).toMatchTypeOf<AnyComponentConstructor>();
  });

  it("rejects classes that do not extend Component", () => {
    class NotAComponent {
      constructor(public properties: { width: number }) {}
    }
    expectTypeOf(NotAComponent).not.toMatchTypeOf<AnyComponentConstructor>();
  });

  it("is what the identity-only registry, world and entity APIs take", () => {
    const registry = ComponentRegistry.getInstance();
    expectTypeOf(registry.registerComponent(Body)).toEqualTypeOf<typeof Body>();
    expectTypeOf(registry.registerComponents([Body, PositionOnScreen, Idle])).toBeVoid();
    expectTypeOf(registry.registerComponentGroup("shape", [Body, PositionOnScreen, Idle], { mutuallyExclusive: true })).toBeVoid();
    expectTypeOf(registry.indexOf(Body)).toEqualTypeOf<number | undefined>();

    const world = new World();
    expectTypeOf(world.registerComponent(Body)).toBeVoid();
    expectTypeOf(world.registerComponents([Body, PositionOnScreen])).toBeVoid();

    const entity = world.createEntity("e");
    expectTypeOf(entity.hasComponent(Body)).toBeBoolean();
    expectTypeOf(entity.removeComponent(Body)).toEqualTypeOf<Entity>();
    // getComponent keeps the precise instance type.
    expectTypeOf(entity.getComponent(Body)).toEqualTypeOf<Body>();
    expectTypeOf(entity.getComponent(PositionOnScreen).x).toBeNumber();
  });
});
