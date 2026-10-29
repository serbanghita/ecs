export class Component<T extends NonNullable<object>> {
  // Assigned on the prototype by ComponentRegistry.registerComponent().
  // `declare` keeps the field type-only so no instance field shadows the prototype value.
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
