import Entity from "../Entity.ts";
import ComponentRegistry from "../ComponentRegistry.ts";
import World from "../World.ts";
import { Body, PositionOnScreen } from "../fixtures.ts";
import { afterEach } from "vitest";

describe("Entity", () => {
  let world: World;
  let registry: ComponentRegistry = ComponentRegistry.getInstance();
  beforeEach(() => {
    world = new World();
  });

  afterEach(() => {
    registry.reset();
  });

  it("addComponent", () => {
    registry.registerComponent(Body);
    registry.registerComponent(PositionOnScreen);

    const entity = new Entity(world, "test");
    const spy = vi.spyOn(world, "notifyQueriesOfEntityComponentAddition");
    entity.addComponent(Body, { width: 10, height: 20 }); // 1n
    expect(spy).toHaveBeenCalledWith(entity, entity.getComponent(Body));
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 }); // 2n
    expect(spy).toHaveBeenCalledWith(entity, entity.getComponent(PositionOnScreen));

    expect(entity.componentsBitmask).toBe(6n);
    expect(entity.getComponent(Body)).toBeInstanceOf(Body);
    expect(entity.getComponent(PositionOnScreen)).toBeInstanceOf(PositionOnScreen);
  });

  it("getComponent", () => {
    registry.registerComponent(Body);

    const entity = new Entity(world, "test");
    entity.addComponent(Body, { width: 10, height: 20 }); // 1n

    expect(entity.getComponent(Body)).toBeInstanceOf(Body);
    expect(entity.getComponent(Body)).toEqual({
      properties: { width: 10, height: 20 },
    });
  });

  it("getComponentByName", () => {
    registry.registerComponent(Body);

    const entity = new Entity(world, "test");
    entity.addComponent(Body, { width: 10, height: 20 });

    expect(entity.getComponentByName("Body")).toBeInstanceOf(Body);
  });

  it("removeComponent", () => {
    registry.registerComponent(Body);

    const entity = new Entity(world, "test");
    const spy = vi.spyOn(world, "notifyQueriesOfEntityComponentRemoval");
    entity.addComponent(Body, { width: 10, height: 20 });
    const instanceOfComp = entity.getComponent(Body);
    entity.removeComponent(Body);
    expect(spy).toHaveBeenCalledWith(entity, instanceOfComp);

    expect(entity.hasComponent(Body)).toBe(false);
  });

  it("getComponent exception", () => {
    registry.registerComponent(Body);

    const entity = new Entity(world, "test");
    entity.addComponent(Body, { width: 10, height: 20 }); // 1n

    expect(() => entity.getComponent(PositionOnScreen)).toThrow("Component requested PositionOnScreen is non-existent.");
  });

  it("hasComponent", () => {
    registry.registerComponent(Body);
    registry.registerComponent(PositionOnScreen);

    const entity = new Entity(world, "test");
    entity.addComponent(Body, { width: 10, height: 20 }); // 1n
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 }); // 2n

    expect(entity.hasComponent(Body)).toBe(true);
    expect(entity.hasComponent(PositionOnScreen)).toBe(true);
  });
});
