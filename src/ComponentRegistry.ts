import Component from "./Component.ts";
import { addBit } from "@serbanghita-gamedev/bitmask";

type ComponentConstructor<TProps extends NonNullable<object>, TComp extends Component<TProps>> = new (properties: TProps) => TComp;

export type ComponentGroupOptions = {
  mutuallyExclusive?: boolean;
};

export default class ComponentRegistry {
  private static instance: ComponentRegistry;

  private bitmask: bigint = 1n;
  private components: Map<string, typeof Component> = new Map();
  private componentGroups: Map<string, { components: (typeof Component)[]; bitmask: bigint; options: ComponentGroupOptions }> = new Map();
  private componentToGroupMap: Map<bigint, string> = new Map();
  private bitmaskToComponentMap: Map<bigint, typeof Component> = new Map();

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  public registerComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp) {
    if (componentDeclaration.prototype && typeof componentDeclaration.prototype === "object") {
      const newBitmask = (this.bitmask <<= 1n);
      Object.defineProperty(componentDeclaration.prototype, "bitmask", {
        value: newBitmask,
        writable: true,
        configurable: true,
      });
      this.bitmaskToComponentMap.set(newBitmask, componentDeclaration as typeof Component);
    }
    this.components.set(componentDeclaration.prototype.constructor.name, componentDeclaration as typeof Component);

    return componentDeclaration;
  }

  public registerComponents<T extends Array<ComponentConstructor<any, any>>>(componentDeclarations: [...T]) {
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

  public getComponentByBitmask(bitmask: bigint): typeof Component | undefined {
    return this.bitmaskToComponentMap.get(bitmask);
  }

  public registerComponentGroup<T extends Array<ComponentConstructor<any, any>>>(groupName: string, components: [...T], options: ComponentGroupOptions = {}) {
    let groupBitmask = 0n;
    for (const component of components) {
      groupBitmask = addBit(groupBitmask, component.prototype.bitmask);
      this.componentToGroupMap.set(component.prototype.bitmask, groupName);
    }
    this.componentGroups.set(groupName, { components, bitmask: groupBitmask, options });
  }

  public getComponentGroup(groupName: string): { components: (typeof Component)[]; bitmask: bigint; options: ComponentGroupOptions } | undefined {
    return this.componentGroups.get(groupName);
  }

  public getComponentGroupName(componentBitmask: bigint): string | undefined {
    return this.componentToGroupMap.get(componentBitmask);
  }

  public getLastBitmask() {
    return this.bitmask;
  }

  public reset() {
    ComponentRegistry.instance = new ComponentRegistry();
  }
}
