(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@serbanghita-gamedev/bitmask/src/bitset.ts
  var bitset_exports = {};
  __export(bitset_exports, {
    capacity: () => capacity,
    clear: () => clear,
    clearBit: () => clearBit,
    clone: () => clone,
    create: () => create,
    equals: () => equals,
    flipBit: () => flipBit,
    fromIndices: () => fromIndices,
    hasAllBits: () => hasAllBits,
    hasAnyBits: () => hasAnyBits,
    isEmpty: () => isEmpty,
    setBit: () => setBit,
    testBit: () => testBit,
    toBinaryString: () => toBinaryString
  });
  var WORD_BITS = 32;
  function create(capacity2) {
    if (!Number.isInteger(capacity2) || capacity2 <= 0) {
      throw new RangeError(`Bitset capacity must be a positive integer, got ${capacity2}.`);
    }
    return new Uint32Array(Math.ceil(capacity2 / WORD_BITS));
  }
  __name(create, "create");
  function fromIndices(indices, capacity2) {
    const bitset = create(capacity2);
    for (const index of indices) {
      setBit(bitset, index);
    }
    return bitset;
  }
  __name(fromIndices, "fromIndices");
  function capacity(bitset) {
    return bitset.length * WORD_BITS;
  }
  __name(capacity, "capacity");
  function assertIndex(bitset, index) {
    if (index < 0 || index >= bitset.length * WORD_BITS || !Number.isInteger(index)) {
      throw new RangeError(`Bit index ${index} is out of range for a bitset of capacity ${bitset.length * WORD_BITS}.`);
    }
  }
  __name(assertIndex, "assertIndex");
  function setBit(bitset, index) {
    assertIndex(bitset, index);
    bitset[index >>> 5] |= 1 << (index & 31);
  }
  __name(setBit, "setBit");
  function clearBit(bitset, index) {
    assertIndex(bitset, index);
    bitset[index >>> 5] &= ~(1 << (index & 31));
  }
  __name(clearBit, "clearBit");
  function flipBit(bitset, index) {
    assertIndex(bitset, index);
    bitset[index >>> 5] ^= 1 << (index & 31);
  }
  __name(flipBit, "flipBit");
  function testBit(bitset, index) {
    if (index >>> 0 !== index) return false;
    const word = bitset[index >>> 5];
    return word !== void 0 && (word & 1 << (index & 31)) !== 0;
  }
  __name(testBit, "testBit");
  function hasAllBits(bitset, bits) {
    for (let i = 0; i < bits.length; i++) {
      if ((bitset[i] & bits[i]) !== (bits[i] | 0)) {
        return false;
      }
    }
    return true;
  }
  __name(hasAllBits, "hasAllBits");
  function hasAnyBits(bitset, bits) {
    for (let i = 0; i < bits.length; i++) {
      if ((bitset[i] & bits[i]) !== 0) {
        return true;
      }
    }
    return false;
  }
  __name(hasAnyBits, "hasAnyBits");
  function isEmpty(bitset) {
    for (let i = 0; i < bitset.length; i++) {
      if (bitset[i] !== 0) {
        return false;
      }
    }
    return true;
  }
  __name(isEmpty, "isEmpty");
  function equals(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  __name(equals, "equals");
  function clear(bitset) {
    bitset.fill(0);
  }
  __name(clear, "clear");
  function clone(bitset) {
    return bitset.slice();
  }
  __name(clone, "clone");
  function toBinaryString(bitset) {
    let result = "";
    for (let i = bitset.length - 1; i >= 0; i--) {
      result += bitset[i].toString(2).padStart(WORD_BITS, "0");
    }
    return result;
  }
  __name(toBinaryString, "toBinaryString");

  // src/frameGuard.ts
  var framesInProgress = 0;
  function enterFrame() {
    framesInProgress++;
  }
  __name(enterFrame, "enterFrame");
  function exitFrame() {
    if (framesInProgress > 0) {
      framesInProgress--;
    }
  }
  __name(exitFrame, "exitFrame");
  function isFrameRunning() {
    return framesInProgress > 0;
  }
  __name(isFrameRunning, "isFrameRunning");

  // src/ComponentRegistry.ts
  var WORD_BITS2 = 32;
  function bitIndexOf(componentDeclaration) {
    return ComponentRegistry.getInstance().indexOf(componentDeclaration);
  }
  __name(bitIndexOf, "bitIndexOf");
  var ComponentRegistry = class _ComponentRegistry {
    static {
      __name(this, "ComponentRegistry");
    }
    static instance;
    nextBitIndex = 0;
    _generation = 0;
    bitIndexByConstructor = /* @__PURE__ */ new Map();
    components = /* @__PURE__ */ new Map();
    componentGroups = /* @__PURE__ */ new Map();
    componentToGroupMap = /* @__PURE__ */ new Map();
    bitIndexToComponentMap = /* @__PURE__ */ new Map();
    constructor() {
    }
    static getInstance() {
      if (!_ComponentRegistry.instance) {
        _ComponentRegistry.instance = new _ComponentRegistry();
      }
      return _ComponentRegistry.instance;
    }
    /**
     * Incremented by `reset()`. A `World` records the generation it was created
     * in and refuses to work once the registry has been reset underneath it.
     */
    get generation() {
      return this._generation;
    }
    indexOf(componentDeclaration) {
      return this.bitIndexByConstructor.get(componentDeclaration);
    }
    /**
     * Assigns a bit index to a component class. Registering the same class again
     * is a no-op that keeps its existing index. Two distinct classes sharing a
     * name are rejected because entities store components by name.
     */
    registerComponent(componentDeclaration) {
      const declaration = componentDeclaration;
      if (typeof declaration !== "function" || !("bitIndex" in Object(declaration.prototype))) {
        throw new Error("Only classes extending Component can be registered.");
      }
      if (declaration.name === "") {
        throw new Error("Component classes must have a non-empty name.");
      }
      if (this.bitIndexByConstructor.has(declaration)) {
        return componentDeclaration;
      }
      const name = declaration.name;
      const sameName = this.components.get(name);
      if (sameName && sameName !== declaration) {
        throw new Error(`A different component class named "${name}" is already registered.`);
      }
      const bitIndex = this.nextBitIndex++;
      this.bitIndexByConstructor.set(declaration, bitIndex);
      this.bitIndexToComponentMap.set(bitIndex, declaration);
      this.components.set(name, declaration);
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
    getComponentByBitIndex(bitIndex) {
      return this.bitIndexToComponentMap.get(bitIndex);
    }
    registerComponentGroup(groupName, components, options = {}) {
      const bitIndices = components.map((component) => {
        const bitIndex = this.indexOf(component);
        if (typeof bitIndex === "undefined") {
          throw new Error(`Please register the component ${component.name} in the ComponentRegistry before adding it to the group "${groupName}".`);
        }
        return bitIndex;
      });
      const existing = this.componentGroups.get(groupName);
      if (existing) {
        const sameMembers = existing.components.length === components.length && existing.components.every((member, i) => member === components[i]);
        const sameOptions = Boolean(existing.options.mutuallyExclusive) === Boolean(options.mutuallyExclusive);
        if (sameMembers && sameOptions) {
          return;
        }
        throw new Error(`A component group named "${groupName}" is already registered with different members.`);
      }
      bitIndices.forEach((bitIndex, i) => {
        const otherGroup = this.componentToGroupMap.get(bitIndex);
        if (otherGroup !== void 0) {
          throw new Error(`Component ${components[i].name} already belongs to the group "${otherGroup}".`);
        }
      });
      const groupBitset = this.createBitset();
      for (const bitIndex of bitIndices) {
        bitset_exports.setBit(groupBitset, bitIndex);
        this.componentToGroupMap.set(bitIndex, groupName);
      }
      this.componentGroups.set(groupName, { components, bitset: groupBitset, options });
    }
    getComponentGroup(groupName) {
      return this.componentGroups.get(groupName);
    }
    getComponentGroupName(bitIndex) {
      return this.componentToGroupMap.get(bitIndex);
    }
    getComponentCount() {
      return this.nextBitIndex;
    }
    /**
     * Number of bits a freshly created bitset holds: enough for every registered
     * component, rounded up to a whole 32-bit word, never less than one word.
     */
    getBitsetCapacity() {
      return Math.max(WORD_BITS2, Math.ceil(this.nextBitIndex / WORD_BITS2) * WORD_BITS2);
    }
    createBitset() {
      return bitset_exports.create(this.getBitsetCapacity());
    }
    /**
     * Forgets every registration and advances the generation. Classes registered
     * before the reset lose their bit index, and worlds created before the reset
     * throw on their next entity or query operation.
     */
    reset() {
      if (isFrameRunning()) {
        throw new Error("reset() was called while a World frame is running; defer it with queueMicrotask.");
      }
      this.nextBitIndex = 0;
      this._generation++;
      this.bitIndexByConstructor.clear();
      this.components.clear();
      this.componentGroups.clear();
      this.componentToGroupMap.clear();
      this.bitIndexToComponentMap.clear();
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
  Object.defineProperty(Component.prototype, "bitIndex", {
    get() {
      return bitIndexOf(this.constructor);
    },
    enumerable: false,
    configurable: false
  });

  // src/Entity.ts
  var Entity = class {
    constructor(world, id) {
      this.world = world;
      this.id = id;
      world.assertRegistryIsCurrent();
      this.componentsBitset = world.declarations.components.createBitset();
    }
    static {
      __name(this, "Entity");
    }
    componentsBitset;
    components = /* @__PURE__ */ new Map();
    addComponent(componentDeclaration, ...args) {
      this.world.assertRegistryIsCurrent();
      const bitIndex = bitIndexOf(componentDeclaration);
      if (typeof bitIndex === "undefined") {
        throw new Error(`Please register the component ${componentDeclaration.name} in the ComponentRegistry.`);
      }
      const properties = args[0] ?? {};
      let instance = this.components.get(componentDeclaration.name);
      if (instance && instance.constructor === componentDeclaration) {
        instance.init(properties);
      } else {
        instance = new componentDeclaration(properties);
      }
      if (Object.prototype.hasOwnProperty.call(instance, "bitIndex")) {
        throw new Error(`Component ${componentDeclaration.name} must not declare its own "bitIndex" field; it is assigned by the ComponentRegistry.`);
      }
      const componentRegistry = this.world.declarations.components;
      const groupName = componentRegistry.getComponentGroupName(bitIndex);
      if (groupName) {
        const group = componentRegistry.getComponentGroup(groupName);
        if (group && group.options.mutuallyExclusive && bitset_exports.hasAnyBits(this.componentsBitset, group.bitset)) {
          for (const groupComponent of group.components) {
            if (groupComponent !== componentDeclaration && this.hasComponent(groupComponent)) {
              this.removeComponent(groupComponent);
            }
          }
        }
      }
      this.components.set(componentDeclaration.name, instance);
      this.ensureBitsetCapacity(bitIndex);
      bitset_exports.setBit(this.componentsBitset, bitIndex);
      this.onAddComponent(instance);
      return this;
    }
    getComponent(declaration) {
      const instance = this.components.get(declaration.name);
      if (!instance || instance.constructor !== declaration) {
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
      this.world.assertRegistryIsCurrent();
      if (!this.hasComponent(componentDeclaration)) {
        return this;
      }
      const component = this.getComponent(componentDeclaration);
      const bitIndex = bitIndexOf(componentDeclaration);
      bitset_exports.clearBit(this.componentsBitset, bitIndex);
      this.components.delete(componentDeclaration.name);
      this.onRemoveComponent(component);
      return this;
    }
    hasComponent(componentDeclaration) {
      this.world.assertRegistryIsCurrent();
      const bitIndex = bitIndexOf(componentDeclaration);
      if (typeof bitIndex === "undefined") {
        throw new Error(`Please register the component ${componentDeclaration.name} in the ComponentRegistry.`);
      }
      return bitset_exports.testBit(this.componentsBitset, bitIndex);
    }
    /**
     * Components registered after this entity was created may not fit in its
     * bitset. Grow it to the registry's current capacity when that happens.
     */
    ensureBitsetCapacity(bitIndex) {
      if (bitIndex < bitset_exports.capacity(this.componentsBitset)) {
        return;
      }
      const required = ((bitIndex >>> 5) + 1) * 32;
      const grown = bitset_exports.create(Math.max(required, this.world.declarations.components.getBitsetCapacity()));
      grown.set(this.componentsBitset);
      this.componentsBitset = grown;
    }
    onAddComponent(newComponent) {
      this.world.notifyQueriesOfEntityComponentAddition(this, newComponent);
      return this;
    }
    onRemoveComponent(oldComponent) {
      this.world.notifyQueriesOfEntityComponentRemoval(this, oldComponent);
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
    constructor(world, id, filters) {
      this.world = world;
      this.id = id;
      this.filters = filters;
      world.assertRegistryIsCurrent();
      const registry = world.declarations.components;
      this.all = registry.createBitset();
      this.any = registry.createBitset();
      this.none = registry.createBitset();
      this.checkIfComponentsAreRegistered();
      this.processFiltersAsBitsets();
    }
    static {
      __name(this, "Query");
    }
    all;
    any;
    none;
    dataSet = /* @__PURE__ */ new Map();
    hasAll = false;
    hasAny = false;
    hasNone = false;
    checkIfComponentsAreRegistered() {
      [
        ...new Set(
          Object.values(this.filters).reduce((acc, value) => {
            return acc.concat(value);
          }, [])
        )
      ].forEach((component) => {
        if (typeof bitIndexOf(component) === "undefined") {
          throw new Error(`Please register the component ${component.name} in the ComponentRegistry.`);
        }
      });
    }
    processFiltersAsBitsets() {
      if (this.filters.all) {
        this.filters.all.forEach((component) => {
          bitset_exports.setBit(this.all, bitIndexOf(component));
        });
        this.hasAll = !bitset_exports.isEmpty(this.all);
      }
      if (this.filters.any) {
        this.filters.any.forEach((component) => {
          bitset_exports.setBit(this.any, bitIndexOf(component));
        });
        this.hasAny = !bitset_exports.isEmpty(this.any);
      }
      if (this.filters.none) {
        this.filters.none.forEach((component) => {
          bitset_exports.setBit(this.none, bitIndexOf(component));
        });
        this.hasNone = !bitset_exports.isEmpty(this.none);
      }
    }
    init() {
      this.world.entities.forEach((entity) => {
        this.candidate(entity);
      });
    }
    /**
     * Returns the entities that correspond to the filters given.
     * The set is maintained reactively via World notifications.
     */
    execute() {
      return this.dataSet;
    }
    hasSameFilters(other) {
      return bitset_exports.equals(this.all, other.all) && bitset_exports.equals(this.any, other.any) && bitset_exports.equals(this.none, other.none);
    }
    match(entity) {
      if (this.hasNone && bitset_exports.hasAnyBits(entity.componentsBitset, this.none)) {
        return false;
      }
      if (this.hasAll && !bitset_exports.hasAllBits(entity.componentsBitset, this.all)) {
        return false;
      }
      if (this.hasAny && !bitset_exports.hasAnyBits(entity.componentsBitset, this.any)) {
        return false;
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

  // src/System.ts
  var System = class {
    constructor(world, query, ..._args) {
      this.world = world;
      this.query = query;
      this.ticks = 0;
    }
    static {
      __name(this, "System");
    }
    settings = { ticksToRunBeforeExit: -1, runEveryTicks: 0 };
    ticks = 0;
    // Number of times update() has actually run (drives settings.ticksToRunBeforeExit).
    updatesRun = 0;
    // User-facing pause flag; never mutated by the engine.
    isPaused = false;
    runEveryTicks(ticks) {
      this.settings.runEveryTicks = ticks;
    }
    runOnlyOnce() {
      this.settings.ticksToRunBeforeExit = 1;
      return this;
    }
    // Returns true if update() should run on this tick (settings.runEveryTicks cadence).
    preUpdate() {
      this.ticks++;
      if (this.settings.runEveryTicks > 0) {
        if (this.ticks < this.settings.runEveryTicks) {
          return false;
        }
        this.ticks = 0;
      }
      return true;
    }
    update(_now = 0) {
      throw new Error(`System update() must be implemented.`);
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
    registryGeneration = this.declarations.components.generation;
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
    _animationFrameId = 0;
    _paused = false;
    // Shortcut to ComponentRegistry
    registerComponent(componentDeclaration) {
      this.declarations.components.registerComponent(componentDeclaration);
    }
    // Shortcut to ComponentRegistry
    registerComponents(componentDeclarations) {
      this.declarations.components.registerComponents(componentDeclarations);
    }
    /**
     * Entities and queries store bit indices handed out by the registry. Once the
     * registry has been reset those indices may alias other components, so a
     * world from an earlier generation must not be used any further.
     */
    assertRegistryIsCurrent() {
      if (this.registryGeneration !== this.declarations.components.generation) {
        throw new Error("The ComponentRegistry was reset after this World was created. Create a new World.");
      }
    }
    createQuery(id, filters) {
      const query = new Query(this, id, filters);
      const existing = this.queries.get(id);
      if (existing) {
        if (existing.hasSameFilters(query)) {
          return existing;
        }
        throw new Error(`A query with the id "${id}" already exists with different filters.`);
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
      const systemInstance = this.systems.get(system);
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
     * 3. Remove Entity from Queries that have the Component in their 'none' filter.
     *
     * @param entity
     * @param component
     */
    notifyQueriesOfEntityComponentAddition(entity, component) {
      const bitIndex = bitIndexOf(component.constructor);
      this.queries.forEach((query) => {
        if (bitset_exports.testBit(query.none, bitIndex)) {
          query.remove(entity);
          return;
        }
        if (bitset_exports.testBit(query.all, bitIndex) || bitset_exports.testBit(query.any, bitIndex)) {
          query.candidate(entity);
        }
      });
    }
    /**
     * 1. Finds all Queries that have the Component in their filter.
     * 2. Remove the Entity from the list of Entities inside the Query.
     * 3. Re-evaluate Entity candidacy for Queries that have the Component in their 'none' filter.
     *
     * @param entity
     * @param component
     */
    notifyQueriesOfEntityComponentRemoval(entity, component) {
      const bitIndex = bitIndexOf(component.constructor);
      this.queries.forEach((query) => {
        if (bitset_exports.testBit(query.all, bitIndex)) {
          query.remove(entity);
          return;
        }
        if (bitset_exports.testBit(query.any, bitIndex)) {
          query.remove(entity);
          query.candidate(entity);
          return;
        }
        if (bitset_exports.testBit(query.none, bitIndex)) {
          query.candidate(entity);
        }
      });
    }
    start(options) {
      this.assertRegistryIsCurrent();
      if (options) {
        this.fpsCap = options.fpsCap || 0;
        if (options.callbackFnAfterSystemsUpdate) {
          this.callbackFnAfterSystemsUpdate = options.callbackFnAfterSystemsUpdate;
        }
      }
      enterFrame();
      try {
        [...this.systems].filter(([, systemInstance]) => systemInstance.settings.ticksToRunBeforeExit === 1).forEach(([systemDeclaration, systemInstance]) => {
          systemInstance.update();
          this.systems.delete(systemDeclaration);
        });
      } finally {
        exitFrame();
      }
      this.startLoop();
    }
    startLoop() {
      let frameTimeDiff = 0;
      let lastFrameTime = -1;
      let fps = 0;
      let frames = 0;
      let lastFpsTime = -1;
      const fpsCap = this.fpsCap;
      const fpsCapDurationTime = fpsCap > 0 ? 1e3 / fpsCap : 0;
      const FPS_CAP_TOLERANCE = 1;
      let fpsCapAccumulator = 0;
      let fpsCapLastFrameTime = -1;
      const loop = /* @__PURE__ */ __name((now) => {
        this.now = now;
        if (this._paused) {
          lastFrameTime = -1;
          lastFpsTime = -1;
          fpsCapAccumulator = 0;
          fpsCapLastFrameTime = -1;
          frames = 0;
          this._animationFrameId = requestAnimationFrame(loop);
          return;
        }
        if (fpsCap > 0) {
          if (fpsCapLastFrameTime !== -1) {
            fpsCapAccumulator += now - fpsCapLastFrameTime;
          }
          fpsCapLastFrameTime = now;
          if (fpsCapAccumulator < fpsCapDurationTime - FPS_CAP_TOLERANCE) {
            this._animationFrameId = requestAnimationFrame(loop);
            return;
          }
          fpsCapAccumulator -= fpsCapDurationTime;
          if (fpsCapAccumulator > fpsCapDurationTime) fpsCapAccumulator = 0;
        }
        frames++;
        this.frameNo++;
        if (lastFrameTime === -1) {
          lastFrameTime = now;
        }
        frameTimeDiff = now - lastFrameTime;
        lastFrameTime = now;
        if (lastFpsTime === -1) {
          lastFpsTime = now;
        }
        if (now - lastFpsTime >= 1e3) {
          fps = frames;
          frames = 0;
          lastFpsTime = now;
        }
        this.fps = fps;
        this.frameDuration = frameTimeDiff;
        enterFrame();
        try {
          this.systems.forEach((system, systemDeclaration) => {
            if (system.isPaused || !system.preUpdate()) {
              return;
            }
            system.update(now);
            if (system.settings.ticksToRunBeforeExit > 0 && ++system.updatesRun >= system.settings.ticksToRunBeforeExit) {
              this.systems.delete(systemDeclaration);
            }
          });
          if (this.callbackFnAfterSystemsUpdate) {
            this.callbackFnAfterSystemsUpdate();
          }
        } finally {
          exitFrame();
        }
        this._animationFrameId = requestAnimationFrame(loop);
      }, "loop");
      this._animationFrameId = requestAnimationFrame(loop);
    }
    pause() {
      this._paused = true;
    }
    resume() {
      this._paused = false;
    }
    stop() {
      if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = 0;
      }
    }
    clear() {
      this.stop();
      this.entities.clear();
      this.queries.clear();
      this.systems.clear();
      this.callbackFnAfterSystemsUpdate = void 0;
    }
  };
})();
