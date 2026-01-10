import { Query } from "../Query.ts";
import { ComponentRegistry } from "../ComponentRegistry.ts";
import { World } from "../World.ts";
import { Keyboard, Body, PositionOnScreen, Renderable } from "../fixtures.ts";

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

describe("Query - dynamic none filter", () => {
  it("removes entity from query when a 'none' component is added", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);

    // Create entity without Keyboard
    const entity = world.createEntity("testEntity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Create query that excludes entities with Keyboard
    const query = world.createQuery("noKeyboard", { all: [Body], none: [Keyboard] });

    // Entity should be in query (has Body, no Keyboard)
    expect(query.execute().size).toBe(1);
    expect(query.execute().get("testEntity")).toEqual(entity);

    // Add Keyboard component
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity should be removed from query
    expect(query.execute().size).toBe(0);
    expect(query.execute().get("testEntity")).toBeUndefined();
  });

  it("adds entity back to query when a 'none' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);

    // Create entity with Keyboard
    const entity = world.createEntity("testEntity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Create query that excludes entities with Keyboard
    const query = world.createQuery("noKeyboard", { all: [Body], none: [Keyboard] });

    // Entity should NOT be in query (has Keyboard)
    expect(query.execute().size).toBe(0);

    // Remove Keyboard component
    entity.removeComponent(Keyboard);

    // Entity should now be in query
    expect(query.execute().size).toBe(1);
    expect(query.execute().get("testEntity")).toEqual(entity);
  });

  it("handles multiple entities with dynamic none filter", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Keyboard);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Body, { width: 10, height: 20 });

    const entity3 = world.createEntity("entity3");
    entity3.addComponent(Body, { width: 10, height: 20 });
    entity3.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Query excludes entities with Keyboard
    const query = world.createQuery("noKeyboard", { all: [Body], none: [Keyboard] });

    // entity1 and entity2 should be in query, entity3 should not
    expect(query.execute().size).toBe(2);
    expect(query.execute().has("entity1")).toBe(true);
    expect(query.execute().has("entity2")).toBe(true);
    expect(query.execute().has("entity3")).toBe(false);

    // Add Keyboard to entity1
    entity1.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Now only entity2 should be in query
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity1")).toBe(false);
    expect(query.execute().has("entity2")).toBe(true);

    // Remove Keyboard from entity3
    entity3.removeComponent(Keyboard);

    // Now entity2 and entity3 should be in query
    expect(query.execute().size).toBe(2);
    expect(query.execute().has("entity2")).toBe(true);
    expect(query.execute().has("entity3")).toBe(true);
  });
});

describe("Query - all + any combination", () => {
  it("requires both all and any conditions to be met", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    // Entity with all required + one of any
    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });
    entity1.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity1.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity with all required but none of any
    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Body, { width: 10, height: 20 });
    entity2.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Entity with one of any but not all required
    const entity3 = world.createEntity("entity3");
    entity3.addComponent(Body, { width: 10, height: 20 });
    entity3.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity with neither
    const entity4 = world.createEntity("entity4");
    entity4.addComponent(Body, { width: 10, height: 20 });

    // Query: all [Body, PositionOnScreen] + any [Keyboard, Renderable]
    const query = world.createQuery("allPlusAny", {
      all: [Body, PositionOnScreen],
      any: [Keyboard, Renderable]
    });

    // Only entity1 should match (has all + has any)
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity1")).toBe(true);
    expect(query.execute().has("entity2")).toBe(false); // has all, but no any
    expect(query.execute().has("entity3")).toBe(false); // has any, but not all
    expect(query.execute().has("entity4")).toBe(false); // neither
  });

  it("works with all + any + none", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    // Entity with all + any, no none
    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });
    entity1.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity1.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity with all + any + none component
    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Body, { width: 10, height: 20 });
    entity2.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity2.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });
    entity2.addComponent(Renderable);

    // Query: all [Body, PositionOnScreen] + any [Keyboard] + none [Renderable]
    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    // Only entity1 should match (entity2 has Renderable which is in none)
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity1")).toBe(true);
    expect(query.execute().has("entity2")).toBe(false);
  });
});

