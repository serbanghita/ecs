import { vi } from "vitest";
import { World } from "../World.ts";
import { PositionOnScreen, Renderable } from "../fixtures.ts";

describe("World", () => {
  let world: World;
  beforeEach(() => {
    world = new World();
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Renderable);
  });

  it("createEntity - entity already exist", () => {
    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(() => {
      world.createEntity("a");
    }).toThrowError('Entity with the id "a" already exists.');
  });

  it("createEntity - counting", () => {
    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(world.entities.size).toEqual(2);
  });

  it("createEntity - notifies queries", () => {
    world.createQuery("query1", { all: [Renderable] });
    world.createQuery("query2", { all: [PositionOnScreen] });

    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(world.getQuery("query1").dataSet).toHaveLength(1);
    expect(world.getQuery("query2").dataSet).toHaveLength(2);
  });

  describe("stop", () => {
    beforeEach(() => {
      globalThis.requestAnimationFrame = vi.fn().mockReturnValue(42);
      globalThis.cancelAnimationFrame = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("cancels the animation frame loop", () => {
      world.start();
      world.stop();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(42);
    });

    it("is safe to call stop when loop is not running", () => {
      expect(() => world.stop()).not.toThrow();
    });

    it("resets animation frame id after stop", () => {
      world.start();
      world.stop();
      // Second stop should not call cancelAnimationFrame again (id is 0)
      (globalThis.cancelAnimationFrame as ReturnType<typeof vi.fn>).mockClear();
      world.stop();
      expect(globalThis.cancelAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    beforeEach(() => {
      globalThis.requestAnimationFrame = vi.fn().mockReturnValue(42);
      globalThis.cancelAnimationFrame = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("cancels rAF and clears all maps", () => {
      const a = world.createEntity("a");
      a.addComponent(PositionOnScreen, { x: 1, y: 2 });
      world.createQuery("q1", { all: [PositionOnScreen] });
      world.start();

      expect(world.entities.size).toBe(1);
      expect(world.queries.size).toBe(1);

      world.clear();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(42);
      expect(world.entities.size).toBe(0);
      expect(world.queries.size).toBe(0);
      expect(world.systems.size).toBe(0);
      expect(world.callbackFnAfterSystemsUpdate).toBeUndefined();
    });

    it("is safe to call clear when loop is not running", () => {
      expect(() => world.clear()).not.toThrow();
      expect(world.entities.size).toBe(0);
    });
  });
});
