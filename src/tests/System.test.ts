import { World } from "../World.ts";
import { System } from "../System.ts";

describe("System", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("has default settings", () => {
    const system = new System(world, world.createQuery("q", {}));

    expect(system.settings).toEqual({ ticksToRunBeforeExit: -1, runEveryTicks: 0 });
    expect(system.ticks).toBe(0);
    expect(system.updatesRun).toBe(0);
    expect(system.isPaused).toBe(false);
  });

  it("update() throws when not implemented", () => {
    const system = new System(world, world.createQuery("q", {}));

    expect(() => system.update()).toThrowError("System update() must be implemented.");
  });

  it("runOnlyOnce() sets ticksToRunBeforeExit and is chainable", () => {
    const system = new System(world, world.createQuery("q", {}));

    expect(system.runOnlyOnce()).toBe(system);
    expect(system.settings.ticksToRunBeforeExit).toBe(1);
  });

  it("runEveryTicks() sets the cadence", () => {
    const system = new System(world, world.createQuery("q", {}));

    system.runEveryTicks(5);

    expect(system.settings.runEveryTicks).toBe(5);
  });

  describe("preUpdate", () => {
    it("returns true on every tick when runEveryTicks is 0", () => {
      const system = new System(world, world.createQuery("q", {}));

      expect(system.preUpdate()).toBe(true);
      expect(system.preUpdate()).toBe(true);
      expect(system.preUpdate()).toBe(true);
    });

    it("with runEveryTicks = N, allows update on ticks N, 2N, 3N (first run delayed N-1 ticks)", () => {
      const system = new System(world, world.createQuery("q", {}));
      system.runEveryTicks(3);

      const results = Array.from({ length: 9 }, () => system.preUpdate());

      expect(results).toEqual([false, false, true, false, false, true, false, false, true]);
    });

    it("with runEveryTicks = 1, allows update on every tick", () => {
      const system = new System(world, world.createQuery("q", {}));
      system.runEveryTicks(1);

      expect(system.preUpdate()).toBe(true);
      expect(system.preUpdate()).toBe(true);
    });

    it("never mutates the user-facing isPaused flag", () => {
      const system = new System(world, world.createQuery("q", {}));
      system.runEveryTicks(2);
      system.isPaused = true;

      for (let i = 0; i < 6; i++) {
        system.preUpdate();
      }

      expect(system.isPaused).toBe(true);
    });
  });
});
