export default class Component<T extends NonNullable<object>> {
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

// Merge the dynamic properties into the Component's type definition.
// This is a pure type-level construct and has no runtime output.
// I previously tried to declare the bitmask property on the
// Component class, but that fails when I try to read the value from prototype.
export default interface Component<T extends NonNullable<object>> {
  readonly bitmask: bigint;
}
