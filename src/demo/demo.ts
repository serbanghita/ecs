import World from "../World.ts";
import Entity from "../Entity.ts";
import Component from "../Component.ts";
import ComponentRegistry from "../ComponentRegistry.ts";
import System from "../System.ts";

// ============================================================================
// COMPONENTS
// ============================================================================

type PositionProps = { x: number; y: number };
class Position extends Component<PositionProps> {
  constructor(public properties: PositionProps) {
    super(properties);
  }
}

type VelocityProps = { vx: number; vy: number };
class Velocity extends Component<VelocityProps> {
  constructor(public properties: VelocityProps) {
    super(properties);
  }
}

type SizeProps = { width: number; height: number };
class Size extends Component<SizeProps> {
  constructor(public properties: SizeProps) {
    super(properties);
  }
}

type ColorProps = { r: number; g: number; b: number };
class Color extends Component<ColorProps> {
  constructor(public properties: ColorProps) {
    super(properties);
  }
}

type LifetimeProps = { remaining: number };
class Lifetime extends Component<LifetimeProps> {
  constructor(public properties: LifetimeProps) {
    super(properties);
  }
}

// Optional components for variety
class Spinning extends Component<{ speed: number }> {
  constructor(public properties: { speed: number }) {
    super(properties);
  }
}

class Pulsing extends Component<{ speed: number; min: number; max: number }> {
  constructor(public properties: { speed: number; min: number; max: number }) {
    super(properties);
  }
}

// ============================================================================
// SETUP
// ============================================================================

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_ENTITIES = 1000;
const SPAWN_RATE = 5; // entities per second
const MIN_LIFETIME = 3000; // ms
const MAX_LIFETIME = 80000; // ms