describe("Query - any + none combination", () => {
  it("matches entities with any of specified components but none of excluded", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    // Entity with one of 'any' components, no 'none' components
    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Renderable);

    // Entity with another 'any' component, no 'none' components
    const entity2 = world.createEntity("entity2");
    entity2.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Entity with both 'any' components, no 'none' components
    const entity3 = world.createEntity("entity3");
    entity3.addComponent(Renderable);
    entity3.addComponent(PositionOnScreen, { x: 3, y: 4 });

    // Entity with 'any' component AND 'none' component (should be excluded)
    const entity4 = world.createEntity("entity4");
    entity4.addComponent(Renderable);
    entity4.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity with only 'none' component (should be excluded)
    const entity5 = world.createEntity("entity5");
    entity5.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity with no components (should be excluded - doesn't have any of the 'any' components)
    world.createEntity("entity6");

    // Query: any [Renderable, PositionOnScreen] + none [Keyboard]
    const query = world.createQuery("anyPlusNone", {
      any: [Renderable, PositionOnScreen],
      none: [Keyboard]
    });

    // entity1, entity2, entity3 should match
    // entity4 excluded (has Keyboard), entity5 excluded (no any, has none), entity6 excluded (no any)
    expect(query.execute().size).toBe(3);
    expect(query.execute().has("entity1")).toBe(true);
    expect(query.execute().has("entity2")).toBe(true);
    expect(query.execute().has("entity3")).toBe(true);
    expect(query.execute().has("entity4")).toBe(false);
    expect(query.execute().has("entity5")).toBe(false);
    expect(query.execute().has("entity6")).toBe(false);
  });

  it("dynamically updates when 'none' component is added", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Renderable);

    const query = world.createQuery("anyPlusNone", {
      any: [Renderable],
      none: [Keyboard]
    });

    // Entity should be in query
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity")).toBe(true);

    // Add Keyboard (in 'none' filter)
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity should be removed from query
    expect(query.execute().size).toBe(0);
  });

  it("dynamically updates when 'any' component is removed", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Renderable);
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    const query = world.createQuery("anyPlusNone", {
      any: [Renderable, PositionOnScreen],
      none: [Keyboard]
    });

    // Entity should be in query (has both any components)
    expect(query.execute().size).toBe(1);

    // Remove one 'any' component - should still be in query
    entity.removeComponent(Renderable);
    expect(query.execute().size).toBe(1);

    // Remove remaining 'any' component - should be removed from query
    entity.removeComponent(PositionOnScreen);
    expect(query.execute().size).toBe(0);
  });

  it("dynamically updates when 'any' component is added", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");

    const query = world.createQuery("anyPlusNone", {
      any: [Renderable],
      none: [Keyboard]
    });

    // Entity should NOT be in query (no 'any' components)
    expect(query.execute().size).toBe(0);

    // Add Renderable (in 'any' filter)
    entity.addComponent(Renderable);

    // Entity should now be in query
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity")).toBe(true);
  });
});

describe("Query - empty filters", () => {
  it("matches all entities when no filters specified", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Renderable);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Renderable);

    const entity3 = world.createEntity("entity3");
    // No components

    const query = world.createQuery("emptyFilters", {});

    // All entities should match
    expect(query.execute().size).toBe(3);
    expect(query.execute().has("entity1")).toBe(true);
    expect(query.execute().has("entity2")).toBe(true);
    expect(query.execute().has("entity3")).toBe(true);
  });

  it("matches all entities when filters have empty arrays", () => {
    const world = new World();

    world.registerComponent(Body);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");

    const query = world.createQuery("emptyArrays", { all: [], any: [], none: [] });

    // All entities should match (empty arrays = no constraints)
    expect(query.execute().size).toBe(2);
  });
});

describe("Query - dynamic all filter", () => {
  it("adds entity to query when 'all' component is added", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });

    const query = world.createQuery("allQuery", { all: [Body, PositionOnScreen] });

    // Entity should NOT be in query (missing PositionOnScreen)
    expect(query.execute().size).toBe(0);

    // Add PositionOnScreen
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Entity should now be in query
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity")).toBe(true);
  });

  it("removes entity from query when 'all' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    const query = world.createQuery("allQuery", { all: [Body, PositionOnScreen] });

    // Entity should be in query
    expect(query.execute().size).toBe(1);

    // Remove one 'all' component
    entity.removeComponent(PositionOnScreen);

    // Entity should be removed from query
    expect(query.execute().size).toBe(0);
  });

  it("handles adding components in different order", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");

    const query = world.createQuery("allThree", { all: [Body, PositionOnScreen, Renderable] });

    expect(query.execute().size).toBe(0);

    // Add components one by one
    entity.addComponent(Renderable);
    expect(query.execute().size).toBe(0);

    entity.addComponent(Body, { width: 10, height: 20 });
    expect(query.execute().size).toBe(0);

    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    expect(query.execute().size).toBe(1);
  });
});

