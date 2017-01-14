import SpaceObject from './object.js';
import {values as ObjectValues} from 'lodash';
const Logger = SpaceObject.extend('Space.Logger', {

  STATES: {
    stopped: 'stopped',
    running: 'running'
  },

  Constructor() {
    this._state = this.STATES.stopped;
    this._adapters = {};
  },

  addAdapter(id, adapter, shouldOverride = false) {
    if (!id || typeof id !== 'string') {
      throw new Error(this.constructor.ERRORS.invalidId);
    }
    if (this.hasAdapter(id) && !shouldOverride) {
      throw new Error(this.constructor.ERRORS.mappingExists(id));
    }
    this._adapters[id] = adapter;
  },

  overrideAdapter(id, adapter) {
    return this.addAdapter(id, adapter, true);
  },

  getAdapter(id) {
    return this._adapters[id] || null;
  },

  hasAdapter(id) {
    return (this._adapters[id] !== null && this._adapters[id] !== undefined);
  },

  removeAdapter(id) {
    if (this._adapters[id]) {delete this._adapters[id];}
  },

  getAdapters() {
    return this._adapters;
  },

  start() {
    if (this.isInState(this.STATES.stopped)) {
      this._state = this.STATES.running;
    }
  },

  stop() {
    if (this.isInState(this.STATES.running)) {
      this._state = this.STATES.stopped;
    }
  },

  debug(...args) {
    this._log('debug', args);
  },

  info(...args) {
    this._log('info', args);
  },

  warning(...args) {
    this._log('warning', args);
  },

  error(...args) {
    this._log('error', args);
  },

  isInState(expectedState) {
    return (this._state === expectedState);
  },

  isRunning() {
    return this.isInState(this.STATES.running);
  },

  isStopped() {
    return this.isInState(this.STATES.stopped);
  },

  _log(level, args) {
    if (!this.isInState(this.STATES.running)) {return;}

    for (let adapter of ObjectValues(this.getAdapters())) {
      adapter[level].apply(adapter, args);
    }
  }
});

Logger.ERRORS =  {
  mappingExists(id) {
    return `Adapter with id '${id}' would be overwritten. Use method
    'overrideAdapter' for that`;
  },
  invalidId: 'Cannot map <null> or <undefined> or non string values'
};

export default Logger;
