import { World } from "../../src/World.ts";
import { Component } from "../../src/Component.ts";
class A extends Component<{}> {} class B extends Component<{}> {} class C extends Component<{}> {}
const w = new World(); w.registerComponents([A, B, C]);
for (let i = 0; i < 20; i++) w.createQuery("q" + i, { all: [A], none: [i % 2 ? B : C] });
const ents = Array.from({ length: 1000 }, (_, i) => w.createEntity("e" + i));
function bench(name: string, fn: () => void) {
  for (let i = 0; i < 20; i++) fn();
  const t = performance.now(); const N = 200; for (let i = 0; i < N; i++) fn();
  console.log(name, ((performance.now() - t) / N).toFixed(3), "ms/iter");
}
bench("add+remove 1000 entities x3 comps, 20 queries", () => { for (const e of ents) { e.addComponent(A).addComponent(B).addComponent(C); e.removeComponent(A).removeComponent(B).removeComponent(C); } });
let hits = 0;
bench("hasComponent 1000 x3", () => { for (const e of ents) { if (e.hasComponent(A)) hits++; if (e.hasComponent(B)) hits++; if (e.hasComponent(C)) hits++; } });
