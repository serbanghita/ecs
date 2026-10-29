import { bitset } from "@serbanghita-gamedev/bitmask";
import { Component } from "./Component.ts";
import { World } from "./World.ts";

export class Entity {
  public componentsBitset: bitset.Bitset;
  public components: Map<string, Component<NonNullable<object>>> = new Map();

  constructor(
    public world: World,
    public id: string,
  ) {
    this.componentsBitset = world.declarations.components.createBitset();
  }

  public addComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(
    componentDeclaration: new (properties: TProps) => TComp,
    // Props may be omitted only when the component's props type accepts an
    // empty object (tag components, all-optional props). Components with
    // required props must be given them at the call site.
    ...args: Record<string, never> extends TProps ? [properties?: TProps] : [properties: TProps]
  ) {
    const properties = args[0] ?? ({} as TProps);
    let instance = this.components.get(componentDeclaration.name);

    if (instance) {
      instance.init(properties);
    } else {
      instance = new componentDeclaration(properties);
    }

    if (typeof instance.bitIndex === "undefined") {
      throw new Error(`Please register the component ${instance.constructor.name} in the ComponentRegistry.`);
    }

    const componentRegistry = this.world.declarations.components;
    const groupName = componentRegistry.getComponentGroupName(instance.bitIndex);

    if (groupName) {
      const group = componentRegistry.getComponentGroup(groupName);
      if (group && group.options.mutuallyExclusive && bitset.hasAnyBits(this.componentsBitset, group.bitset)) {
        for (const groupComponent of group.components) {
          if (groupComponent !== componentDeclaration && bitset.testBit(this.componentsBitset, groupComponent.prototype.bitIndex)) {
            this.removeComponent(groupComponent as new (properties: TProps) => TComp);
          }
        }
      }
    }

    this.components.set(componentDeclaration.name, instance);
    this.ensureBitsetCapacity(instance.bitIndex);
    bitset.setBit(this.componentsBitset, instance.bitIndex);
    this.onAddComponent(instance);

    return this;
  }

  public getComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(declaration: new (properties: TProps) => TComp) {
    const instance = this.components.get(declaration.name) as InstanceType<new (properties: TProps) => TComp>;
    if (!instance) {
      throw new Error(`Component requested ${declaration.name} is non-existent.`);
    }
    return instance;
  }

  public getComponentByName<T extends typeof Component>(name: string): InstanceType<T> {
    const instance = this.components.get(name) as InstanceType<T>;
    if (!instance) {
      throw new Error(`Component requested ${name} is non-existent.`);
    }
    return instance;
  }

  public removeComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp): Entity {
    if (!this.hasComponent(componentDeclaration)) {
      return this;
    }
    const component = this.getComponent(componentDeclaration);

    if (typeof component.bitIndex === "undefined") {
      throw new Error(`Component ${componentDeclaration.name} has no bit index.`);
    }

    bitset.clearBit(this.componentsBitset, component.bitIndex);
    this.components.delete(componentDeclaration.name);
    this.onRemoveComponent(component);

    return this;
  }

  public hasComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp): boolean {
    if (typeof componentDeclaration.prototype.bitIndex === "undefined") {
      throw new Error(`Please register the component ${componentDeclaration.name} in the ComponentRegistry.`);
    }
    return bitset.testBit(this.componentsBitset, componentDeclaration.prototype.bitIndex);
  }

  /**
   * Components registered after this entity was created may not fit in its
   * bitset. Grow it to the registry's current capacity when that happens.
   */
  private ensureBitsetCapacity(bitIndex: number) {
    if (bitIndex < bitset.capacity(this.componentsBitset)) {
      return;
    }
    const required = ((bitIndex >>> 5) + 1) * 32;
    const grown = bitset.create(Math.max(required, this.world.declarations.components.getBitsetCapacity()));
    grown.set(this.componentsBitset);
    this.componentsBitset = grown;
  }

  private onAddComponent<T extends NonNullable<object>>(newComponent: Component<T>) {
    this.world.notifyQueriesOfEntityComponentAddition(this, newComponent);
    return this;
  }

  private onRemoveComponent<T extends NonNullable<object>>(oldComponent: Component<T>) {
    this.world.notifyQueriesOfEntityComponentRemoval(this, oldComponent);
  }
}
