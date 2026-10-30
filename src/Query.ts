import { Entity } from "./Entity.ts";
import { Component } from "./Component.ts";
import { World } from "./World.ts";
import { bitset } from "@serbanghita-gamedev/bitmask";
import { bitIndexOf } from "./ComponentRegistry.ts";

export type ComponentInQuery = new (...args: never[]) => Component<NonNullable<object>>;

export interface IQueryFilters {
  all?: ComponentInQuery[];
  any?: ComponentInQuery[];
  none?: ComponentInQuery[];
}

export class Query {
  public all: bitset.Bitset;
  public any: bitset.Bitset;
  public none: bitset.Bitset;
  public dataSet: Map<string, Entity> = new Map();

  private hasAll = false;
  private hasAny = false;
  private hasNone = false;

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
    world.assertRegistryIsCurrent();
    const registry = world.declarations.components;
    this.all = registry.createBitset();
    this.any = registry.createBitset();
    this.none = registry.createBitset();

    this.checkIfComponentsAreRegistered();
    this.processFiltersAsBitsets();
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
      if (typeof bitIndexOf(component) === "undefined") {
        throw new Error(`Please register the component ${component.name} in the ComponentRegistry.`);
      }
    });
  }

  private processFiltersAsBitsets(): void {
    if (this.filters.all) {
      this.filters.all.forEach((component) => {
        bitset.setBit(this.all, bitIndexOf(component as unknown as typeof Component) as number);
      });
      this.hasAll = !bitset.isEmpty(this.all);
    }

    if (this.filters.any) {
      this.filters.any.forEach((component) => {
        bitset.setBit(this.any, bitIndexOf(component as unknown as typeof Component) as number);
      });
      this.hasAny = !bitset.isEmpty(this.any);
    }

    if (this.filters.none) {
      this.filters.none.forEach((component) => {
        bitset.setBit(this.none, bitIndexOf(component as unknown as typeof Component) as number);
      });
      this.hasNone = !bitset.isEmpty(this.none);
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

  public hasSameFilters(other: Query): boolean {
    return bitset.equals(this.all, other.all) && bitset.equals(this.any, other.any) && bitset.equals(this.none, other.none);
  }

  private match(entity: Entity): boolean {
    // Reject if entity has ANY component in the "none" filter
    if (this.hasNone && bitset.hasAnyBits(entity.componentsBitset, this.none)) {
      return false;
    }

    // Reject if entity doesn't have ALL components in the "all" filter
    if (this.hasAll && !bitset.hasAllBits(entity.componentsBitset, this.all)) {
      return false;
    }

    // Reject if entity doesn't have ANY component in the "any" filter (when specified)
    if (this.hasAny && !bitset.hasAnyBits(entity.componentsBitset, this.any)) {
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
