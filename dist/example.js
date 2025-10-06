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
    // public createEntityFromDeclaration(id: string, entityDeclaration: EntityDeclaration): Entity {
    //   // Create the entity and assign it to the world.
    //   const entity = this.createEntity(id);
    //
    //   // Add Component(s) to the Entity.
    //   for (const name in entityDeclaration.components) {
    //     const componentDeclaration = this.declarations.components.getComponent(name);
    //     const props = entityDeclaration.components[name];
    //
    //     entity.addComponent(componentDeclaration, props);
    //   }
    //
    //   return entity;
    // }
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

  // src/fixtures.ts
  var Idle = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Idle");
    }
  };
  var Walking = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Walking");
    }
  };
  var Attacking = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Attacking");
    }
  };
  var PositionOnScreen = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "PositionOnScreen");
    }
    get x() {
      return this.properties.x;
    }
    get y() {
      return this.properties.y;
    }
    setXY(x, y) {
      this.properties.x = x;
      this.properties.y = y;
    }
  };
  var Body = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Body");
    }
    get width() {
      return this.properties.width;
    }
    get height() {
      return this.properties.height;
    }
  };
  var Keyboard = class extends Component {
    constructor(properties) {
      super(properties);
      this.properties = properties;
    }
    static {
      __name(this, "Keyboard");
    }
  };

  // src/example.ts
  var CollisionSystem = class extends System {
    static {
      __name(this, "CollisionSystem");
    }
    doSomeChecks(entity) {
      console.log(`Checking entity ${entity.id}`);
      return true;
    }
    update(now) {
      this.query.execute().forEach((entity) => {
        this.doSomeChecks(entity);
        return true;
      });
    }
  };
  var reg = ComponentRegistry.getInstance();
  reg.registerComponent(Body);
  reg.registerComponent(PositionOnScreen);
  reg.registerComponent(Keyboard);
  reg.registerComponent(Idle);
  reg.registerComponent(Walking);
  reg.registerComponent(Attacking);
  reg.registerComponentGroup("action", [Idle, Walking, Attacking], { mutuallyExclusive: true });
  var world = new World();
  var entityA = world.createEntity("entityA");
  entityA.addComponent(Body, { width: 10, height: 10 });
  entityA.addComponent(PositionOnScreen, { x: 1, y: 2 });
  var entityB = world.createEntity("entityB");
  entityA.addComponent(Body, { width: 20, height: 20 });
  entityB.addComponent(Keyboard, { up: "a", down: "b", left: "c", right: "d", action_1: "e" });
  entityA.addComponent(PositionOnScreen, { x: 5, y: 5 });
  var entityC = world.createEntity("entityC");
  var AllEntitiesWithPositionOnScreen = world.createQuery("give me all entities with a PositionOnScreen", { all: [PositionOnScreen] });
  world.createSystem(CollisionSystem, AllEntitiesWithPositionOnScreen, {});
  world.start();
})();
