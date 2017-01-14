import _ from 'underscore';
import Logger from './logger.js';
import {capitalize, isNil} from 'lodash';
import SpaceObject from './object.js';
require('./lib/underscore-deep-extend-mixin.js');

const Meteor = Meteor || undefined;
const Npm = Npm || undefined;

const Module = SpaceObject.extend('Space.Module',  {

  ERRORS: {
    injectorMissing: 'Instance of Space.Injector needed to initialize module.'
  },

  configuration: {},
  requiredModules: null,
  // An array of paths to classes that you want to become
  // singletons in your application e.g: ['Space.messaging.EventBus']
  // these are automatically mapped and created on `app.run()`
  singletons: [],
  injector: null,
  _state: 'constructed',

  Constructor(...args) {
    SpaceObject.apply(this, args);
    if (isNil(this.requiredModules)) {
      this.requiredModules = [];
    }
  },

  initialize(app, injector, isSubModule = false) {
    this.app = app;
    this.injector = injector;

    if (!this.is('constructed')) {return;} // Only initialize once
    if (isNil(this.injector)) {
      throw new Error(this.ERRORS.injectorMissing);
    }

    this._state = 'configuring';

    // Setup logger
    if (!isSubModule) {
      this.log = this._createLogger();
    } else {
      this.log = this.injector.get('log');
    }
    this.log.debug(`${this.constructor.publishedAs}: initialize`);

    // Setup basic mappings required by all modules if this the top-level module
    if (!isSubModule) {
      this.injector.map('Injector').to(this.injector);
      this._mapSpaceServices();
    }

    // Setup required modules
    for (let moduleId of this.requiredModules) {
      // Create a new module instance if not already registered with the app
      if (isNil(this.app.modules[moduleId])) {
        const ModuleClass = Module.require(moduleId, this.constructor.name);
        this.app.modules[moduleId] = new ModuleClass();
        // Initialize required module
        const module = this.app.modules[moduleId];
        module.initialize(this.app, this.injector, true);
      }
    }

    // Merge in own configuration to give the chance for overwriting.
    if (isSubModule) {
      _.deepExtend(this.app.configuration, this.configuration);
      this.configuration = this.app.configuration;
    } else {
      // The app can override all other modules
      _.deepExtend(this.configuration, this.constructor.prototype.configuration);
    }

    // Provide lifecycle hook before any initialization has been done
    if (_.isFunction(this.beforeInitialize)) {
      this.beforeInitialize();
    }

    // @backward {space:base} <= 4.1.3 for Meteor package,
    // Give every module access Npm
    if (!isNil(Meteor) && this._isServer() && !isNil(Npm)) {
      this.npm = Npm;
    }

    // Top-level module
    if (!isSubModule) {
      this.injector.map('configuration').to(this.configuration);
      this._runOnInitializeHooks();
      this._autoMapSingletons();
      this._autoCreateSingletons();
      this._runAfterInitializeHooks();
    }
  },

  start() {
    if (this.is('running')) {return;}
    this._runLifeCycleAction('start');
    this._state = 'running';
  },

  reset() {
    // Don't allow reseting on production env
    if (this._isServer() && this._isProduction()) {return;}
    if (this._isResetting) {return;}

    const restartRequired = this.is('running');
    this._isResetting = true;
    if (restartRequired) {this.stop();}
    this._runLifeCycleAction('reset');
    if (restartRequired) {this.start();}

    // @compability {Meteor} for Meteor package
    // There is no other way to avoid reset being called multiple times
    // if multiple modules require the same sub-module.
    if (!isNil(Meteor)) {
      Meteor.defer(() => {this._isResetting = false;});
    }
  },

  stop() {
    if (this.is('stopped')) {return;}
    this._runLifeCycleAction('stop', () => {});
    this._state = 'stopped';
  },

  is(expectedState) {
    return expectedState === this._state;
  },

  // Invokes the lifecycle action on all required modules, then on itself,
  // calling the instance hooks before, on, and after
  _runLifeCycleAction(action, func) {
    this._invokeActionOnRequiredModules(action);
    this.log.debug(`${this.constructor.publishedAs}: ${action}`);

    if (_.isFunction(this[`before${capitalize(action)}`])) {
      this[`before${capitalize(action)}`]();
    }
    if (_.isFunction(func)) {
      func();
    }
    if (_.isFunction(this[`on${capitalize(action)}`])) {
      this[`on${capitalize(action)}`]();
    }
    if (_.isFunction(this[`after${capitalize(action)}`])) {
      this[`after${capitalize(action)}`]();
    }
  },

  // Provide lifecycle hook after this module was configured and injected
  _runOnInitializeHooks() {
    this._invokeActionOnRequiredModules('_runOnInitializeHooks');
    // Never run this hook twice
    if (this.is('configuring')) {
      this.log.debug(`${this.constructor.publishedAs}: onInitialize`);
      this._state = 'initializing';
      // Inject required dependencies into this module
      this.injector.injectInto(this);
      // Call custom lifecycle hook if existant
      if (_.isFunction(this.onInitialize)) {
        this.onInitialize();
      }
    }
  },

  _autoMapSingletons() {
    this._invokeActionOnRequiredModules('_autoMapSingletons');
    if (this.is('initializing')) {
      this.log.debug(`${this.constructor.publishedAs}: _autoMapSingletons`);
      this._state = 'auto-mapping-singletons';
      // Map classes that are declared as singletons
      for (let singleton of this.singletons) {
        this.injector.map(singleton).asSingleton();
      }
    }
  },

  _autoCreateSingletons() {
    this._invokeActionOnRequiredModules('_autoCreateSingletons');
    if (this.is('auto-mapping-singletons')) {
      this.log.debug(`${this.constructor.publishedAs}: _autoCreateSingletons`);
      this._state = 'auto-creating-singletons';
      // Create singleton classes
      for (let singleton of this.singletons) {
        this.injector.create(singleton);
      }
    }
  },

  // After all modules in the tree have been configured etc. invoke last hook
  _runAfterInitializeHooks() {
    this._invokeActionOnRequiredModules('_runAfterInitializeHooks');
    // Never run this hook twice
    if (this.is('auto-creating-singletons')) {
      this.log.debug(`${this.constructor.publishedAs}: afterInitialize`);
      this._state = 'initialized';
      // Call custom lifecycle hook if existant
      if (_.isFunction(this.afterInitialize)) {
        this.afterInitialize();
      }
    }
  },

  _invokeActionOnRequiredModules(action) {
    for (let moduleId of this.requiredModules) {
      if (_.isFunction(this.app.modules[moduleId][action])) {
        this.app.modules[moduleId][action]();
      }
    }
  },

  _wrapLifecycleHook(hook, wrapper) {
    if (isNil(this[hook])) {
      this[hook] = () => {};
    }
    this[hook] = _.wrap(this[hook], wrapper);
  },

  _createLogger() {
    const config = this._getLoggingConfig(this.configuration);
    const logger = new Logger();
    if (config.enabled === true) {
      logger.start();
    }
    return logger;
  },

  _getLoggingConfig() {
    let config = {};
    _.deepExtend(config, this.configuration);
    _.deepExtend(config, this.constructor.prototype.configuration);
    return config.log || {};
  },

  _mapSpaceServices() {
    this.injector.map('log').to(this.log);
  },

  _isServer() {
    return !(typeof window !== 'undefined' && window.document);
  },

  _isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  statics: {
    // ========== STATIC MODULE MANAGEMENT ============

    // All published modules register themselves here
    published: {},

    define(moduleName, prototype = {}) {
      prototype.toString = () => moduleName; // For better debugging
      return this.publish(Module.extend(moduleName, prototype), moduleName);
    },

    // Publishes a module into the space environment to make it
    // visible and requireable for other modules and the application
    publish(module, identifier) {
      // TODO: its overriding name necessary?
      // TypeError: Cannot assign to read only property 'name' of function 'function GrandchildModule() {       initialize.apply(this, arguments);     }'
      // module.publishedAs = module.name = identifier;
      module.publishedAs = identifier;
      if (!isNil(Module.published[identifier])) {
        throw new Error(`Two modules tried to be published as <${identifier}>`);
      } else {
        Module.published[identifier] = module;
        return Module.published[identifier];
      }
    },

    // Retrieve a module by identifier
    require(requiredModule, requestingModule) {
      const module = Module.published[requiredModule];
      if (isNil(module)) {
        throw new Error(`Could not find module <${requiredModule}> required by
        <${requestingModule}>`);
      } else {
        return module;
      }
    }
  }
});

export default Module;
