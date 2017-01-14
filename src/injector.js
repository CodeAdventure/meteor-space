import _ from 'underscore';
import {
  isNil,
  entries as ObjectEntries,
  values as ObjectValues
} from 'lodash';
import SpaceError from './error.js';
import Space from './space.js';

const InjectionError = SpaceError.extend('Space.InjectionError');

class Injector {
  constructor(providers) {
    this._mappings = {};
    this._providers = providers || Injector.DEFAULT_PROVIDERS;
  }

  toString() {
    return 'Instance <Space.Injector>';
  }

  map(id, override) {
    if (isNil(id)) {
      throw new InjectionError(this.ERRORS.cannotMapUndefinedId());
    }
    const mapping = this._mappings[id];
    // Avoid accidential override of existing mapping
    if (!isNil(mapping) && !override) {
      throw new InjectionError(this.ERRORS.mappingExists(id));
    } else if (!isNil(mapping) && override) {
      mapping.markForOverride();
      return mapping;
    } else {
      this._mappings[id] = new Mapping(id, this._providers);
      return this._mappings[id];
    }
  }

  override(id) {
    return this.map(id, true);
  }

  remove(id) {
    delete this._mappings[id];
  }

  get(id, dependentObject = null) {
    if (isNil(id)) {
      throw new InjectionError(this.ERRORS.cannotGetValueForUndefined());
    }
    if (isNil(this._mappings[id])) {
      throw new InjectionError(this.ERRORS.noMappingFound(id));
    }
    const dependency = this._mappings[id].provide(dependentObject);
    this.injectInto(dependency);
    return dependency;
  }

  create(id) {
    return this.get(id);
  }

  injectInto(value) {
    if (!(_.isObject(value) && !value.__dependenciesInjected__)) {return;}

    if (!isNil(Object.defineProperty)) {
      // Flag this object as injected
      Object.defineProperty(value, '__dependenciesInjected__', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: true
      });
    } else {
      // Support old engines without Object.defineProperty
      value.__dependenciesInjected__ = true;
    }
    // Get flat map of dependencies (possibly inherited)
    const dependencies = this._mapDependencies(value);
    // Inject into dependencies to create the object graph
    for (let [key, id] of ObjectEntries(dependencies)) {
      try {
        if (isNil(value[key])) {value[key] = this.get(id, value);}
      } catch (error) {
        error.message += ` for {${key}: '${id}'} in <${value}>. Did you forget
                         to map it in your application?`;
        throw error;
      }
    }
    // Notify when dependencies are ready
    if (!isNil(value.onDependenciesReady)) {
      value.onDependenciesReady();
    }
  }

  addProvider(name, provider) {
    this._providers[name] = provider;
  }

  getMappingFor(id) {
    return this._mappings[id];
  }

  getIdForValue(value) {
    for (let [id, mapping] of ObjectEntries(this._mappings)) {
      if (mapping.getProvider().getValue() === value) {
        return id;
      }
    }
    return null;
  }

  release(dependent) {
    for (let mapping of ObjectValues(this._mappings)) {
      if (mapping.hasDependent(dependent)) {
        mapping.release(dependent);
      }
    }
  }

  _mapDependencies(value, deps = {}) {
    const Class = value.constructor || null;
    const SuperClass = Class.__super__ || null;
    // Recurse down the prototype chain
    if (!isNil(SuperClass)) {
      this._mapDependencies(SuperClass.constructor.prototype, deps);
    }
    if (isNil(value.dependencies)) {return deps;}
    // Add dependencies of current value
    for (let [key, id] of ObjectEntries(value.dependencies)) {
      deps[key] = id;
    }
    return deps;
  }

  _resolveValue(path) {
    return Space.resolvePath(path);
  }
}

Injector.prototype.ERRORS = {
  cannotMapUndefinedId() {
    return 'Cannot map <null> or <undefined>.';
  },
  mappingExists(id) {
    return `<${id}> would be overwritten. Use <Injector::override> for that.`;
  },
  noMappingFound(id) {
    return `No mapping found for <${id}>`;
  },
  cannotGetValueForUndefined() {
    return "Cannot get injection mapping for <undefined>.";
  }
};

