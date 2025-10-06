/** This iw WIP, please ignore **/
import World from "./World.ts";
import Entity from "./Entity.ts";
import ComponentRegistry from "./ComponentRegistry.ts";
import { Attacking, Body, Idle, Keyboard, PositionOnScreen, Walking } from "./fixtures.ts";
import System from "./System.ts";

class CollisionSystem extends System {
  private doSomeChecks(entity: Entity) {
    console.log(`Checking entity ${entity.id}`);
    return true;
  }
  public update(now: number): void {
    this.query.execute().forEach((entity) => {
      this.doSomeChecks(entity);
      return true;
    });
  }
}

/**
 * Components Registry is a singleton.
 */
const reg = ComponentRegistry.getInstance();

/**
 * You need to pre-register all Component's classes declarations in order
 * to allocate a unique bitmask to each of them.
 * This will help later in the Queries.
 */
reg.registerComponent(Body);
reg.registerComponent(PositionOnScreen);
reg.registerComponent(Keyboard);
reg.registerComponent(Idle);
reg.registerComponent(Walking);
reg.registerComponent(Attacking);

/**
 * Some Components can be part of common groups.
 * In this case, the group "action" contains mutually exclusive Components.
 * This means that when you add "Attacking" to an Entity, the "Idle" or "Walking" Components will be removed
 * as they cannot coexist. This is good for Finite State Machine like implementations.
 */
reg.registerComponentGroup("action", [Idle, Walking, Attacking], { mutuallyExclusive: true });

/**
 * The World class encapsulates helper methods and the loop.
 */
const world = new World();

/**
 * Create an entity.
 */
const entityA = world.createEntity("entityA");
/**
 * Attach components to EntityA.
 */
entityA.addComponent(Body, { width: 10, height: 10 });
entityA.addComponent(PositionOnScreen, { x: 1, y: 2 });

/**
 * Create another entity.
 */
const entityB = world.createEntity("entityB");
entityA.addComponent(Body, { width: 20, height: 20 });
entityB.addComponent(Keyboard, { up: "a", down: "b", left: "c", right: "d", action_1: "e" });
entityA.addComponent(PositionOnScreen, { x: 5, y: 5 });

/**
 * Create a dumb entity.
 */
const entityC = world.createEntity("entityC");

const AllEntitiesWithPositionOnScreen = world.createQuery("give me all entities with a PositionOnScreen", { all: [PositionOnScreen] });
world.createSystem(CollisionSystem, AllEntitiesWithPositionOnScreen, {});

world.start();
