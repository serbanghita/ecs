import Query from "./Query.ts";
import ComponentRegistry from "./ComponentRegistry.ts";
import World from "./World.ts";
import { Keyboard, Body, PositionOnScreen, Renderable } from "./fixtures.ts";

describe("Query", () => {
  const world = new World();

  const reg = ComponentRegistry.getInstance();
  reg.registerComponent(Body);
  reg.registerComponent(PositionOnScreen);
  reg.registerComponent(Keyboard);
  reg.registerComponent(Renderable);

  const dino = world.createEntity("dino");
  dino.addComponent(Body, { width: 10, height: 20 });
  dino.addComponent(PositionOnScreen, { x: 1, y: 2 });
  dino.addComponent(Renderable);

  const player = world.createEntity("player");
  player.addComponent(Body, { width: 30, height: 40 });
  player.addComponent(PositionOnScreen, { x: 3, y: 4 });
  player.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });
  player.addComponent(Renderable);

  const someEntity = world.createEntity("someEntity");

  const camera = world.createEntity("camera");
  camera.addComponent(PositionOnScreen, { x: 0, y: 0 });

  it("all", () => {
    const q = new Query(world, "all", { all: [Renderable] });
    q.init();

    expect(q.execute()).toHaveLength(2);
    expect(q.execute().get("dino")).toEqual(dino);
    expect(q.execute().get("player")).toEqual(player);
  });

  it("any", () => {
    const q = new Query(world, "any", { any: [Renderable, PositionOnScreen] });
    q.init();

    expect(q.execute()).toHaveLength(3);
    expect(q.execute().get("dino")).toEqual(dino);
    expect(q.execute().get("player")).toEqual(player);
    expect(q.execute().get("camera")).toEqual(camera);
  });

  it("none", () => {
    const q = new Query(world, "none", { none: [Keyboard] });
    q.init();

    expect(q.execute()).toHaveLength(3);
    expect(q.execute().get("dino")).toEqual(dino);
    expect(q.execute().get("camera")).toEqual(camera);
    expect(q.execute().get("someEntity")).toEqual(someEntity);
  });

  it("all(1) + none", () => {
    const q = new Query(world, "all(1) + none", { all: [Body], none: [Keyboard] });
    q.init();

    expect(q.execute()).toHaveLength(1);
    expect(q.execute().get("dino")).toEqual(dino);
  });

  it("all(2) + none", () => {
    const q = new Query(world, "all(2) + none", { all: [Body, PositionOnScreen], none: [Renderable] });

    expect(q.execute()).toHaveLength(0);
  });

  it("candidate", () => {
    const q = new Query(world, "only entities with a body", { all: [Body] });

    expect(q.execute()).toHaveLength(0);
    q.candidate(player);
    q.candidate(dino);
    expect(q.execute()).toHaveLength(2);
    q.candidate(camera);
    expect(q.execute()).toHaveLength(2);

    expect(q.execute().get("dino")).toEqual(dino);
    expect(q.execute().get("player")).toEqual(player);
  });

  it("remove", () => {
    const q = new Query(world, "only entities with a body", { all: [Body] });

    expect(q.execute()).toHaveLength(0);
    q.init();
    expect(q.execute()).toHaveLength(2);
    q.remove(player);
    expect(q.execute()).toHaveLength(1);
    expect(q.execute().get("dino")).toEqual(dino);
  });
});
