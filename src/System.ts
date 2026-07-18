import { World } from "./World.ts";
import { Query } from "./Query.ts";

// export type SystemConstructor = new (world: World, properties?: {}) => System;

export type SystemSettings = {
  // How many times to run the system before de-registering itself from the loop.
  ticksToRunBeforeExit: number;
  // Run the system "update" function every X ticks.
  runEveryTicks: number;
};

export class System {
  public settings: SystemSettings = { ticksToRunBeforeExit: -1, runEveryTicks: 0 };
  public ticks: number = 0;
  // Number of times update() has actually run (drives settings.ticksToRunBeforeExit).
  public updatesRun: number = 0;

  // User-facing pause flag; never mutated by the engine.
  public isPaused: boolean = false;

  public constructor(
    public world: World,
    public query: Query,
    ..._args: unknown[]
  ) {
    this.ticks = 0;
  }

  public runEveryTicks(ticks: number) {
    this.settings.runEveryTicks = ticks;
  }

  public runOnlyOnce() {
    this.settings.ticksToRunBeforeExit = 1;
    return this;
  }

  // Returns true if update() should run on this tick (settings.runEveryTicks cadence).
  public preUpdate(): boolean {
    this.ticks++;

    if (this.settings.runEveryTicks > 0) {
      if (this.ticks < this.settings.runEveryTicks) {
        return false;
      }
      this.ticks = 0;
    }

    return true;
  }

  public update(_now: number = 0): void {
    throw new Error(`System update() must be implemented.`);
  }
}
