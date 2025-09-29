import ComponentRegistry from "../ComponentRegistry.ts";
import { Body, Keyboard, PositionOnScreen } from "../fixtures.ts";
import { afterAll, afterEach, describe } from "vitest";

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

      expect(reg.getLastBitmask()).toBe(4n);

      const body1 = new Body({ width: 10, height: 20 });
      const body2 = new Body({ width: 30, height: 40 });
      const body3 = new Body({ width: 50, height: 60 });

      const position1 = new PositionOnScreen({ x: 1, y: 2 });
      const position2 = new PositionOnScreen({ x: 3, y: 4 });
      const position3 = new PositionOnScreen({ x: 5, y: 6 });

      expect(body1.bitmask).toBe(2n);
      expect(body2.bitmask).toBe(2n);
      expect(body3.bitmask).toBe(2n);

      expect(position1.bitmask).toBe(4n);
      expect(position2.bitmask).toBe(4n);
      expect(position3.bitmask).toBe(4n);

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
          bitmask: 6n,
          components: [Body, PositionOnScreen],
        }),
      );
      expect(reg.getComponentGroup("group2")).toEqual(
        expect.objectContaining({
          bitmask: 8n,
          components: [Keyboard],
        }),
      );
    });

    it("getComponentGroupName", () => {
      const reg = ComponentRegistry.getInstance();

      reg.registerComponent(Body);
      reg.registerComponentGroup("group1", [Body]);

      const a = reg.getComponentGroup("group1");

      expect(reg.getComponentGroupName(1n)).toBeUndefined();
      expect(reg.getComponentGroupName(2n)).toEqual("group1");
    });
  });
});
