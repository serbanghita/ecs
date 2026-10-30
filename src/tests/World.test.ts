import { vi } from "vitest";
import { World } from "../World.ts";
import { System } from "../System.ts";
import { ComponentRegistry } from "../ComponentRegistry.ts";
import { PositionOnScreen, Renderable } from "../fixtures.ts";

class CountingSystem extends System {
  public updateCount = 0;
  public seenFrameDurations: number[] = [];
  public update(): void {
    this.updateCount++;
    this.seenFrameDurations.push(this.world.frameDuration);
  }
}

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

  it("createQuery - same id and identical filters returns the existing query", () => {
    const a = world.createEntity("a");
    a.addComponent(Renderable);

    const query = world.createQuery("renderables", { all: [Renderable] });
    const again = world.createQuery("renderables", { all: [Renderable] });

    expect(again).toBe(query);
    expect(again.dataSet).toHaveLength(1);
  });

  it("createQuery - same id with different filters throws", () => {
    world.createQuery("q", { all: [Renderable] });

    expect(() => {
      world.createQuery("q", { all: [PositionOnScreen] });
    }).toThrowError('A query with the id "q" already exists with different filters.');
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

  describe("getSystem", () => {
    it("returns the registered system instance", () => {
      const query = world.createQuery("q", {});
      const instance = world.createSystem(CountingSystem, query);

      expect(world.getSystem(CountingSystem)).toBe(instance);
    });

    it("throws for a system that was never registered", () => {
      expect(() => world.getSystem(CountingSystem)).toThrowError(`There is no system instance with the id ${CountingSystem.name}`);
    });
  });

  describe("game loop", () => {
    let rafCb: FrameRequestCallback | null;
    let rafId: number;

    beforeEach(() => {
      rafCb = null;
      rafId = 0;
      globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
        rafCb = cb;
        return ++rafId;
      }) as unknown as typeof requestAnimationFrame;
      globalThis.cancelAnimationFrame = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Fires the pending rAF callback with the given timestamp.
    const tick = (t: number) => {
      const cb = rafCb;
      rafCb = null;
      expect(cb).not.toBeNull();
      cb!(t);
    };

    it("runs systems on the very first frame", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start();

      tick(0);

      expect(system.updateCount).toBe(1);
    });

    it("publishes frameDuration before systems run, so update() sees the current delta", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start();

      // Timestamp 0 is a valid first frame (the loop's sentinel is -1).
      tick(0);
      tick(16);
      tick(48);

      expect(system.seenFrameDurations).toEqual([0, 16, 32]);
    });

    it("honors runEveryTicks: with N=2 the system runs on frames 2 and 4", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      system.runEveryTicks(2);
      world.start();

      tick(0);
      tick(16);
      tick(32);
      tick(48);

      expect(system.updateCount).toBe(2);
    });

    it("respects a manually paused system and resumes it", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start();

      system.isPaused = true;
      tick(0);
      tick(16);
      expect(system.updateCount).toBe(0);

      system.isPaused = false;
      tick(32);
      expect(system.updateCount).toBe(1);
    });

    it("runs a runOnlyOnce system a single time before the loop and deregisters it", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {})).runOnlyOnce();
      world.start();

      expect(system.updateCount).toBe(1);
      expect(world.systems.size).toBe(0);

      tick(0);
      tick(16);
      expect(system.updateCount).toBe(1);
    });

    it("honors ticksToRunBeforeExit > 1: runs N times in the loop then deregisters", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      system.settings.ticksToRunBeforeExit = 3;
      world.start();

      for (let t = 0; t < 5 * 16; t += 16) {
        tick(t);
      }

      expect(system.updateCount).toBe(3);
      expect(world.systems.size).toBe(0);
    });

    it("world.pause() skips system updates, resume() continues without a huge delta", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start();

      tick(0);
      tick(16);
      expect(system.updateCount).toBe(2);

      world.pause();
      tick(32);
      tick(5000);
      expect(system.updateCount).toBe(2);

      world.resume();
      tick(5016);
      expect(system.updateCount).toBe(3);
      // lastFrameTime was reset on pause, so the resume frame reports delta 0.
      expect(world.frameDuration).toBe(0);
    });

    it("fpsCap halves the update rate when driven at double the capped rate", () => {
      const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start({ fpsCap: 30 });

      // 10 rAF ticks at ~60fps timestamps -> 30fps cap allows every 2nd frame.
      for (let i = 0; i < 10; i++) {
        tick(100 + i * 16.66);
      }

      expect(system.updateCount).toBe(4);
    });

    it("calls callbackFnAfterSystemsUpdate on executed frames only", () => {
      const callback = vi.fn();
      world.createSystem(CountingSystem, world.createQuery("q", {}));
      world.start({ fpsCap: 30, callbackFnAfterSystemsUpdate: callback });

      for (let i = 0; i < 10; i++) {
        tick(100 + i * 16.66);
      }

      expect(callback).toHaveBeenCalledTimes(4);
    });

    it("frameNo increases monotonically and does not reset with the FPS window", () => {
      world.start();

      tick(0);
      tick(500);
      tick(1100);

      expect(world.frameNo).toBe(3);
      expect(world.fps).toBe(3);
    });
  });
});