describe("Query - dynamic any filter (standalone)", () => {
  it("adds entity to query when first 'any' component is added", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");

    const query = world.createQuery("anyQuery", { any: [Renderable, Keyboard] });

    // Entity should NOT be in query
    expect(query.execute().size).toBe(0);

    // Add one 'any' component
    entity.addComponent(Renderable);

    // Entity should be in query
    expect(query.execute().size).toBe(1);
  });

  it("keeps entity in query when one of multiple 'any' components is removed", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Renderable);
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("anyQuery", { any: [Renderable, Keyboard] });

    expect(query.execute().size).toBe(1);

    // Remove one 'any' component
    entity.removeComponent(Renderable);

    // Entity should still be in query (has Keyboard)
    expect(query.execute().size).toBe(1);
  });

  it("removes entity from query when last 'any' component is removed", () => {
    const world = new World();

    world.registerComponent(Renderable);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Renderable);

    const query = world.createQuery("anyQuery", { any: [Renderable, Keyboard] });

    expect(query.execute().size).toBe(1);

    // Remove the only 'any' component
    entity.removeComponent(Renderable);

    // Entity should be removed from query
    expect(query.execute().size).toBe(0);
  });
});

describe("Query - dynamic none filter (standalone)", () => {
  it("removes entity from query when 'none' component is added", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });

    const query = world.createQuery("noneQuery", { none: [Keyboard] });

    // Entity should be in query (no Keyboard)
    expect(query.execute().size).toBe(1);

    // Add Keyboard
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity should be removed from query
    expect(query.execute().size).toBe(0);
  });

  it("adds entity to query when 'none' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("noneQuery", { none: [Keyboard] });

    // Entity should NOT be in query (has Keyboard)
    expect(query.execute().size).toBe(0);

    // Remove Keyboard
    entity.removeComponent(Keyboard);

    // Entity should be in query now
    expect(query.execute().size).toBe(1);
  });

  it("entity with no components matches none-only filter", () => {
    const world = new World();

    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");

    const query = world.createQuery("noneQuery", { none: [Keyboard] });

    // Entity with no components should match (doesn't have Keyboard)
    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity")).toBe(true);
  });
});

describe("Query - dynamic all + any combination", () => {
  it("adds entity when final 'all' component is added (already has 'any')", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allPlusAny", {
      all: [Body, PositionOnScreen],
      any: [Keyboard, Renderable]
    });

    // Entity has Body + Keyboard, but missing PositionOnScreen
    expect(query.execute().size).toBe(0);

    // Add PositionOnScreen (completes 'all')
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Entity should now be in query
    expect(query.execute().size).toBe(1);
  });

  it("adds entity when 'any' component is added (already has all 'all')", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    const query = world.createQuery("allPlusAny", {
      all: [Body, PositionOnScreen],
      any: [Keyboard, Renderable]
    });

    // Entity has all 'all' components but no 'any' components
    expect(query.execute().size).toBe(0);

    // Add Keyboard (satisfies 'any')
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // Entity should now be in query
    expect(query.execute().size).toBe(1);
  });

  it("removes entity when 'all' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allPlusAny", {
      all: [Body, PositionOnScreen],
      any: [Keyboard]
    });

    expect(query.execute().size).toBe(1);

    // Remove an 'all' component
    entity.removeComponent(Body);

    // Entity should be removed
    expect(query.execute().size).toBe(0);
  });

  it("removes entity when last 'any' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allPlusAny", {
      all: [Body, PositionOnScreen],
      any: [Keyboard]
    });

    expect(query.execute().size).toBe(1);

    // Remove the only 'any' component
    entity.removeComponent(Keyboard);

    // Entity should be removed
    expect(query.execute().size).toBe(0);
  });
});

