import { describe, it, expect, afterEach } from "vitest";
import { bitset } from "@serbanghita-gamedev/bitmask";
import { World } from "../World.ts";
import { Component } from "../Component.ts";
import { ComponentRegistry } from "../ComponentRegistry.ts";
import { ComponentConstructor } from "../ComponentRegistry.ts";

function makeComponents(count: number, prefix = "C"): ComponentConstructor[] {
  return Array.from({ length: count }, (_, i) => {
    const Declaration = class extends Component<Record<string, never>> {};
    Object.defineProperty(Declaration, "name", { value: `${prefix}${i}` });
    return Declaration as ComponentConstructor;
  });
}

describe("more than 32 components", () => {
  const registry = ComponentRegistry.getInstance();

  afterEach(() => {
    registry.reset();
  });

  it("registry capacity grows one 32-bit word at a time", () => {
    expect(registry.getBitsetCapacity()).toBe(32);
    registry.registerComponents(makeComponents(32));
    expect(registry.getComponentCount()).toBe(32);
    expect(registry.getBitsetCapacity()).toBe(32);
    registry.registerComponents(makeComponents(1, "D"));
    expect(registry.getBitsetCapacity()).toBe(64);
    registry.registerComponents(makeComponents(40, "E"));
    expect(registry.getComponentCount()).toBe(73);
    expect(registry.getBitsetCapacity()).toBe(96);
    expect(registry.createBitset().length).toBe(3);
  });

  it("entities and queries work with components past bit 31 and bit 63", () => {
    const components = makeComponents(70);
    registry.registerComponents(components);
    const world = new World();

    const First = components[0];
    const Thirty = components[31];
    const ThirtyTwo = components[32];
    const SixtyNine = components[69];

    const a = world.createEntity("a").addComponent(First).addComponent(ThirtyTwo).addComponent(SixtyNine);
    const b = world.createEntity("b").addComponent(First).addComponent(Thirty);
    const c = world.createEntity("c").addComponent(SixtyNine);

    expect(a.componentsBitset.length).toBe(3);
    expect(a.hasComponent(SixtyNine)).toBe(true);
    expect(b.hasComponent(SixtyNine)).toBe(false);

    const highAll = world.createQuery("highAll", { all: [ThirtyTwo, SixtyNine] });
    expect([...highAll.execute().keys()]).toEqual(["a"]);

    const highAny = world.createQuery("highAny", { any: [Thirty, SixtyNine] });
    expect([...highAny.execute().keys()].sort()).toEqual(["a", "b", "c"]);

    const noneHigh = world.createQuery("noneHigh", { all: [First], none: [SixtyNine] });
    expect([...noneHigh.execute().keys()]).toEqual(["b"]);

    a.removeComponent(SixtyNine);
    expect([...highAll.execute().keys()]).toEqual([]);
    expect([...noneHigh.execute().keys()].sort()).toEqual(["a", "b"]);

    c.addComponent(ThirtyTwo).addComponent(SixtyNine);
    expect([...highAll.execute().keys()]).toEqual(["c"]);
  });

  it("an entity created before later registrations grows its bitset on demand", () => {
    const early = makeComponents(2, "Early");
    registry.registerComponents(early);
    const world = new World();
    const entity = world.createEntity("e").addComponent(early[0]);
    expect(entity.componentsBitset.length).toBe(1);

    const late = makeComponents(40, "Late");
    registry.registerComponents(late);
    const Last = late[39];
    expect(Last.prototype.bitIndex).toBe(41);

    entity.addComponent(Last);
    expect(entity.componentsBitset.length).toBe(2);
    expect(entity.hasComponent(early[0])).toBe(true);
    expect(entity.hasComponent(Last)).toBe(true);

    const query = world.createQuery("late", { all: [early[0], Last] });
    expect([...query.execute().keys()]).toEqual(["e"]);
  });

  it("mutually exclusive groups work across word boundaries", () => {
    const components = makeComponents(40);
    registry.registerComponents(components);
    const Low = components[1];
    const High = components[39];
    registry.registerComponentGroup("state", [Low, High], { mutuallyExclusive: true });
    const world = new World();

    const entity = world.createEntity("e").addComponent(Low);
    entity.addComponent(High);
    expect(entity.hasComponent(Low)).toBe(false);
    expect(entity.hasComponent(High)).toBe(true);
    entity.addComponent(Low);
    expect(entity.hasComponent(Low)).toBe(true);
    expect(entity.hasComponent(High)).toBe(false);
    expect(bitset.toBinaryString(entity.componentsBitset)).toBe("0".repeat(62) + "10");
  });
});
