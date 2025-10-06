// src/Entity.ts
import { addBit, hasBit, removeBit } from "@serbanghita-gamedev/bitmask";
import Component from "./Component.ts";
import World from "./World.ts";

export default class Entity {
  public componentsBitmask = 0n;
  public components: Map<string, Component<NonNullable<object>>> = new Map();

  constructor(
    public world: World,
    public id: string,
  ) {}

  public addComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp, properties?: TProps) {
    let instance = this.components.get(componentDeclaration.name);

    if (instance) {
      instance.init(properties);
    } else {
      instance = new componentDeclaration(properties);
    }

    if (typeof instance.bitmask === "undefined") {
      throw new Error(`Please register the component ${instance.constructor.name} in the ComponentRegistry.`);
    }

    const componentRegistry = this.world.declarations.components;
    const groupName = componentRegistry.getComponentGroupName(instance.bitmask);

    if (groupName) {
      const group = componentRegistry.getComponentGroup(groupName);
      if (group && group.options.mutuallyExclusive) {
        const conflictingBitmask = this.componentsBitmask & group.bitmask;
        if (conflictingBitmask !== 0n) {
          const conflictingComponent = componentRegistry.getComponentByBitmask(conflictingBitmask);
          if (conflictingComponent) {
            this.removeComponent(conflictingComponent as new (properties: TProps) => TComp);
          }
        }
      }
    }

    this.components.set(componentDeclaration.name, instance);
    this.componentsBitmask = addBit(this.componentsBitmask, instance.bitmask);
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

    if (typeof component.bitmask === "undefined") {
      throw new Error(`Component ${componentDeclaration.name} has no bitmask.`);
    }

    this.componentsBitmask = removeBit(this.componentsBitmask, component.bitmask);
    this.components.delete(componentDeclaration.name);
    this.onRemoveComponent(component);

    return this;
  }

  public hasComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp): boolean {
    if (typeof componentDeclaration.prototype.bitmask === "undefined") {
      throw new Error(`Please register the component ${componentDeclaration.name} in the ComponentRegistry.`);
    }
    return hasBit(this.componentsBitmask, componentDeclaration.prototype.bitmask);
  }

  private onAddComponent<T extends NonNullable<object>>(newComponent: Component<T>) {
    this.world.notifyQueriesOfEntityComponentAddition(this, newComponent);
    return this;
  }

  private onRemoveComponent<T extends NonNullable<object>>(oldComponent: Component<T>) {
    this.world.notifyQueriesOfEntityComponentRemoval(this, oldComponent);
  }
}
