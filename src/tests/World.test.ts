import World from "../World.ts";
import { PositionOnScreen, Renderable } from "../fixtures.ts";

describe("World", () => {
  let world: World;
  beforeEach(() => {
    world = new World();
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Renderable);
  });

  it("createEntity - entity already exist", () => {
    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(() => {
      world.createEntity("a");
    }).toThrowError('Entity with the id "a" already exists.');
  });

  it("createEntity - counting", () => {
    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(world.entities.size).toEqual(2);
  });

  it("createEntity - notifies queries", () => {
    world.createQuery("query1", { all: [Renderable] });
    world.createQuery("query2", { all: [PositionOnScreen] });

    const a = world.createEntity("a");
    a.addComponent(PositionOnScreen, { x: 1, y: 2 });
    const b = world.createEntity("b");
    b.addComponent(PositionOnScreen, { x: 10, y: 20 });
    b.addComponent(Renderable);

    expect(world.getQuery("query1").dataSet).toHaveLength(1);
    expect(world.getQuery("query2").dataSet).toHaveLength(2);
  });
});
