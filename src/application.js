import _ from 'underscore';
import Module from './module.js';
import {Injector} from './injector.js';

const Application = Module.extend('Space.Application', {

  statics: {
    define(classPath, prototype) {
      prototype.toString = () => appName; // For better debugging
      return this.extend(classPath, prototype);
    }
  },

  configuration: {
    appId: null
  },

  Constructor(options = {}) {
    Module.call(this, options);
    this.modules = {};
    this.configuration = options.configuration || {};
    this.constructor.publishedAs = this.constructor.name;
    this.initialize(this, options.injector || new Injector());
  },

  // Make it possible to override configuration (at any nested level)
  configure(options) {
    _.deepExtend(this.configuration, options);
  }
});

export default Application;
