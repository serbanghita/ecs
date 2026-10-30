import { ComponentRegistry } from "../ComponentRegistry.ts";
import { Component } from "../Component.ts";
import { World } from "../World.ts";
import { Entity } from "../Entity.ts";
import { Query } from "../Query.ts";
import { Body, Keyboard, PositionOnScreen } from "../fixtures.ts";
import { afterEach, describe } from "vitest";
import { bitset } from "@serbanghita-gamedev/bitmask";

function defineNamed(name: string) {
  return { [name]: class extends Component<{ v?: number }> {} }[name];
}

describe("ComponentRegistry", () => {
  afterEach(() => {
    ComponentRegistry.getInstance().reset();
  });

  describe("components", () => {
    it("constructor", () => {
      const reg = ComponentRegistry.getInstance();
      expect(reg).toBeInstanceOf(ComponentRegistry);
    });

    it("registerComponent", () => {
      const reg = ComponentRegistry.getInstance();
      expect(reg).toBeInstanceOf(ComponentRegistry);

      reg.registerComponent(Body);
      reg.registerComponent(PositionOnScreen);

      expect(reg.getComponentCount()).toBe(2);
      expect(reg.getBitsetCapacity()).toBe(32);

      const body1 = new Body({ width: 10, height: 20 });
      const body2 = new Body({ width: 30, height: 40 });
      const body3 = new Body({ width: 50, height: 60 });

      const position1 = new PositionOnScreen({ x: 1, y: 2 });
      const position2 = new PositionOnScreen({ x: 3, y: 4 });
      const position3 = new PositionOnScreen({ x: 5, y: 6 });

      expect(body1.bitIndex).toBe(0);
      expect(body2.bitIndex).toBe(0);
      expect(body3.bitIndex).toBe(0);

      expect(position1.bitIndex).toBe(1);
      expect(position2.bitIndex).toBe(1);
      expect(position3.bitIndex).toBe(1);

      // Extra safety check that the properties of the class were successfully set.
      expect(body1.properties.width).toBe(10);
      expect(body1.properties.height).toBe(20);

      expect(body2.properties.width).toBe(30);
      expect(body2.properties.height).toBe(40);

      expect(body3.properties.width).toBe(50);
      expect(body3.properties.height).toBe(60);

      expect(position1.properties.x).toBe(1);
      expect(position1.properties.y).toBe(2);

      expect(position2.properties.x).toBe(3);
      expect(position2.properties.y).toBe(4);

      expect(position3.properties.x).toBe(5);
      expect(position3.properties.y).toBe(6);
    });

    it("registerComponents", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);

      expect(reg.getComponent("Body")).toBe(Body);
      expect(reg.getComponent("PositionOnScreen")).toBe(PositionOnScreen);
    });

    it("getComponent", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponent(Body);
      reg.registerComponent(PositionOnScreen);

      expect(reg.getComponent("Body")).toBe(Body);
      expect(reg.getComponent("PositionOnScreen")).toBe(PositionOnScreen);
    });
  });

  describe("component groups", () => {
    it("getComponentGroup", () => {
      const reg = ComponentRegistry.getInstance();

      reg.registerComponent(Body);
      reg.registerComponent(PositionOnScreen);
      reg.registerComponent(Keyboard);

      reg.registerComponentGroup("group1", [Body, PositionOnScreen]);
      reg.registerComponentGroup("group2", [Keyboard]);

      expect(reg.getComponentGroup("group0")).toBeUndefined();
      expect(reg.getComponentGroup("group1")).toEqual(
        expect.objectContaining({
          bitset: bitset.fromIndices([0, 1], 32),
          components: [Body, PositionOnScreen],
        }),
      );
      expect(reg.getComponentGroup("group2")).toEqual(
        expect.objectContaining({
          bitset: bitset.fromIndices([2], 32),
          components: [Keyboard],
        }),
      );
    });

    it("getComponentGroupName", () => {
      const reg = ComponentRegistry.getInstance();

      reg.registerComponent(Body);
      reg.registerComponentGroup("group1", [Body]);

      expect(reg.getComponentGroup("group1")).toBeDefined();

      expect(reg.getComponentGroupName(1)).toBeUndefined();
      expect(reg.getComponentGroupName(0)).toEqual("group1");
    });
  });

  describe("component identity", () => {
    it("registering the same class twice keeps its bit index", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponent(Body);
      reg.registerComponent(Body);
      reg.registerComponents([Body, PositionOnScreen, Body]);

      expect(Body.prototype.bitIndex).toBe(0);
      expect(PositionOnScreen.prototype.bitIndex).toBe(1);
      expect(reg.getComponentCount()).toBe(2);
      expect(reg.getComponentByBitIndex(0)).toBe(Body);
    });

    it("re-registering through a second world keeps the first world's entities and queries valid", () => {
      const world1 = new World();
      world1.registerComponents([Body, PositionOnScreen]);
      const entity = world1.createEntity("e1").addComponent(Body, { width: 1, height: 1 });
      const query = world1.createQuery("bodies", { all: [Body] });

      const world2 = new World();
      world2.registerComponents([Body, PositionOnScreen]);

      expect(entity.hasComponent(Body)).toBe(true);
      expect(entity.hasComponent(PositionOnScreen)).toBe(false);
      expect(query.execute().has("e1")).toBe(true);
      expect(world1.createQuery("bodies-again", { all: [Body] }).execute().has("e1")).toBe(true);
    });

    it("reset removes bit indices so stale classes cannot alias new registrations", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);
      reg.reset();

      expect(Body.prototype.bitIndex).toBeUndefined();
      expect(PositionOnScreen.prototype.bitIndex).toBeUndefined();

      reg.registerComponent(Keyboard);
      const entity = new World().createEntity("e1").addComponent(Keyboard);

      expect(Keyboard.prototype.bitIndex).toBe(0);
      expect(() => entity.hasComponent(Body)).toThrow(/register the component Body/);
      expect(() => entity.addComponent(Body, { width: 1, height: 1 })).toThrow(/register the component Body/);
    });

    it("rejects a different class with an already registered name", () => {
      const reg = ComponentRegistry.getInstance();
      const First = defineNamed("Dup");
      const Second = defineNamed("Dup");
      reg.registerComponent(First);

      expect(() => reg.registerComponent(Second)).toThrow(/named "Dup" is already registered/);
      expect(Second.prototype.bitIndex).toBeUndefined();
      expect(reg.getComponentCount()).toBe(1);
      expect(reg.getComponent("Dup")).toBe(First);

      const entity = new World().createEntity("e1").addComponent(First, { v: 1 });
      expect(() => entity.addComponent(Second, { v: 2 })).toThrow(/register the component Dup/);
      expect(entity.getComponent(First).properties.v).toBe(1);
    });

    it("bit index cannot be overwritten from outside the registry", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponent(Body);
      const prototype = Body.prototype as { bitIndex: number };
      const instance = new Body({ width: 1, height: 1 }) as { bitIndex: number };

      expect(() => {
        prototype.bitIndex = 99;
      }).toThrow(TypeError);
      expect(() => {
        instance.bitIndex = 99;
      }).toThrow(TypeError);
      expect(() => {
        Object.defineProperty(Component.prototype, "bitIndex", { value: 99 });
      }).toThrow(TypeError);
      expect(() => {
        delete (Component.prototype as { bitIndex?: number }).bitIndex;
      }).toThrow(TypeError);
      expect(Object.hasOwn(Body.prototype, "bitIndex")).toBe(false);
      expect(Body.prototype.bitIndex).toBe(0);
      expect(instance.bitIndex).toBe(0);
    });

    it("a component declaring its own bitIndex field is rejected", () => {
      const reg = ComponentRegistry.getInstance();
      class Shadow extends Component<{ v?: number }> {
        constructor(properties: { v?: number }) {
          super(properties);
          Object.defineProperty(this, "bitIndex", { value: 7 });
        }
      }
      reg.registerComponents([Body, Shadow]);
      const entity = new World().createEntity("e1");

      expect(() => entity.addComponent(Shadow)).toThrow(/must not declare its own "bitIndex"/);
      expect(entity.hasComponent(Shadow)).toBe(false);
    });

    it("an unregistered subclass does not inherit its parent's identity", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponent(Body);
      class SubBody extends Body {}
      const SameNameSubBody = { Body: class extends Body {} }.Body;
      const world = new World();
      const entity = world.createEntity("e1").addComponent(Body, { width: 1, height: 1 });

      expect(SubBody.prototype.bitIndex).toBeUndefined();
      expect(new SubBody({ width: 1, height: 1 }).bitIndex).toBeUndefined();
      expect(() => entity.addComponent(SubBody, { width: 2, height: 2 })).toThrow(/register the component SubBody/);
      expect(() => entity.addComponent(SameNameSubBody, { width: 2, height: 2 })).toThrow(/register the component Body/);
      expect(() => entity.hasComponent(SubBody)).toThrow(/register the component SubBody/);
      expect(() => world.createQuery("sub", { all: [SubBody] })).toThrow(/register the component SubBody/);
      expect(() => reg.registerComponentGroup("g", [SubBody])).toThrow(/register the component SubBody/);
      expect(entity.getComponent(Body).properties.width).toBe(1);

      reg.registerComponent(SubBody);
      expect(SubBody.prototype.bitIndex).toBe(1);
      expect(entity.hasComponent(SubBody)).toBe(false);
      entity.addComponent(SubBody, { width: 2, height: 2 });
      expect(entity.getComponent(Body).properties.width).toBe(1);
      expect(entity.getComponent(SubBody).properties.width).toBe(2);
      expect(reg.getComponentGroupName(0)).toBeUndefined();
    });

    it("addComponent of an unregistered class throws before constructing it", () => {
      const reg = ComponentRegistry.getInstance();
      let constructed = 0;
      class Counted extends Component<{ v?: number }> {
        constructor(properties: { v?: number }) {
          super(properties);
          constructed++;
        }
      }
      reg.registerComponent(Counted);
      reg.reset();
      reg.registerComponent(Body);
      const entity = new World().createEntity("e1");

      expect(() => entity.addComponent(Counted)).toThrow(/register the component Counted/);
      expect(constructed).toBe(0);
    });

    it("getComponent rejects a different class with the same name", () => {
      const reg = ComponentRegistry.getInstance();
      const First = defineNamed("Dup");
      const Second = defineNamed("Dup");
      reg.registerComponent(First);
      const entity = new World().createEntity("e1").addComponent(First, { v: 1 });

      expect(entity.getComponent(First).properties.v).toBe(1);
      expect(() => entity.getComponent(Second)).toThrow(/Dup is non-existent/);
    });

    it("a world created before reset refuses to operate on stale identities", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);
      const oldWorld = new World();
      const entity = oldWorld.createEntity("e1").addComponent(Body, { width: 1, height: 1 });
      const query = oldWorld.createQuery("bodies", { all: [Body] });
      expect(query.execute().has("e1")).toBe(true);

      reg.reset();
      reg.registerComponents([PositionOnScreen, Body]);

      const stale = /ComponentRegistry was reset after this World was created/;
      expect(() => entity.hasComponent(Body)).toThrow(stale);
      expect(() => entity.hasComponent(PositionOnScreen)).toThrow(stale);
      expect(() => entity.addComponent(PositionOnScreen, { x: 0, y: 0 })).toThrow(stale);
      expect(() => entity.removeComponent(Body)).toThrow(stale);
      expect(() => oldWorld.createEntity("e2")).toThrow(stale);
      expect(() => oldWorld.createQuery("positions", { all: [PositionOnScreen] })).toThrow(stale);
      expect(() => new Entity(oldWorld, "x")).toThrow(stale);
      expect(() => new Query(oldWorld, "q", { all: [PositionOnScreen] })).toThrow(stale);
      expect(() => oldWorld.start()).toThrow(stale);

      const newWorld = new World();
      const fresh = newWorld.createEntity("e1").addComponent(PositionOnScreen, { x: 0, y: 0 });
      expect(fresh.hasComponent(PositionOnScreen)).toBe(true);
      expect(fresh.hasComponent(Body)).toBe(false);
      expect(newWorld.createQuery("bodies", { all: [Body] }).execute().size).toBe(0);
    });

    it("registerComponentGroup rejects unregistered members before touching any state", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);

      expect(() => reg.registerComponentGroup("g", [Body, PositionOnScreen, Keyboard])).toThrow(/register the component Keyboard/);
      expect(reg.getComponentGroup("g")).toBeUndefined();
      expect(reg.getComponentGroupName(0)).toBeUndefined();
      expect(reg.getComponentGroupName(1)).toBeUndefined();
    });

    it("re-registering a group with identical members and options is a no-op", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);
      reg.registerComponentGroup("g", [Body, PositionOnScreen], { mutuallyExclusive: true });
      const first = reg.getComponentGroup("g");

      reg.registerComponentGroup("g", [Body, PositionOnScreen], { mutuallyExclusive: true });

      expect(reg.getComponentGroup("g")).toBe(first);
      expect(reg.getComponentGroupName(0)).toBe("g");
      expect(reg.getComponentGroupName(1)).toBe("g");
    });

    it("re-registering a group with different members or options throws and keeps the old group", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen, Keyboard]);
      reg.registerComponentGroup("g", [Body, PositionOnScreen], { mutuallyExclusive: true });

      expect(() => reg.registerComponentGroup("g", [PositionOnScreen, Keyboard], { mutuallyExclusive: true })).toThrow(
        /named "g" is already registered with different members/,
      );
      expect(() => reg.registerComponentGroup("g", [Body, PositionOnScreen], { mutuallyExclusive: false })).toThrow(/different members/);
      expect(reg.getComponentGroupName(reg.indexOf(Body) as number)).toBe("g");
      expect(reg.getComponentGroupName(reg.indexOf(Keyboard) as number)).toBeUndefined();

      const entity = new World().createEntity("e1").addComponent(PositionOnScreen, { x: 0, y: 0 });
      entity.addComponent(Body, { width: 1, height: 1 });
      expect(entity.hasComponent(PositionOnScreen)).toBe(false);
      expect(entity.hasComponent(Body)).toBe(true);
    });

    it("a component cannot belong to two groups", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen, Keyboard]);
      reg.registerComponentGroup("g", [Body, PositionOnScreen]);

      expect(() => reg.registerComponentGroup("h", [PositionOnScreen, Keyboard])).toThrow(/PositionOnScreen already belongs to the group "g"/);
      expect(reg.getComponentGroup("h")).toBeUndefined();
      expect(reg.getComponentGroupName(reg.indexOf(Keyboard) as number)).toBeUndefined();
    });

    it("rejects values that are not component classes without consuming a bit index", () => {
      const reg = ComponentRegistry.getInstance();
      class Plain {
        constructor(public properties: object) {}
      }
      const Anonymous = (() => class extends Component<{ v?: number }> {})();

      expect(() => reg.registerComponent((() => {}) as unknown as typeof Body)).toThrow(/Only classes extending Component/);
      expect(() => reg.registerComponent(Plain as unknown as typeof Body)).toThrow(/Only classes extending Component/);
      expect(reg.getComponentCount()).toBe(0);
      expect(Anonymous.name).toBe("");
      expect(() => reg.registerComponent(Anonymous)).toThrow(/non-empty name/);
      expect(reg.getComponentCount()).toBe(0);
      reg.registerComponent(Body);
      expect(Body.prototype.bitIndex).toBe(0);
    });

    it("indexOf returns the registered index and undefined otherwise", () => {
      const reg = ComponentRegistry.getInstance();
      reg.registerComponents([Body, PositionOnScreen]);

      expect(reg.indexOf(Body)).toBe(0);
      expect(reg.indexOf(PositionOnScreen)).toBe(1);
      expect(reg.indexOf(Keyboard)).toBeUndefined();
      expect(new Body({ width: 1, height: 1 }).bitIndex).toBe(reg.indexOf(Body));
    });
  });
});