describe("Query - dynamic all + any + none combination", () => {
  it("adds entity when all conditions are met dynamically", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    // Missing PositionOnScreen
    expect(query.execute().size).toBe(0);

    // Add PositionOnScreen
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });

    // Now matches: has all [Body, PositionOnScreen], has any [Keyboard], doesn't have none [Renderable]
    expect(query.execute().size).toBe(1);
  });

  it("removes entity when 'none' component is added", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    expect(query.execute().size).toBe(1);

    // Add Renderable (in 'none')
    entity.addComponent(Renderable);

    // Entity should be removed
    expect(query.execute().size).toBe(0);
  });

  it("adds entity back when 'none' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });
    entity.addComponent(Renderable);

    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    // Has Renderable, so excluded
    expect(query.execute().size).toBe(0);

    // Remove Renderable
    entity.removeComponent(Renderable);

    // Entity should be in query now
    expect(query.execute().size).toBe(1);
  });

  it("removes entity when 'all' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    expect(query.execute().size).toBe(1);

    // Remove Body
    entity.removeComponent(Body);

    // Entity should be removed
    expect(query.execute().size).toBe(0);
  });

  it("removes entity when last 'any' component is removed", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(PositionOnScreen);
    world.registerComponent(Keyboard);
    world.registerComponent(Renderable);

    const entity = world.createEntity("entity");
    entity.addComponent(Body, { width: 10, height: 20 });
    entity.addComponent(PositionOnScreen, { x: 1, y: 2 });
    entity.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    const query = world.createQuery("allAnyNone", {
      all: [Body, PositionOnScreen],
      any: [Keyboard],
      none: [Renderable]
    });

    expect(query.execute().size).toBe(1);

    // Remove Keyboard (only 'any' component)
    entity.removeComponent(Keyboard);

    // Entity should be removed
    expect(query.execute().size).toBe(0);
  });
});

describe("Query - edge cases", () => {
  it("conflicting filters (same component in all and none) never matches", () => {
    const world = new World();

    world.registerComponent(Body);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");

    // Logical impossibility: must have Body AND must not have Body
    const query = world.createQuery("conflicting", {
      all: [Body],
      none: [Body]
    });

    // No entity can ever match this
    expect(query.execute().size).toBe(0);
  });

  it("conflicting filters (same component in any and none) - entity without component still excluded", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Keyboard);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Keyboard, { up: "w", down: "s", left: "a", right: "d", action_1: "e" });

    // any: [Body, Keyboard], none: [Body]
    // entity1 has Body -> excluded by none
    // entity2 has Keyboard (any) but not Body (none) -> should match
    const query = world.createQuery("partialConflict", {
      any: [Body, Keyboard],
      none: [Body]
    });

    expect(query.execute().size).toBe(1);
    expect(query.execute().has("entity2")).toBe(true);
    expect(query.execute().has("entity1")).toBe(false);
  });

  it("query created after entities exist finds them via init", () => {
    const world = new World();

    world.registerComponent(Body);

    // Create entities BEFORE query
    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Body, { width: 30, height: 40 });

    // Create query AFTER entities
    const query = world.createQuery("afterEntities", { all: [Body] });

    // Query should find existing entities
    expect(query.execute().size).toBe(2);
  });

  it("query created before entities receives them via candidacy notification", () => {
    const world = new World();

    world.registerComponent(Body);

    // Create query BEFORE entities
    const query = world.createQuery("beforeEntities", { all: [Body] });

    expect(query.execute().size).toBe(0);

    // Create entities AFTER query
    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Body, { width: 30, height: 40 });

    // Query should have received entities via notification
    expect(query.execute().size).toBe(2);
  });

  it("single component in 'all' vs 'any' behaves equivalently", () => {
    const world = new World();

    world.registerComponent(Body);
    world.registerComponent(Renderable);

    const entity1 = world.createEntity("entity1");
    entity1.addComponent(Body, { width: 10, height: 20 });

    const entity2 = world.createEntity("entity2");
    entity2.addComponent(Renderable);

    const entity3 = world.createEntity("entity3");

    const queryAll = world.createQuery("singleAll", { all: [Body] });
    const queryAny = world.createQuery("singleAny", { any: [Body] });

    // Both should match only entity1
    expect(queryAll.execute().size).toBe(1);
    expect(queryAny.execute().size).toBe(1);
    expect(queryAll.execute().has("entity1")).toBe(true);
    expect(queryAny.execute().has("entity1")).toBe(true);
  });
});
