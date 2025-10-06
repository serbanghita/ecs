/** This iw WIP, please ignore **/
import World from "./World.ts";
import Entity from "./Entity.ts";
import ComponentRegistry from "./ComponentRegistry.ts";
import { Attacking, Body, Idle, Keyboard, PositionOnScreen, Walking } from "./fixtures.ts";

const reg = ComponentRegistry.getInstance();
reg.registerComponent(Body);
reg.registerComponent(PositionOnScreen);
reg.registerComponent(Keyboard);

// reg.registerGroup("mutuallyExclusiveComponents", [Idle, Walking, Attacking], { mutuallyExclusive: true });

const world = new World();

const entity1 = world.createEntity("entity1");
entity1.addComponent(Body, { width: 10, height: 10 });
entity1.addComponent(PositionOnScreen, { x: 1, y: 2 });

const entity2 = world.createEntity("entity2");
entity2.addComponent(Keyboard, { up: "a", down: "b", left: "c", right: "d", action_1: "e" });
