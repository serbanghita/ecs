(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // node_modules/@serbanghita-gamedev/bitmask/src/bitmask.ts
  function addBit(bitmasks, bit) {
    bitmasks |= bit;
    return bitmasks;
  }
  __name(addBit, "addBit");
  function removeBit(bitmasks, bit) {
    bitmasks &= ~bit;
    return bitmasks;
  }
  __name(removeBit, "removeBit");
  function hasBit(bitmasks, bit) {
    return (bitmasks & bit) === bit;
  }
  __name(hasBit, "hasBit");
  function hasAnyOfBits(bitmask, bits) {
    return (bitmask & bits) !== 0n;
  }
  __name(hasAnyOfBits, "hasAnyOfBits");

  // src/Entity.ts
  var Entity = class {
    constructor(world2, id) {
      this.world = world2;
      this.id = id;
    }
    static {
      __name(this, "Entity");
    }
    componentsBitmask = 0n;
    components = /* @__PURE__ */ new Map();
    addComponent(componentDeclaration, properties) {
      let instance = this.components.get(componentDeclaration.name);
      if (instance) {
        instance.init(properties);
      } else {
        instance = new componentDeclaration(properties);
      }
      if (typeof instance.bitmask === "undefined") {
        throw new Error(`Please register the component ${instance.constructor.name} in the ComponentRegistry.`);
      }
      const componentRegistry = this.world.declarations.components;
      const groupName = componentRegistry.getComponentGroupName(instance.bitmask);
      if (groupName) {
        const group = componentRegistry.getComponentGroup(groupName);
        if (group && group.options.mutuallyExclusive) {
          const conflictingBitmask = this.componentsBitmask & group.bitmask;
          if (conflictingBitmask !== 0n) {
            const conflictingComponent = componentRegistry.getComponentByBitmask(conflictingBitmask);
            if (conflictingComponent) {
              this.removeComponent(conflictingComponent);
            }
          }
        }
      }
      this.components.set(componentDeclaration.name, instance);
      this.componentsBitmask = addBit(this.componentsBitmask, instance.bitmask);
      this.onAddComponent(instance);
      return this;
    }
    getComponent(declaration) {
      const instance = this.components.get(declaration.name);
      if (!instance) {
        throw new Error(`Component requested ${declaration.name} is non-existent.`);
      }
      return instance;
    }
    getComponentByName(name) {
      const instance = this.components.get(name);
      if (!instance) {
        throw new Error(`Component requested ${name} is non-existent.`);
      }
      return instance;
    }
    removeComponent(componentDeclaration) {
      if (!this.hasComponent(componentDeclaration)) {
        return this;
      }
      const component = this.getComponent(componentDeclaration);
      if (typeof component.bitmask === "undefined") {
        throw new Error(`Component ${componentDeclaration.name} has no bitmask.`);
      }
      this.componentsBitmask = removeBit(this.componentsBitmask, component.bitmask);
      this.components.delete(componentDeclaration.name);
      this.onRemoveComponent(component);
      return this;
    }
    hasComponent(componentDeclaration) {
      if (typeof componentDeclaration.prototype.bitmask === "undefined") {
        throw new Error(`Please register the component ${componentDeclaration.name} in the ComponentRegistry.`);
      }
      return hasBit(this.componentsBitmask, componentDeclaration.prototype.bitmask);
    }
    onAddComponent(newComponent) {
      this.world.notifyQueriesOfEntityComponentAddition(this, newComponent);
      return this;
    }
    onRemoveComponent(oldComponent) {
      this.world.notifyQueriesOfEntityComponentRemoval(this, oldComponent);
    }
  };

  // src/System.ts
  var System = class {
    constructor(world2, query, ...args) {
      this.world = world2;
      this.query = query;
      this.ticks = 0;
    }
    static {
      __name(this, "System");
    }
    settings = { ticksToRunBeforeExit: -1, runEveryTicks: 0 };
    ticks = 0;
    // If the update() logic should run or not.
    // This is typically used along with settings.runEveryTicks.
    isPaused = false;
    runEveryTicks(ticks) {
      this.settings.runEveryTicks = ticks;
    }
    runOnlyOnce() {
      this.settings.ticksToRunBeforeExit = 1;
      return this;
    }
    preUpdate() {
      this.ticks++;
      if (this.settings.runEveryTicks > 0) {
        if (this.ticks < this.settings.runEveryTicks) {
          this.isPaused = true;
        } else {
          this.ticks = 0;
          this.isPaused = false;
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(now = 0) {
      throw new Error(`System update() must be implemented.`);
    }
  };

  // src/Query.ts
  var Query = class {
    /**
     * Create a "query" of Entities that contain certain Components set.
     *
     * @param world
     * @param id
     * @param filters
     */
    constructor(world2, id, filters) {
      this.world = world2;
      this.id = id;
      this.filters = filters;
      this.checkIfComponentsAreRegistered();
      this.processFiltersAsBitMasks();
    }
    static {
      __name(this, "Query");
    }
    all = 0n;
    any = 0n;
    none = 0n;
    hasExecuted = false;
    dataSet = /* @__PURE__ */ new Map();
    checkIfComponentsAreRegistered() {
      [
        ...new Set(
          Object.values(this.filters).reduce((acc, value) => {
            return acc.concat(value);
          }, [])
        )
      ].forEach((component) => {
        if (typeof component.prototype.bitmask === "undefined") {
          throw new Error(`Please register the component ${component.name} in the ComponentRegistry.`);
        }
      });
    }
    processFiltersAsBitMasks() {
      if (this.filters.all) {
        this.filters.all.forEach((component) => {
          this.all = addBit(this.all, component.prototype.bitmask);
        });
      }
      if (this.filters.any) {
        this.filters.any.forEach((component) => {
          this.any = addBit(this.any, component.prototype.bitmask);
        });
      }
      if (this.filters.none) {
        this.filters.none.forEach((component) => {
          this.none = addBit(this.none, component.prototype.bitmask);
        });
      }
    }
    init() {
      this.world.entities.forEach((entity) => {
        this.candidate(entity);
      });
    }
    /**
     * Set only the entities that correspond to the filters given.
     */
    execute() {
      if (!this.hasExecuted) {
        this.dataSet = new Map([...this.dataSet].filter(([id, entity]) => this.match(entity)));
        this.hasExecuted = true;
      }
      return this.dataSet;
    }
    match(entity) {
      if (this.none !== 0n && hasAnyOfBits(entity.componentsBitmask, this.none)) {
        return false;
      }
      if (this.any !== 0n) {
        return hasAnyOfBits(entity.componentsBitmask, this.any);
      }
      if (this.all !== 0n) {
        return hasBit(entity.componentsBitmask, this.all);
      }
      return true;
    }
    candidate(entity) {
      if (this.match(entity)) {
        this.dataSet.set(entity.id, entity);
        return true;
      }
      return false;
    }
    add(entity) {
      this.dataSet.set(entity.id, entity);
    }
    remove(entity) {
      this.dataSet.delete(entity.id);
    }
  };

  // src/ComponentRegistry.ts
  var ComponentRegistry = class _ComponentRegistry {
    static {
      __name(this, "ComponentRegistry");
    }
    static instance;
    bitmask = 1n;
    components = /* @__PURE__ */ new Map();
    componentGroups = /* @__PURE__ */ new Map();
    componentToGroupMap = /* @__PURE__ */ new Map();
    bitmaskToComponentMap = /* @__PURE__ */ new Map();
    constructor() {
    }
    static getInstance() {
      if (!_ComponentRegistry.instance) {
        _ComponentRegistry.instance = new _ComponentRegistry();
      }
      return _ComponentRegistry.instance;
    }
    registerComponent(componentDeclaration) {
      if (componentDeclaration.prototype && typeof componentDeclaration.prototype === "object") {
        const newBitmask = this.bitmask <<= 1n;
        Object.defineProperty(componentDeclaration.prototype, "bitmask", {
          value: newBitmask,
          writable: true,
          configurable: true
        });
        this.bitmaskToComponentMap.set(newBitmask, componentDeclaration);
      }
      this.components.set(componentDeclaration.prototype.constructor.name, componentDeclaration);
      return componentDeclaration;
    }
    registerComponents(componentDeclarations) {
      componentDeclarations.forEach((declaration) => {
        this.registerComponent(declaration);
      });
    }
    getComponent(name) {
      const component = this.components.get(name);
      if (!component) {
        throw new Error(`Component requested ${name} is non-existent.`);
      }
      return component;
    }
    getComponentByBitmask(bitmask) {
      return this.bitmaskToComponentMap.get(bitmask);
    }
    registerComponentGroup(groupName, components, options = {}) {
      let groupBitmask = 0n;
      for (const component of components) {
        groupBitmask = addBit(groupBitmask, component.prototype.bitmask);
        this.componentToGroupMap.set(component.prototype.bitmask, groupName);
      }
      this.componentGroups.set(groupName, { components, bitmask: groupBitmask, options });
    }
    getComponentGroup(groupName) {
      return this.componentGroups.get(groupName);
    }
    getComponentGroupName(componentBitmask) {
      return this.componentToGroupMap.get(componentBitmask);
    }
    getLastBitmask() {
      return this.bitmask;
    }
    reset() {
      _ComponentRegistry.instance = new _ComponentRegistry();
    }
  };

  // src/World.ts
  var World = class {
    static {
      __name(this, "World");
    }
    declarations = {
      components: ComponentRegistry.getInstance()
    };
    queries = /* @__PURE__ */ new Map();
    entities = /* @__PURE__ */ new Map();
    systems = /* @__PURE__ */ new Map();
    fps = 0;
    frameDuration = 0;
    frameNo = 0;
    fpsCap = 0;
    fpsCapDuration = 0;
    callbackFnAfterSystemsUpdate = void 0;
    now = 0;
    // Shortcut to ComponentRegistry
    registerComponent(componentDeclaration) {
      this.declarations.components.registerComponent(componentDeclaration);
    }
    // Shortcut to ComponentRegistry
    registerComponents(componentDeclarations) {
      this.declarations.components.registerComponents(componentDeclarations);
    }
    createQuery(id, filters) {
      const query = new Query(this, id, filters);
      if (this.queries.has(query.id)) {
        throw new Error(`A query with the id "${query.id}" already exists.`);
      }
      this.queries.set(query.id, query);
      query.init();
      return query;
    }
    removeQuery(id) {
      this.queries.delete(id);
    }
    getQuery(id) {
      const query = this.queries.get(id);
      if (!query) {
        throw new Error(`There is not query registered with the id: ${id}.`);
      }
      return query;
    }
    createEntity(id) {
      if (this.entities.has(id)) {
        throw new Error(`Entity with the id "${id}" already exists.`);
      }
      const entity = new Entity(this, id);
      this.entities.set(entity.id, entity);
      this.notifyQueriesOfEntityCandidacy(entity);
      return entity;
    }
    getEntity(id) {
      return this.entities.get(id);
    }
    removeEntity(id) {
      const entity = this.entities.get(id);
      if (!entity) {
        return;
      }
      this.notifyQueriesOfEntityRemoval(entity);
      this.entities.delete(id);
    }
    createSystem(systemDeclaration, query, ...args) {
      const systemInstance = new systemDeclaration(this, query, ...args);
      this.systems.set(systemDeclaration, systemInstance);
      return systemInstance;
    }
    getSystem(system) {
      const systemInstance = this.systems.get(System);
      if (!systemInstance) {
        throw new Error(`There is no system instance with the id ${system.name}`);
      }
      return systemInstance;
    }
    removeSystem(system) {
      this.systems.delete(system);
    }
    notifyQueriesOfEntityCandidacy(entity) {
      this.queries.forEach((query) => {
        query.candidate(entity);
      });
    }
    notifyQueriesOfEntityRemoval(entity) {
      this.queries.forEach((query) => {
        query.remove(entity);
      });
    }
    /**
     * 1. Finds all Queries that have the Component in their filter.
     * 2. Add candidacy of the Entity to the list of Entities inside the Query.
     *
     * @param entity
     * @param component
     */
    notifyQueriesOfEntityComponentAddition(entity, component) {
      this.queries.forEach((query) => {
        if (hasBit(query.all, component.bitmask)) {
          query.add(entity);
        }
      });
    }
    /**
     * 1. Finds all Queries that have the Component in their filter.
     * 2. Remove the Entity from the list of Entities inside the Query.
     *
     * @param entity
     * @param component
     */
    notifyQueriesOfEntityComponentRemoval(entity, component) {
      this.queries.forEach((query) => {
        if (hasBit(query.all, component.bitmask)) {
          query.remove(entity);
        }
      });
    }
    start(options) {
      if (options) {
        this.fpsCap = options.fpsCap || 0;
        if (options.callbackFnAfterSystemsUpdate) {
          this.callbackFnAfterSystemsUpdate = options.callbackFnAfterSystemsUpdate;
        }
      }
      [...this.systems].filter(([, systemInstance]) => systemInstance.settings.ticksToRunBeforeExit === 1).forEach(([systemDeclaration, systemInstance]) => {
        systemInstance.update();
        this.systems.delete(systemDeclaration);
      });
      this.startLoop();
    }
    startLoop() {
      let frameTimeDiff = 0;
      let lastFrameTime = 0;
      let fps = 0;
      let frames = 0;
      let lastFpsTime = 0;
      const fpsCap = this.fpsCap;
      const fpsCapDurationTime = this.fpsCapDuration = 1e3 / fpsCap;
      let fpsCapLastFrameTime = 0;
      let logicFrames = 0;
      const loop = /* @__PURE__ */ __name((now) => {
        this.now = now;
        frames++;
        if (lastFrameTime === 0) {
          lastFrameTime = now;
        }
        frameTimeDiff = now - lastFrameTime;
        lastFrameTime = now;
        if (fpsCapLastFrameTime === 0) {
          fpsCapLastFrameTime = now;
        }
        if (fpsCap > 0 && fps > fpsCap) {
          logicFrames++;
          if (now - fpsCapLastFrameTime >= fpsCapDurationTime) {
            fpsCapLastFrameTime = now;
            if (fps > 0) {
              this.systems.forEach((system) => system.update(now));
            }
            logicFrames = 0;
          }
        } else {
          if (fps > 0) {
            this.systems.forEach((system) => system.update(now));
          }
        }
        if (lastFpsTime === 0) {
          lastFpsTime = now;
        }
        if (now - lastFpsTime >= 1e3) {
          fps = frames;
          frames = 0;
          lastFpsTime = now;
        }
        this.fps = fps;
        this.frameDuration = frameTimeDiff;
        if (this.callbackFnAfterSystemsUpdate) {
          this.callbackFnAfterSystemsUpdate();
        }
        this.frameNo = frames;
        requestAnimationFrame(loop);
      }, "loop");
      requestAnimationFrame(loop);
    }
  };

  // src/Component.ts
  var Component = class {
    constructor(properties) {
      this.properties = properties;
    }
    static {
      __name(this, "Component");
    }
    // Lazy init / Re-init.
    init(properties) {
      this.properties = properties || {};
    }
    // Use this when saving the state.
    serialize() {
      return this.properties;
    }
  };

  // src/demo/demo.ts
  var Position = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Position");
    }
  };
  var Velocity = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Velocity");
    }
  };
  var Size = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Size");
    }
  };
  var Color = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Color");
    }
  };
  var Lifetime = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Lifetime");
    }
  };
  var Spinning = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Spinning");
    }
  };
  var Pulsing = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Pulsing");
    }
  };
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var MAX_ENTITIES = 100;
  var SPAWN_RATE = 5;
  var MIN_LIFETIME = 3e3;
  var MAX_LIFETIME = 8e3;
  var canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.border = "1px solid #333";
  canvas.style.background = "#111";
  document.body.style.margin = "0";
  document.body.style.padding = "20px";
  document.body.style.background = "#000";
  document.body.style.fontFamily = "monospace";
  document.body.style.color = "#fff";
  var statsDiv = document.createElement("div");
  statsDiv.style.marginBottom = "10px";
  statsDiv.style.fontSize = "14px";
  document.body.appendChild(statsDiv);
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var reg = ComponentRegistry.getInstance();
  reg.registerComponent(Position);
  reg.registerComponent(Velocity);
  reg.registerComponent(Size);
  reg.registerComponent(Color);
  reg.registerComponent(Lifetime);
  reg.registerComponent(Spinning);
  reg.registerComponent(Pulsing);
  var world = new World();
  var MovementSystem = class extends System {
    static {
      __name(this, "MovementSystem");
    }
    update(now) {
      this.query.execute().forEach((entity) => {
        if (!entity.hasComponent(Position) || !entity.hasComponent(Velocity)) return;
        const pos = entity.getComponent(Position);
        const vel = entity.getComponent(Velocity);
        pos.properties.x += vel.properties.vx;
        pos.properties.y += vel.properties.vy;
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
  };
  var LifetimeSystem = class extends System {
    static {
      __name(this, "LifetimeSystem");
    }
    entitiesToRemove = [];
    update() {
      this.entitiesToRemove = [];
      this.query.execute().forEach((entity) => {
        if (!entity.hasComponent(Lifetime)) return;
        const lifetime = entity.getComponent(Lifetime);
        lifetime.properties.remaining -= world.frameDuration;
        if (lifetime.properties.remaining <= 0) {
          this.entitiesToRemove.push(entity.id);
        }
      });
      this.entitiesToRemove.forEach((id) => world.removeEntity(id));
    }
  };
  var RenderSystem = class extends System {
    static {
      __name(this, "RenderSystem");
    }
    update(now) {
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
        if (entity.hasComponent(Pulsing)) {
          const pulsing = entity.getComponent(Pulsing);
          const t = now * pulsing.properties.speed % (Math.PI * 2);
          const scale = pulsing.properties.min + (pulsing.properties.max - pulsing.properties.min) * (0.5 + 0.5 * Math.sin(t));
          width *= scale;
          height *= scale;
        }
        ctx.save();
        if (entity.hasComponent(Spinning)) {
          const spinning = entity.getComponent(Spinning);
          const angle = now * spinning.properties.speed % (Math.PI * 2);
          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate(angle);
          ctx.translate(-(x + width / 2), -(y + height / 2));
        }
        let alpha = 1;
        if (entity.hasComponent(Lifetime)) {
          const lifetime = entity.getComponent(Lifetime);
          if (lifetime.properties.remaining < 1e3) {
            alpha = lifetime.properties.remaining / 1e3;
          }
        }
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(x, y, width, height);
        ctx.restore();
      });
    }
  };
  var movableQuery = world.createQuery("movable", { all: [Position, Velocity] });
  var renderableQuery = world.createQuery("renderable", { all: [Position, Size, Color] });
  var mortalQuery = world.createQuery("mortal", { all: [Lifetime] });
  world.createSystem(MovementSystem, movableQuery, {});
  world.createSystem(LifetimeSystem, mortalQuery, {});
  world.createSystem(RenderSystem, renderableQuery, {});
  var entityCounter = 0;
  var lastSpawnTime = 0;
  var spawnInterval = 1e3 / SPAWN_RATE;
  function countComponents() {
    let count = 0;
    world.entities.forEach((entity) => {
      count += entity.components.size;
    });
    return count;
  }
  __name(countComponents, "countComponents");
  function spawnEntity() {
    if (world.entities.size >= MAX_ENTITIES) return;
    const id = `entity_${entityCounter++}`;
    const entity = world.createEntity(id);
    const x = Math.random() * (CANVAS_WIDTH - 50);
    const y = Math.random() * (CANVAS_HEIGHT - 50);
    entity.addComponent(Position, { x, y });
    const speed = 1 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    entity.addComponent(Velocity, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    });
    const size = 10 + Math.random() * 30;
    entity.addComponent(Size, { width: size, height: size });
    entity.addComponent(Color, {
      r: Math.floor(50 + Math.random() * 205),
      g: Math.floor(50 + Math.random() * 205),
      b: Math.floor(50 + Math.random() * 205)
    });
    const lifetime = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
    entity.addComponent(Lifetime, { remaining: lifetime });
    if (Math.random() > 0.7) {
      entity.addComponent(Spinning, { speed: 1e-3 + Math.random() * 5e-3 });
    }
    if (Math.random() > 0.7) {
      entity.addComponent(Pulsing, { speed: 2e-3 + Math.random() * 5e-3, min: 0.8, max: 1.2 });
    }
  }
  __name(spawnEntity, "spawnEntity");
  for (let i = 0; i < MAX_ENTITIES / 2; i++) {
    spawnEntity();
  }
  world.start({
    callbackFnAfterSystemsUpdate: /* @__PURE__ */ __name(() => {
      if (world.now - lastSpawnTime > spawnInterval) {
        spawnEntity();
        lastSpawnTime = world.now;
      }
      const entityCount = world.entities.size;
      const componentCount = countComponents();
      const fps = world.fps;
      statsDiv.innerHTML = `
      <span style="color: #0f0">FPS: ${fps}</span> |
      <span style="color: #0af">Entities: ${entityCount}</span> |
      <span style="color: #fa0">Components: ${componentCount}</span> |
      <span style="color: #888">Frame: ${world.frameNo}</span>
    `;
    }, "callbackFnAfterSystemsUpdate")
  });
})();
//# sourceMappingURL=demo.js.map
