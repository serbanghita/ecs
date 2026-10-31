import type { Component } from "./Component.ts";
import { bitset } from "@serbanghita-gamedev/bitmask";
import { isFrameRunning } from "./frameGuard.ts";

export type ComponentConstructor<
  TProps extends NonNullable<object> = NonNullable<object>,
  TComp extends Component<TProps> = Component<TProps>,
> = new (properties: TProps) => TComp;

/**
 * Any component class, whatever props its constructor takes. The parameter is
 * `never`, so every `Component` subclass is assignable, including classes whose
 * props have required fields (under `strictFunctionTypes` those are not
 * assignable to `ComponentConstructor`). Use it where only class identity is
 * needed: registration, groups, queries, `hasComponent`, `removeComponent`.
 */
export type AnyComponentConstructor = new (properties: never) => Component<NonNullable<object>>;

export type ComponentGroupOptions = {
  mutuallyExclusive?: boolean;
};

export type ComponentGroup = {
  components: AnyComponentConstructor[];
  bitset: bitset.Bitset;
  options: ComponentGroupOptions;
};

const WORD_BITS = 32;

/**
 * The bit index the registry assigned to exactly this class, or `undefined`.
 * Subclasses do not inherit their parent's index.
 */
export function bitIndexOf(componentDeclaration: AnyComponentConstructor): number | undefined {
  return ComponentRegistry.getInstance().indexOf(componentDeclaration);
}

export class ComponentRegistry {
  private static instance: ComponentRegistry;

  private nextBitIndex = 0;
  private _generation = 0;
  private bitIndexByConstructor: Map<typeof Component, number> = new Map();
  private components: Map<string, typeof Component> = new Map();
  private componentGroups: Map<string, ComponentGroup> = new Map();
  private componentToGroupMap: Map<number, string> = new Map();
  private bitIndexToComponentMap: Map<number, typeof Component> = new Map();

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Incremented by `reset()`. A `World` records the generation it was created
   * in and refuses to work once the registry has been reset underneath it.
   */
  public get generation(): number {
    return this._generation;
  }

  public indexOf(componentDeclaration: AnyComponentConstructor): number | undefined {
    return this.bitIndexByConstructor.get(componentDeclaration as typeof Component);
  }

  /**
   * Assigns a bit index to a component class. Registering the same class again
   * is a no-op that keeps its existing index. Two distinct classes sharing a
   * name are rejected because entities store components by name.
   */
  public registerComponent<T extends AnyComponentConstructor>(componentDeclaration: T): T {
    const declaration = componentDeclaration as unknown as typeof Component;

    if (typeof declaration !== "function" || !("bitIndex" in Object(declaration.prototype))) {
      throw new Error("Only classes extending Component can be registered.");
    }

    if (declaration.name === "") {
      throw new Error("Component classes must have a non-empty name.");
    }

    if (this.bitIndexByConstructor.has(declaration)) {
      return componentDeclaration;
    }

    const name = declaration.name;
    const sameName = this.components.get(name);
    if (sameName && sameName !== declaration) {
      throw new Error(`A different component class named "${name}" is already registered.`);
    }

    const bitIndex = this.nextBitIndex++;
    this.bitIndexByConstructor.set(declaration, bitIndex);
    this.bitIndexToComponentMap.set(bitIndex, declaration);
    this.components.set(name, declaration);

    return componentDeclaration;
  }

  public registerComponents(componentDeclarations: AnyComponentConstructor[]) {
    componentDeclarations.forEach((declaration) => {
      this.registerComponent(declaration);
    });
  }

  public getComponent(name: string): typeof Component {
    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component requested ${name} is non-existent.`);
    }

    return component;
  }

  public getComponentByBitIndex(bitIndex: number): typeof Component | undefined {
    return this.bitIndexToComponentMap.get(bitIndex);
  }

  public registerComponentGroup(groupName: string, components: AnyComponentConstructor[], options: ComponentGroupOptions = {}) {
    const bitIndices = components.map((component) => {
      const bitIndex = this.indexOf(component);
      if (typeof bitIndex === "undefined") {
        throw new Error(`Please register the component ${component.name} in the ComponentRegistry before adding it to the group "${groupName}".`);
      }
      return bitIndex;
    });

    const existing = this.componentGroups.get(groupName);
    if (existing) {
      const sameMembers = existing.components.length === components.length && existing.components.every((member, i) => member === components[i]);
      const sameOptions = Boolean(existing.options.mutuallyExclusive) === Boolean(options.mutuallyExclusive);
      if (sameMembers && sameOptions) {
        return;
      }
      throw new Error(`A component group named "${groupName}" is already registered with different members.`);
    }

    bitIndices.forEach((bitIndex, i) => {
      const otherGroup = this.componentToGroupMap.get(bitIndex);
      if (otherGroup !== undefined) {
        throw new Error(`Component ${components[i].name} already belongs to the group "${otherGroup}".`);
      }
    });

    const groupBitset = this.createBitset();
    for (const bitIndex of bitIndices) {
      bitset.setBit(groupBitset, bitIndex);
      this.componentToGroupMap.set(bitIndex, groupName);
    }
    this.componentGroups.set(groupName, { components, bitset: groupBitset, options });
  }

  public getComponentGroup(groupName: string): ComponentGroup | undefined {
    return this.componentGroups.get(groupName);
  }

  public getComponentGroupName(bitIndex: number): string | undefined {
    return this.componentToGroupMap.get(bitIndex);
  }

  public getComponentCount(): number {
    return this.nextBitIndex;
  }

  /**
   * Number of bits a freshly created bitset holds: enough for every registered
   * component, rounded up to a whole 32-bit word, never less than one word.
   */
  public getBitsetCapacity(): number {
    return Math.max(WORD_BITS, Math.ceil(this.nextBitIndex / WORD_BITS) * WORD_BITS);
  }

  public createBitset(): bitset.Bitset {
    return bitset.create(this.getBitsetCapacity());
  }

  /**
   * Forgets every registration and advances the generation. Classes registered
   * before the reset lose their bit index, and worlds created before the reset
   * throw on their next entity or query operation.
   */
  public reset() {
    if (isFrameRunning()) {
      throw new Error("reset() was called while a World frame is running; defer it with queueMicrotask.");
    }
    this.nextBitIndex = 0;
    this._generation++;
    this.bitIndexByConstructor.clear();
    this.components.clear();
    this.componentGroups.clear();
    this.componentToGroupMap.clear();
    this.bitIndexToComponentMap.clear();
  }
}