describe("frame guard", () => {
  const registry = ComponentRegistry.getInstance();
  let callbacks: FrameRequestCallback[];
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    registry.reset();
    callbacks = [];
    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    }) as unknown as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn() as unknown as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
  });

  const runFrame = (now = 16) => {
    const callback = callbacks.shift();
    if (!callback) {
      throw new Error("No frame queued.");
    }
    callback(now);
  };

  it("reset() from a system throws, leaves the registry unchanged, and works after the frame", () => {
    const world = new World();
    world.registerComponent(PositionOnScreen);
    class ResettingSystem extends System {
      public update(): void {
        registry.reset();
      }
    }
    world.createSystem(ResettingSystem, world.createQuery("q", {}));
    world.start();
    const count = registry.getComponentCount();
    const generation = registry.generation;

    expect(() => runFrame()).toThrow(/reset\(\) was called while a World frame is running/);
    expect(registry.getComponentCount()).toBe(count);
    expect(registry.generation).toBe(generation);
    expect(() => registry.reset()).not.toThrow();
    expect(registry.generation).toBe(generation + 1);
  });

  it("reset() from callbackFnAfterSystemsUpdate throws", () => {
    const world = new World();
    world.start({ callbackFnAfterSystemsUpdate: () => registry.reset() });

    expect(() => runFrame()).toThrow(/while a World frame is running/);
    expect(() => registry.reset()).not.toThrow();
  });

  it("a system that throws an unrelated error releases the guard", () => {
    const world = new World();
    class BrokenSystem extends System {
      public update(): void {
        throw new Error("boom");
      }
    }
    world.createSystem(BrokenSystem, world.createQuery("q", {}));
    world.start();

    expect(() => runFrame()).toThrow("boom");
    expect(() => registry.reset()).not.toThrow();
  });

  it("a one-shot system that calls reset() makes start() throw and requests no frame", () => {
    const world = new World();
    class ResettingOnceSystem extends System {
      public update(): void {
        registry.reset();
      }
    }
    world.createSystem(ResettingOnceSystem, world.createQuery("q", {})).runOnlyOnce();

    expect(() => world.start()).toThrow(/while a World frame is running/);
    expect(callbacks.length).toBe(0);
    expect(() => registry.reset()).not.toThrow();
  });

  it("reset() deferred with queueMicrotask runs after the frame", async () => {
    const world = new World();
    world.registerComponent(PositionOnScreen);
    let resetDone = false;
    class DeferringSystem extends System {
      public update(): void {
        queueMicrotask(() => {
          registry.reset();
          resetDone = true;
        });
      }
    }
    world.createSystem(DeferringSystem, world.createQuery("q", {}));
    world.start();

    expect(() => runFrame()).not.toThrow();
    expect(resetDone).toBe(false);
    await Promise.resolve();
    expect(resetDone).toBe(true);

    const fresh = new World();
    fresh.registerComponent(PositionOnScreen);
    const entity = fresh.createEntity("e").addComponent(PositionOnScreen, { x: 0, y: 0 });
    expect(entity.hasComponent(PositionOnScreen)).toBe(true);
  });
});

