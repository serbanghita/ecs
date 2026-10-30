import { bitIndexOf } from "./ComponentRegistry.ts";

export class Component<T extends NonNullable<object>> {
  // Identity lives in the ComponentRegistry. The runtime getter installed
  // below is the read-only view of it; `declare` keeps this field type-only,
  // so subclasses may re-declare it and no instance field is emitted.
  declare readonly bitIndex: number;

  constructor(public properties: T) {}

  // Lazy init / Re-init.
  init(properties?: T) {
    this.properties = properties || ({} as T);
  }

  // Use this when saving the state.
  serialize(): NonNullable<object> {
    return this.properties;
  }
}

Object.defineProperty(Component.prototype, "bitIndex", {
  get(this: Component<NonNullable<object>>) {
    return bitIndexOf(this.constructor as typeof Component);
  },
  enumerable: false,
  configurable: false,
});