// ========= PRIVATE CLASSES ==========

class Mapping {
  constructor(id, providers = {}) {
    this._id = id;
    this._provider = null;
    this._dependents = [];
    this._overrideInDependents = null;

    for (let [key, provider] of ObjectEntries(providers)) {
      this[key] = this._setup(provider);
    }
  }

  toString() {
    return 'Instance <Mapping>';
  }

  provide(dependent) {
    // Register depented objects for this mapping so that their
    // dependencies can overwritten later on.
    if (!isNil(dependent) && !this.hasDependent(dependent)) {
      this._dependents.push(dependent);
    }
    return this._provider.provide();
  }

  markForOverride() {
    this._overrideInDependents = true;
  }

  hasDependent(dependent) {
    return this.getIndexOfDependee(dependent) > -1;
  }

  getIndexOfDependee(dependent) {
    return this._dependents.indexOf(dependent);
  }

  release(dependent) {
    this._dependents.splice(this.getIndexOfDependee(dependent), 1);
  }

  getId() {
    return this._id;
  }

  getProvider() {
    return this._provider;
  }

  _setup(provider) {
    return ((value) => { // We are inside an API call like
      // injector.map('this').to('that')
      // Set the provider of this mapping to what the API user chose
      try {
        this._provider = new provider(this._id, value);
      } catch (error) {
        error.message += ` could not be found! Maybe you forgot to include a file
                         in package.js?`;
        throw error;
      }
      // Override the dependency in all dependent objects if this mapping is flagged
      if (this._overrideInDependents) {
        // Get the value from the provider
        const providersValue = this._provider.provide();
        // Loop over the dependents
        for (let dependent of ObjectValues(this._dependents)) {
          // Loop over their dependencies and override the one this mapping
          // is managing if it exists (it should)
          const dependencies = dependent.dependencies || {};
          for (let [key, id] of ObjectEntries(dependencies)) {
            if (id === this._id) {
              dependent[key] = providersValue;
              if (!isNil(dependent.onDependencyChanged)) {
                dependent.onDependencyChanged(key, value);
              }
            }
          }
        }
      }
      // Reset the flag to override dependencies
      this._overrideInDependents = false;
    });
  }
}

// ========= DEFAULT PROVIDERS ========

class Provider {
  constructor(id = null, value = null) {
    this._id = id;
    this._value = value;
  }

  getValue() {
    return this._value;
  }
}

class ValueProvider extends Provider {
  constructor(id, value) {
    super(id, value);
    if (isNil(this._value)) {
      if (_.isString(this._id)) {
        this._value = Space.resolvePath(this._id);
      } else {
        this._value = this._id;
      }
    }
  }

  toString() {
    return 'Instance <ValueProvider>';
  }

  provide() {
    return this._value;
  }
}

class InstanceProvider extends Provider {

  toString() {
    return 'Instance <InstanceProvider>';
  }

  provide() {
    return new this._value();
  }
}

class SingletonProvider extends Provider {
  constructor(id, value) {
    super(id, value);
    this.singleton = null;
    if (isNil(this._value)) {
      this._value = this._id;
    }
    if (_.isString(this._value)) {
      this._value = Space.resolvePath(this._value);
    }
  }

  toString() {
    return 'Instance <SingletonProvider>';
  }

  provide() {
    if (isNil(this._singleton)) {
      this._singleton = new this._value();
    }
    return this._singleton;
  }
}

Injector.DEFAULT_PROVIDERS = {
  to: ValueProvider,
  toStaticValue: ValueProvider,
  asStaticValue: ValueProvider,
  toClass: InstanceProvider,
  toInstancesOf: InstanceProvider,
  asSingleton: SingletonProvider,
  toSingleton: SingletonProvider
};

export {
  InjectionError,
  Injector,
  Provider,
  ValueProvider,
  InstanceProvider,
  SingletonProvider
};
