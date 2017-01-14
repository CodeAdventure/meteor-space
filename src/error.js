import _ from 'underscore';
import {entries as ObjectEntries} from 'lodash';
import {optional, Integer} from 'simplecheck';
import Struct from './struct.js';
import SpaceObject from './object.js';

const IntermediateInheritor = function() {};
IntermediateInheritor.prototype = Error.prototype;

const SpaceError = function(params) {
  let data = null;
  if (_.isString(params)) {
    data = { message: params };
  } else if (_.isObject(params)) {
    data = params;
  } else {
    data = {};
  }
  const properties = this.extractErrorProperties(data);

  this._checkFields(properties);
  this._invokeConstructionCallbacks.apply(this, arguments);
  // Copy properties to instance by default
  for (let [key, value] of ObjectEntries(properties)) {
    this[key] = value;
  }
  return this;
};

SpaceError.prototype = new IntermediateInheritor();

_.extend(
  SpaceError.prototype, // target
  Struct.prototype,
  _.omit(SpaceObject.prototype, 'toString'),
  {
    message: '',
    fields() {
      let fields = _.clone(this.constructor.fields) || {};
      _.extend(fields, {
        name: String,
        message: String,
        stack: optional(String),
        code: optional(Integer)
      });
      return fields;
    },
    extractErrorProperties(data) {
      let message = data.message ? data.message : this.message;
      let error = Error.call(this, message);
      data.name = error.name = this.constructor.name;
      data.message = error.message;
      if (error.stack !== undefined) data.stack = error.stack;
      return data;
    }
  }
);

_.extend(SpaceError, _.omit(SpaceObject, 'toString'), {
  __keepToStringMethod__: true // Do not override #toString method
});
SpaceError.prototype.toString = function() {
  return this.message;
};

export default SpaceError;
