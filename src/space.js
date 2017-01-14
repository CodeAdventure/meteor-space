import {isNil, get, capitalize} from 'lodash';
import _ from 'underscore';

class Namespace {
  constructor(path) {
    this._path = path;
  }
  getPath() {
    return this._path;
  }
  toString() {
    return this._path;
  }
}

// Define namespace for the space framework
const Space = new Namespace('Space');
Space.Namespace = Namespace;
Space.registry = {};

// Not available on browsers
if (isNil(global)) {
  let global = this;
}
global.Space = Space;
// Resolves a (possibly nested) path to a global object
// Returns the object or null (if not found)
Space.resolvePath = function(path) {
  if (isNil(path)) {throw new Error(`Cannot resolve invalid path <${path}>`);}
  if (path === '') {return global;}

  // If there is a direct reference just return it
  if (Space.registry && !isNil(Space.registry[path])) {
    return Space.registry[path];
  }
  if (get(Space, `Module.published.${path}`)) {
    return Space.Module.published[path];
  }
  const parts = path.split('.');

  let result = global; // Start with global namespace
  for (let key of parts) { // Move down the object chain
    result = get(result, key);
    // Take published space modules into account
    // to solve the Meteor package scoping problem
    if (isNil(result)) {
      throw new Error("Could not resolve path '" + path + "'");
    }
  }
  return result;
};

Space.namespace = function(id) {
  Space.registry[id] = new Space.Namespace(id);
  return Space.registry[id];
};

// @backward {space:base} <= 4.1.3
Space.capitalizeString = capitalize;

Space.Dependency = function(propertyName, dependencyId) {
  return function(target) {
    const proto = target.prototype;
    if (proto.dependencies && !proto.hasOwnProperty('Dependencies')) {
      proto.dependencies = _.clone(proto.dependencies);
    }
    if (isNil(proto.dependencies)) {proto.dependencies = {};}
    proto.dependencies[propertyName] = dependencyId || propertyName;
    return target;
  };
};

Space.RequireModule = function(moduleId) {
  return function(target) {
    const proto = target.prototype;
    if (proto.requiredModules && !proto.hasOwnProperty('RequiredModules')) {
      proto.requiredModules = _.clone(proto.requiredModules);
    }
    if (isNil(proto.requiredModules)) {proto.requiredModules = [];}
    proto.requiredModules.push(moduleId);
    return target;
  };
};

export default Space;
