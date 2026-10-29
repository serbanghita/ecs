import { bitset } from "@serbanghita-gamedev/bitmask";
import { Entity } from "./Entity.ts";
import { System } from "./System.ts";
import { Query, IQueryFilters } from "./Query.ts";
import { Component } from "./Component.ts";
import { ComponentRegistry, ComponentConstructor } from "./ComponentRegistry.ts";

export type WorldStartOptions = {
  // Limit the FPS.
  fpsCap?: number;
  // Function to run at the end of each frame.
  callbackFnAfterSystemsUpdate?: () => void;
};

export class World {
  public declarations = {
    components: ComponentRegistry.getInstance(),
  };

  public queries = new Map<string, Query>();
  public entities = new Map<string, Entity>();
  public systems = new Map<typeof System, System>();
  public fps: number = 0;
  public frameDuration: number = 0;
  public frameNo: number = 0;
  public fpsCap: number = 0;
  public fpsCapDuration: number = 0;
  public callbackFnAfterSystemsUpdate: (() => void) | undefined = undefined;
  public now: DOMHighResTimeStamp = 0;
  private _animationFrameId: number = 0;
  private _paused: boolean = false;

  // Shortcut to ComponentRegistry
  public registerComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp) {
    this.declarations.components.registerComponent(componentDeclaration);
  }

  // Shortcut to ComponentRegistry
  public registerComponents(componentDeclarations: ComponentConstructor[]) {
    this.declarations.components.registerComponents(componentDeclarations);
  }

  public createQuery(id: string, filters: IQueryFilters): Query {
    const query = new Query(this, id, filters);
    const existing = this.queries.get(id);

    if (existing) {
      // A query is defined by its bitset signature, so re-creating it with
      // identical filters is safe and returns the already-populated instance.
      if (existing.hasSameFilters(query)) {
        return existing;
      }
      throw new Error(`A query with the id "${id}" already exists with different filters.`);
    }

    this.queries.set(query.id, query);

    query.init();

    return query;
  }

  public removeQuery(id: string) {
    this.queries.delete(id);
  }

  public getQuery(id: string): Query {
    const query = this.queries.get(id);
    if (!query) {
      throw new Error(`There is not query registered with the id: ${id}.`);
    }
    return query;
  }

  public createEntity(id: string): Entity {
    if (this.entities.has(id)) {
      throw new Error(`Entity with the id "${id}" already exists.`);
    }

    const entity = new Entity(this, id);

    this.entities.set(entity.id, entity);
    this.notifyQueriesOfEntityCandidacy(entity);

    return entity;
  }

  public getEntity(id: string) {
    return this.entities.get(id);
  }

  public removeEntity(id: string) {
    const entity = this.entities.get(id);

    if (!entity) {
      return;
    }

    this.notifyQueriesOfEntityRemoval(entity);
    this.entities.delete(id);
  }

  public createSystem<T extends typeof System>(systemDeclaration: T, query: Query, ...args: unknown[]): InstanceType<T> {
    const systemInstance = new systemDeclaration(this, query, ...args) as InstanceType<T>;
    this.systems.set(systemDeclaration, systemInstance);

    return systemInstance;
  }

  public getSystem(system: typeof System) {
    const systemInstance = this.systems.get(system);

    if (!systemInstance) {
      throw new Error(`There is no system instance with the id ${system.name}`);
    }

    return systemInstance;
  }

  public removeSystem(system: typeof System) {
    this.systems.delete(system);
  }

  public notifyQueriesOfEntityCandidacy(entity: Entity) {
    this.queries.forEach((query) => {
      query.candidate(entity);
    });
  }

  public notifyQueriesOfEntityRemoval(entity: Entity) {
    this.queries.forEach((query) => {
      query.remove(entity);
    });
  }

  /**
   * 1. Finds all Queries that have the Component in their filter.
   * 2. Add candidacy of the Entity to the list of Entities inside the Query.
   * 3. Remove Entity from Queries that have the Component in their 'none' filter.
   *
   * @param entity
   * @param component
   */
  public notifyQueriesOfEntityComponentAddition<T extends NonNullable<object>>(entity: Entity, component: Component<T>) {
    this.queries.forEach((query) => {
      // If component is in 'none', remove entity from query
      if (bitset.testBit(query.none, component.bitIndex)) {
        query.remove(entity);
        return;
      }
      // If component is in 'all' or 'any', re-evaluate entity candidacy
      if (bitset.testBit(query.all, component.bitIndex) || bitset.testBit(query.any, component.bitIndex)) {
        query.candidate(entity);
      }
    });
  }

  /**
   * 1. Finds all Queries that have the Component in their filter.
   * 2. Remove the Entity from the list of Entities inside the Query.
   * 3. Re-evaluate Entity candidacy for Queries that have the Component in their 'none' filter.
   *
   * @param entity
   * @param component
   */
  public notifyQueriesOfEntityComponentRemoval<T extends NonNullable<object>>(entity: Entity, component: Component<T>) {
    this.queries.forEach((query) => {
      // If component is in 'all', remove entity from query
      if (bitset.testBit(query.all, component.bitIndex)) {
        query.remove(entity);
        return;
      }
      // If component is in 'any', re-evaluate (entity may no longer have any of the required components)
      if (bitset.testBit(query.any, component.bitIndex)) {
        // Remove and re-candidate to properly check if entity still matches
        query.remove(entity);
        query.candidate(entity);
        return;
      }
      // If component is in 'none', re-evaluate entity candidacy
      if (bitset.testBit(query.none, component.bitIndex)) {
        query.candidate(entity);
      }
    });
  }

  public start(options?: WorldStartOptions) {
    if (options) {
      this.fpsCap = options.fpsCap || 0;
      if (options.callbackFnAfterSystemsUpdate) {
        this.callbackFnAfterSystemsUpdate = options.callbackFnAfterSystemsUpdate;
      }
    }

    // Run all systems that need to be run once and de-register them from the loop.
    [...this.systems]
      .filter(([, systemInstance]) => systemInstance.settings.ticksToRunBeforeExit === 1)
      .forEach(([systemDeclaration, systemInstance]) => {
        systemInstance.update();
        this.systems.delete(systemDeclaration);
      });

    this.startLoop();
  }

  private startLoop() {
    // Timestamp trackers use -1 as the "uninitialized" sentinel because 0 is a
    // valid rAF timestamp.
    let frameTimeDiff = 0;
    let lastFrameTime = -1;

    let fps = 0;
    let frames = 0;
    let lastFpsTime = -1;

    const fpsCap = this.fpsCap;
    const fpsCapDurationTime = fpsCap > 0 ? 1000 / fpsCap : 0;
    // Tolerance absorbs sub-millisecond rAF jitter (macOS Chrome often delivers
    // timestamps slightly ahead of vsync). Without it, matched-refresh monitors
    // lose ~3-10% of frames.
    const FPS_CAP_TOLERANCE = 1;
    let fpsCapAccumulator = 0;
    let fpsCapLastFrameTime = -1;

    const loop = (now: DOMHighResTimeStamp) => {
      this.now = now;

      if (this._paused) {
        // Keep the loop alive but skip everything; reset lastFrameTime
        // so the first frame after resume doesn't get a huge delta.
        lastFrameTime = -1;
        lastFpsTime = -1;
        fpsCapAccumulator = 0;
        fpsCapLastFrameTime = -1;
        frames = 0;
        this._animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // FPS cap via time-accumulator: every rAF adds the real elapsed delta
      // to an accumulator. A frame runs once the accumulator reaches one
      // frame-time (minus a small tolerance for jitter); the frame-time is
      // then subtracted. This naturally handles any refresh rate (60/120/144)
      // and is resilient to rAF timestamps arriving slightly early or late.
      if (fpsCap > 0) {
        if (fpsCapLastFrameTime !== -1) {
          fpsCapAccumulator += now - fpsCapLastFrameTime;
        }
        fpsCapLastFrameTime = now;
        if (fpsCapAccumulator < fpsCapDurationTime - FPS_CAP_TOLERANCE) {
          this._animationFrameId = requestAnimationFrame(loop);
          return;
        }
        fpsCapAccumulator -= fpsCapDurationTime;
        // If we've fallen way behind (e.g., tab was hidden), drop the debt.
        if (fpsCapAccumulator > fpsCapDurationTime) fpsCapAccumulator = 0;
      }

      frames++;
      this.frameNo++;

      // Frame duration (delta time since last logic frame).
      if (lastFrameTime === -1) {
        lastFrameTime = now;
      }
      frameTimeDiff = now - lastFrameTime;
      lastFrameTime = now;

      // Fps counter (updates every second).
      if (lastFpsTime === -1) {
        lastFpsTime = now;
      }
      if (now - lastFpsTime >= 1000) {
        fps = frames;
        frames = 0;
        lastFpsTime = now;
      }

      // Publish timing before systems run so update() sees this frame's values.
      this.fps = fps;
      this.frameDuration = frameTimeDiff;

      this.systems.forEach((system, systemDeclaration) => {
        if (system.isPaused || !system.preUpdate()) {
          return;
        }
        system.update(now);
        if (system.settings.ticksToRunBeforeExit > 0 && ++system.updatesRun >= system.settings.ticksToRunBeforeExit) {
          this.systems.delete(systemDeclaration);
        }
      });

      if (this.callbackFnAfterSystemsUpdate) {
        this.callbackFnAfterSystemsUpdate();
      }

      this._animationFrameId = requestAnimationFrame(loop);
    };

    this._animationFrameId = requestAnimationFrame(loop);
  }

  public pause() {
    this._paused = true;
  }

  public resume() {
    this._paused = false;
  }

  public stop() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = 0;
    }
  }

  public clear() {
    this.stop();
    this.entities.clear();
    this.queries.clear();
    this.systems.clear();
    this.callbackFnAfterSystemsUpdate = undefined;
  }
}
