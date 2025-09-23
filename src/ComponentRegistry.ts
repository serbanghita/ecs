// create a singleton class
import Component from "./Component.ts";

type ComponentConstructor<TProps extends NonNullable<object>, TComp extends Component<TProps>> = new (properties: TProps) => TComp;

export default class ComponentRegistry {
  private static instance: ComponentRegistry;

  private bitmask: bigint = 1n;
  private components: Map<string, typeof Component> = new Map();

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  public registerComponent<TProps extends NonNullable<object>, TComp extends Component<TProps>>(componentDeclaration: new (properties: TProps) => TComp) {
    if (componentDeclaration.prototype && typeof componentDeclaration.prototype === "object") {
      Object.defineProperty(componentDeclaration.prototype, "bitmask", {
        value: (this.bitmask <<= 1n),
        writable: true,
        configurable: true,
      });
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

  public getLastBitmask() {
    return this.bitmask;
  }
}
