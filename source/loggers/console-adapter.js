import LoggingAdapter from './adapter';

const ConsoleLogger = LoggingAdapter.extend('Space.Logger.ConsoleAdapter', {

  Constructor() {
    LoggingAdapter.call(this, console);
  },

  warning(...args) {
    return this._log('warn', args);
  }
});

export default ConsoleLogger;
