import SpaceObject from '../object.js';

const LoggingAdapter = SpaceObject.extend('Space.Logger.LoggingAdapter', {

  _lib: null,
  Constructor(lib) {
    if (!lib) {
      throw new Error(this.ERRORS.undefinedLibrary);
    }
    this.setLibrary(lib);
  },

  setLibrary(lib) {
    this._lib = lib;
  },

  getLibrary() {
    return this._lib || null;
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

  _log(level, args) {
    this._lib[level].apply(this._lib, args);
  },

  ERRORS: {
    undefinedLibrary: 'Logging library is required'
  }
});

export default LoggingAdapter;
