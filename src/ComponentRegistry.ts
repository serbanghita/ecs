import { Component } from "./Component.ts";
import { bitset } from "@serbanghita-gamedev/bitmask";

export type ComponentConstructor<
  TProps extends NonNullable<object> = NonNullable<object>,
  TComp extends Component<TProps> = Component<TProps>,
> = new (properties: TProps) => TComp;

export type ComponentGroupOptions = {
  mutuallyExclusive?: boolean;
};

export type ComponentGroup = {
  components: ComponentConstructor[];
  bitset: bitset.Bitset;
  options: ComponentGroupOptions;
};

const WORD_BITS = 32;

export class ComponentRegistry {
  private static instance: ComponentRegistry;

  private nextBitIndex = 0;
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

  public registerComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp) {
    if (componentDeclaration.prototype && typeof componentDeclaration.prototype === "object") {
      const bitIndex = this.nextBitIndex++;
      Object.defineProperty(componentDeclaration.prototype, "bitIndex", {
        value: bitIndex,
        writable: true,
        configurable: true,
      });
      this.bitIndexToComponentMap.set(bitIndex, componentDeclaration as typeof Component);
    }
    this.components.set(componentDeclaration.prototype.constructor.name, componentDeclaration as typeof Component);

    return componentDeclaration;
  }

  public registerComponents<T extends Array<ComponentConstructor>>(componentDeclarations: [...T]) {
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

  public registerComponentGroup<T extends Array<ComponentConstructor>>(groupName: string, components: [...T], options: ComponentGroupOptions = {}) {
    const groupBitset = this.createBitset();
    for (const component of components) {
      bitset.setBit(groupBitset, component.prototype.bitIndex);
      this.componentToGroupMap.set(component.prototype.bitIndex, groupName);
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

  public reset() {
    this.nextBitIndex = 0;
    this.components.clear();
    this.componentGroups.clear();
    this.componentToGroupMap.clear();
    this.bitIndexToComponentMap.clear();
  }
}
