import { PositionOnScreen } from "../fixtures.ts";

describe("Component", () => {
  it("properties", () => {
    const position1 = new PositionOnScreen({ x: 10, y: 20 });
    const position2 = new PositionOnScreen({ x: 30, y: 40 });

    expect(position1.bitmask).toBeUndefined(); // Component "PositionOnScreen" was never registered.
    expect(position2.bitmask).toBeUndefined(); // Component "PositionOnScreen" was never registered.
    expect(position1.properties).toEqual({ x: 10, y: 20 });
    expect(position2.properties).toEqual({ x: 30, y: 40 });
  });

  it("init", () => {
    const position = new PositionOnScreen({ x: 10, y: 20 });

    position.init({ x: 11, y: 22 });
    expect(position.properties).toEqual({ x: 11, y: 22 });
  });
});
