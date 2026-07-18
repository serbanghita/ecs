import { Entity } from "./Entity.ts";
import { Component } from "./Component.ts";
import { World } from "./World.ts";
import { addBit, hasAnyOfBits, hasBit } from "@serbanghita-gamedev/bitmask";

export type ComponentInQuery = new (...args: never[]) => Component<NonNullable<object>>;

export interface IQueryFilters {
  all?: ComponentInQuery[];
  any?: ComponentInQuery[];
  none?: ComponentInQuery[];
}

export interface IQueryFiltersBitmask {
  all: bigint;
  any: bigint;
  none: bigint;
}

export class Query {
  public all = 0n;
  public any = 0n;
  public none = 0n;
  public dataSet: Map<string, Entity> = new Map();

  /**
   * Create a "query" of Entities that contain certain Components set.
   *
   * @param world
   * @param id
   * @param filters
   */
  constructor(
    public world: World,
    public id: string,
    public filters: IQueryFilters,
  ) {
    this.checkIfComponentsAreRegistered();
    this.processFiltersAsBitMasks();
  }

  private checkIfComponentsAreRegistered() {
    // Get a list of unique "Components" that are being used in the filters.
    [
      ...new Set<typeof Component>(
        Object.values(this.filters).reduce((acc, value) => {
          return acc.concat(value);
        }, []),
      ),
    ].forEach((component) => {
      if (typeof component.prototype.bitmask === "undefined") {
        throw new Error(`Please register the component ${component.name} in the ComponentRegistry.`);
      }
    });
  }

  private processFiltersAsBitMasks(): void {
    if (this.filters.all) {
      this.filters.all.forEach((component) => {
        this.all = addBit(this.all, component.prototype.bitmask as bigint);
      });
    }

    if (this.filters.any) {
      this.filters.any.forEach((component) => {
        this.any = addBit(this.any, component.prototype.bitmask as bigint);
      });
    }

    if (this.filters.none) {
      this.filters.none.forEach((component) => {
        this.none = addBit(this.none, component.prototype.bitmask as bigint);
      });
    }
  }

  public init() {
    this.world.entities.forEach((entity) => {
      this.candidate(entity);
    });
  }

  /**
   * Returns the entities that correspond to the filters given.
   * The set is maintained reactively via World notifications.
   */
  public execute(): Map<string, Entity> {
    return this.dataSet;
  }

  private match(entity: Entity): boolean {
    // Reject if entity has ANY component in the "none" filter
    if (this.none !== 0n && hasAnyOfBits(entity.componentsBitmask, this.none)) {
      return false;
    }

    // Reject if entity doesn't have ALL components in the "all" filter
    if (this.all !== 0n && !hasBit(entity.componentsBitmask, this.all)) {
      return false;
    }

    // Reject if entity doesn't have ANY component in the "any" filter (when specified)
    if (this.any !== 0n && !hasAnyOfBits(entity.componentsBitmask, this.any)) {
      return false;
    }

    // All checks passed
    return true;
  }

  public candidate(entity: Entity) {
    if (this.match(entity)) {
      this.dataSet.set(entity.id, entity);
      return true;
    }

    return false;
  }

  public add(entity: Entity) {
    this.dataSet.set(entity.id, entity);
  }

  public remove(entity: Entity) {
    this.dataSet.delete(entity.id);
  }
}