// Create canvas
const canvas = document.createElement("canvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.border = "1px solid #333";
canvas.style.background = "#111";
document.body.style.margin = "0";
document.body.style.padding = "20px";
document.body.style.background = "#000";
document.body.style.fontFamily = "monospace";
document.body.style.color = "#fff";

// Stats display
const statsDiv = document.createElement("div");
statsDiv.style.marginBottom = "10px";
statsDiv.style.fontSize = "14px";
document.body.appendChild(statsDiv);
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;

// Register components
const reg = ComponentRegistry.getInstance();
reg.registerComponent(Position);
reg.registerComponent(Velocity);
reg.registerComponent(Size);
reg.registerComponent(Color);
reg.registerComponent(Lifetime);
reg.registerComponent(Spinning);
reg.registerComponent(Pulsing);

// Create world
const world = new World();

// ============================================================================
// SYSTEMS
// ============================================================================

class MovementSystem extends System {
  public update(now: number): void {
    this.query.execute().forEach((entity) => {
      if (!entity.hasComponent(Position) || !entity.hasComponent(Velocity)) return;

      const pos = entity.getComponent(Position);
      const vel = entity.getComponent(Velocity);

      pos.properties.x += vel.properties.vx;
      pos.properties.y += vel.properties.vy;

      // Bounce off walls
      let w = 10;
      let h = 10;
      if (entity.hasComponent(Size)) {
        const size = entity.getComponent(Size);
        w = size.properties.width;
        h = size.properties.height;
      }

      if (pos.properties.x <= 0 || pos.properties.x + w >= CANVAS_WIDTH) {
        vel.properties.vx *= -1;
        pos.properties.x = Math.max(0, Math.min(pos.properties.x, CANVAS_WIDTH - w));
      }
      if (pos.properties.y <= 0 || pos.properties.y + h >= CANVAS_HEIGHT) {
        vel.properties.vy *= -1;
        pos.properties.y = Math.max(0, Math.min(pos.properties.y, CANVAS_HEIGHT - h));
      }
    });
  }
}

class LifetimeSystem extends System {
  private entitiesToRemove: string[] = [];

  public update(): void {
    this.entitiesToRemove = [];

    this.query.execute().forEach((entity) => {
      if (!entity.hasComponent(Lifetime)) return;

      const lifetime = entity.getComponent(Lifetime);
      lifetime.properties.remaining -= world.frameDuration;
      if (lifetime.properties.remaining <= 0) {
        this.entitiesToRemove.push(entity.id);
      }
    });

    // Remove dead entities
    this.entitiesToRemove.forEach((id) => world.removeEntity(id));
  }
}

class RenderSystem extends System {
  public update(now: number): void {
    // Clear canvas
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.query.execute().forEach((entity) => {
      if (!entity.hasComponent(Position) || !entity.hasComponent(Size) || !entity.hasComponent(Color)) return;

      const pos = entity.getComponent(Position);
      const size = entity.getComponent(Size);
      const color = entity.getComponent(Color);

      const { x, y } = pos.properties;
      let { width, height } = size.properties;
      const { r, g, b } = color.properties;

      // Apply pulsing effect
      if (entity.hasComponent(Pulsing)) {
        const pulsing = entity.getComponent(Pulsing);
        const t = (now * pulsing.properties.speed) % (Math.PI * 2);
        const scale = pulsing.properties.min + (pulsing.properties.max - pulsing.properties.min) * (0.5 + 0.5 * Math.sin(t));
        width *= scale;
        height *= scale;
      }

      ctx.save();

      // Apply spinning effect
      if (entity.hasComponent(Spinning)) {
        const spinning = entity.getComponent(Spinning);
        const angle = (now * spinning.properties.speed) % (Math.PI * 2);
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(angle);
        ctx.translate(-(x + width / 2), -(y + height / 2));
      }

      // Fade based on lifetime
      let alpha = 1;
      if (entity.hasComponent(Lifetime)) {
        const lifetime = entity.getComponent(Lifetime);
        if (lifetime.properties.remaining < 1000) {
          alpha = lifetime.properties.remaining / 1000;
        }
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(x, y, width, height);

      ctx.restore();
    });
  }
}

// ============================================================================
// QUERIES
// ============================================================================

const movableQuery = world.createQuery("movable", { all: [Position, Velocity] });
const renderableQuery = world.createQuery("renderable", { all: [Position, Size, Color] });
const mortalQuery = world.createQuery("mortal", { all: [Lifetime] });

// ============================================================================
// CREATE SYSTEMS
// ============================================================================

world.createSystem(MovementSystem, movableQuery, {});
world.createSystem(LifetimeSystem, mortalQuery, {});
world.createSystem(RenderSystem, renderableQuery, {});

// ============================================================================
// ENTITY SPAWNING
// ============================================================================

let entityCounter = 0;
let lastSpawnTime = 0;
const spawnInterval = 1000 / SPAWN_RATE;

function countComponents(): number {
  let count = 0;
  world.entities.forEach((entity) => {
    count += entity.components.size;
  });
  return count;
}

function spawnEntity() {
  if (world.entities.size >= MAX_ENTITIES) return;

  const id = `entity_${entityCounter++}`;
  const entity = world.createEntity(id);

  // Random position
  const x = Math.random() * (CANVAS_WIDTH - 50);
  const y = Math.random() * (CANVAS_HEIGHT - 50);
  entity.addComponent(Position, { x, y });

  // Random velocity
  const speed = 1 + Math.random() * 3;
  const angle = Math.random() * Math.PI * 2;
  entity.addComponent(Velocity, {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  });

  // Random size
  const size = 10 + Math.random() * 30;
  entity.addComponent(Size, { width: size, height: size });

  // Random color
  entity.addComponent(Color, {
    r: Math.floor(50 + Math.random() * 205),
    g: Math.floor(50 + Math.random() * 205),
    b: Math.floor(50 + Math.random() * 205),
  });

  // Random lifetime
  const lifetime = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
  entity.addComponent(Lifetime, { remaining: lifetime });

  // Randomly add optional components
  if (Math.random() > 0.7) {
    entity.addComponent(Spinning, { speed: 0.001 + Math.random() * 0.005 });
  }
  if (Math.random() > 0.7) {
    entity.addComponent(Pulsing, { speed: 0.002 + Math.random() * 0.005, min: 0.8, max: 1.2 });
  }
}

// Spawn initial entities
for (let i = 0; i < MAX_ENTITIES / 2; i++) {
  spawnEntity();
}

// ============================================================================
// MAIN LOOP CALLBACK
// ============================================================================

world.start({
  callbackFnAfterSystemsUpdate: () => {
    // Spawn new entities over time
    if (world.now - lastSpawnTime > spawnInterval) {
      spawnEntity();
      lastSpawnTime = world.now;
    }

    // Update stats display
    const entityCount = world.entities.size;
    const componentCount = countComponents();
    const fps = world.fps;

    statsDiv.innerHTML = `
      <span style="color: #0f0">FPS: ${fps}</span> |
      <span style="color: #0af">Entities: ${entityCount}</span> |
      <span style="color: #fa0">Components: ${componentCount}</span> |
      <span style="color: #888">Frame: ${world.frameNo}</span>
    `;
  },
});