describe("stop inside a frame", () => {
  let callbacks: FrameRequestCallback[];
  let requested: number;
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    ComponentRegistry.getInstance().reset();
    callbacks = [];
    requested = 0;
    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return ++requested;
    }) as unknown as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn() as unknown as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
  });

  const runQueuedFrame = (now = 16) => {
    const callback = callbacks.shift();
    if (!callback) {
      throw new Error("No frame queued.");
    }
    callback(now);
  };

  class StoppingSystem extends System {
    public updates = 0;
    public update(): void {
      this.updates++;
      this.world.stop();
    }
  }

  it("a system that calls stop() ends the loop: no frame is queued after that frame", () => {
    const world = new World();
    const system = world.createSystem(StoppingSystem, world.createQuery("q", {}));
    world.start();
    expect(requested).toBe(1);

    runQueuedFrame();

    expect(system.updates).toBe(1);
    expect(requested).toBe(1);
    expect(callbacks.length).toBe(0);
  });

  it("a frame queued before stop() that was not cancelled runs no system and requests no frame", () => {
    const world = new World();
    const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
    world.start();
    const kept = callbacks.shift() as FrameRequestCallback;
    world.stop();

    kept(16);

    expect(system.updateCount).toBe(0);
    expect(requested).toBe(1);
    expect(callbacks.length).toBe(0);
  });

  it("a system that calls clear() ends the loop", () => {
    const world = new World();
    class ClearingSystem extends System {
      public update(): void {
        this.world.clear();
      }
    }
    world.createSystem(ClearingSystem, world.createQuery("q", {}));
    world.start();

    runQueuedFrame();

    expect(requested).toBe(1);
    expect(callbacks.length).toBe(0);
  });

  it("stop() from callbackFnAfterSystemsUpdate ends the loop", () => {
    const world = new World();
    world.createSystem(CountingSystem, world.createQuery("q", {}));
    world.start({ callbackFnAfterSystemsUpdate: () => world.stop() });

    runQueuedFrame();

    expect(requested).toBe(1);
    expect(callbacks.length).toBe(0);
  });

  it("a system registered after the stopping one does not run in that frame", () => {
    const world = new World();
    world.createSystem(StoppingSystem, world.createQuery("q", {}));
    const later = world.createSystem(CountingSystem, world.createQuery("q2", {}));
    world.start();

    runQueuedFrame();

    expect(later.updateCount).toBe(0);
  });

  it("a one-shot system that calls stop() prevents the loop from starting", () => {
    const world = new World();
    world.createSystem(StoppingSystem, world.createQuery("q", {})).runOnlyOnce();

    world.start();

    expect(requested).toBe(0);
    expect(callbacks.length).toBe(0);
  });

  it("stop() then start() inside a frame leaves exactly one loop", () => {
    const world = new World();
    class RestartingSystem extends System {
      public updates = 0;
      public update(): void {
        this.updates++;
        if (this.updates === 1) {
          this.world.stop();
          this.world.start();
        }
      }
    }
    const restarting = world.createSystem(RestartingSystem, world.createQuery("q", {}));
    const counting = world.createSystem(CountingSystem, world.createQuery("q2", {}));
    world.start();

    runQueuedFrame(16);
    expect(callbacks.length).toBe(1);

    runQueuedFrame(32);
    expect(restarting.updates).toBe(2);
    expect(counting.updateCount).toBe(1);
    expect(callbacks.length).toBe(1);
  });

  it("stop() then start() outside a frame runs again", () => {
    const world = new World();
    const system = world.createSystem(CountingSystem, world.createQuery("q", {}));
    world.start();
    world.stop();
    callbacks.length = 0;

    world.start();
    runQueuedFrame();

    expect(system.updateCount).toBe(1);
    expect(callbacks.length).toBe(1);
  });
});

