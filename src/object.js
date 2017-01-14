import _ from 'underscore';
import {isNil, entries as ObjectEntries, values as ObjectValues, isPlainObject} from 'lodash';
import {ensure, oneOf, anything} from 'simplecheck';
import Space from './space.js';
require('./lib/underscore-deep-extend-mixin.js');

const __extends__ = function(child, parent) {
  for (let key of ObjectValues(this)) {
    child[key] = parent[key];
  }
  child.prototype = Object.create(parent.prototype);
  child.__super__ = parent.prototype;
  return child;
};

class SpaceObject {
  // ============= PUBLIC PROTOTYPE ============== #

  // Assign given properties to the instance
  constructor(properties) {
    this._invokeConstructionCallbacks.apply(this, arguments);
    // Copy properties to instance by default
    for (let [key, value] of ObjectEntries(properties)) {
      this[key] = value;
    }
  }

  onDependenciesReady() {
    // Let mixins initialize themselves when dependencies are ready
    for (let mixin of this.constructor._getAppliedMixins()) {
      if (mixin.onDependenciesReady) {mixin.onDependenciesReady.call(this);}
    }
  }

  toString() {
    return this.constructor.toString();
  }

  hasSuperClass() {
    return (!isNil(this.constructor.__super__));
  }

  // Returns either the super class constructor (if no param given) or
  // the prototype property or method with [key]
  superClass(key) {
    let sup = this.constructor.__super__.constructor;
    if (!isNil(key)) {
      return sup.prototype[key];
    } else {
      return sup;
    }
  }

  // Returns true if the passed in mixin has been applied to this or a super class
  hasMixin(mixin) {
    return _.contains(this.constructor._getAppliedMixins(), mixin);
  }

  // This method needs to stay separate from the constructor so that
  // SpaceError can use it too!
  _invokeConstructionCallbacks() {
    if (isNil(this.constructor._getAppliedMixins)) {
      return;
    }
    // Let mixins initialize themselves on construction
    for (let mixin of this.constructor._getAppliedMixins()) {
      if (mixin.onConstruction) {mixin.onConstruction.apply(this, arguments);}
    }
  }

  // ============= PUBLIC STATIC ============== #

  // Extends this class and return a child class with inherited prototype
  // and static properties.
  //
  // There are various ways you can call this method:
  //
  // 1. SpaceObject.extend()
  // --------------------------------------------
  // Creates an anonymous child class without extra prototype properties.
  // Basically the same as `class extend SpaceObject` in coffeescript
  //
  // 2. SpaceObject.extend(className)
  // --------------------------------------------
  // Creates a named child class without extra prototype properties.
  // Basically the same as `class ClassName extend SpaceObject` in coffeescript
  //
  // 3. SpaceObject.extend(classPath)
  // --------------------------------------------
  // Creates a child class with fully qualified class path like "my.custom.Class"
  // assigned and registered internally so that Space.resolvePath can find it.
  // This also assigns the class path as type, which can be used for serialization
  //
  // 4. SpaceObject.extend({ prop: 'first', … })
  // --------------------------------------------
  // Creates an anonymous child class with extra prototype properties.
  // Same as:
  // class extend SpaceObject
  //   prop: 'first'
  //
  // 5. SpaceObject.extend(namespace, className)
  // --------------------------------------------
  // Creates a named class which inherits from SpaceObject and assigns
  // it to the given namespace object.
  //
  // 6. SpaceObject.extend(className, prototype)
  // --------------------------------------------
  // Creates a named class which inherits from SpaceObject and extra prototype
  // properties which are assigned to the new class
  //
  // 7. SpaceObject.extend(classPath, prototype)
  // --------------------------------------------
  // Creates a registered class which inherits from SpaceObject and extra prototype
  // properties which are assigned to the new class
  //
  // 8. SpaceObject.extend(namespace, className, prototype)
  // --------------------------------------------
  // Creates a named class which inherits from SpaceObject, has extra prototype
  // properties and is assigned to the given namespace.
  static extend(...args) {
    // Defaults
    let namespace = {};
    let classPath = null;
    let className = '_Class'; // Same as coffeescript
    let extension = {};

    // Only one param: (extension) OR (className) OR (classPath) ->
    if (args.length === 1) {
      if (_.isObject(args[0])) { extension = args[0]; }
      if (_.isString(args[0])) {
        // (className) OR (classPath)
        if (args[0].indexOf('.') !== -1) {
          // classPath
          classPath = args[0];
          className = classPath.substr(classPath.lastIndexOf('.') + 1);
        } else {
          // className
          className = classPath = args[0];
        }
      }
    }

    // Two params must be: (namespace, className) OR (className, extension) ->
    if (args.length === 2) {
      if (_.isObject(args[0]) && _.isString(args[1])) {
        namespace = args[0];
        className = args[1];
        extension = {};
      } else if (_.isString(args[0]) && _.isObject(args[1])) {
        // (className) OR (classPath)
        namespace = {};
        extension = args[1];
        if (args[0].indexOf('.') !== -1) {
          // classPath
          classPath = args[0];
          className = classPath.substr(classPath.lastIndexOf('.') + 1);
        } else {
          // className
          className = classPath = args[0];
        }
      }
    }

    // All three params: (namespace, className, extension) ->
    if (args.length === 3) {
      namespace = args[0];
      className = args[1];
      extension = args[2];
    }

    ensure(namespace, oneOf(anything, Space.Namespace, Function));
    ensure(classPath, oneOf(String, null));
    ensure(className, String);
    ensure(extension, anything);

    // Assign the optional custom constructor for this class
    let Parent = this;
    let Constructor = !isNil(extension.Constructor) ?
      extension.Constructor :
      function() { return Parent.apply(this, arguments); };

    // Create a named constructor for this class so that debugging
    // consoles are displaying the class name nicely.
    let Child = new Function('initialize', `return function ${className}` + `() { \
      initialize.apply(this, arguments); \
    }`)(Constructor);

    // Add subclass to parent class
    Parent._subClasses.push(Child);

    // Copy the static properties of this class over to the extended
    for (let key in this) { Child[key] = this[key]; }
    Child._subClasses = [];

    // Copy over static class properties defined on the extension
    if (!isNil(extension.statics)) {
      _.extend(Child, extension.statics);
      delete extension.statics;
    }

    // Extract mixins before they get added to prototype
    let mixins = extension.mixin;
    delete extension.mixin;

    // Extract onExtending callback and avoid adding it to prototype
    let onExtendingCallback = extension.onExtending;
    delete extension.onExtending;

    // Javascript prototypal inheritance "magic"
    let Ctor = function() {
      this.constructor = Child;
    };
    Ctor.prototype = Parent.prototype;
    Child.prototype = new Ctor();
    Child.__super__ = Parent.prototype;

    // Apply mixins
    if (!isNil(mixins)) {Child.mixin(mixins);}

    // Merge the extension into the class prototype
    this._mergeIntoPrototype(Child.prototype, extension);

    // Add the class to the namespace
    if (!isNil(namespace)) {
      namespace[className] = Child;
      if (namespace instanceof Space.Namespace) {
        classPath = `${namespace.getPath()}.${className}`;
      }
    }

    // Add type information to the class
    if (!isNil(classPath)) {Child.type(classPath);}

    // Invoke the onExtending callback after everything has been setup
    if (!isNil(onExtendingCallback)) {
      onExtendingCallback.call(Child);
    }

    return Child;
  }

  static type(classPath) {
    // Register this class with its class path
    this.classPath = classPath;
    Space.registry[this.classPath] = this;
    try {
      // Add the class to the resolved namespace
      let path = this.classPath.substr(0, this.classPath.lastIndexOf('.'));
      let namespace = Space.resolvePath(path);
      let className = this.classPath.substr(this.classPath.lastIndexOf('.') + 1);
      return namespace[className] = this;
    } catch (error) {}
  }

  static toString() {
    return this.classPath;
  }

  // Create and instance of the class that this method is called on
  // e.g.: SpaceObject.create() would return an instance of SpaceObject
  static create() {
    // Use a wrapper class to hand the constructor arguments
    // to the context class that #create was called on
    let args = arguments;
    let Context = this;
    let wrapper = function() { return Context.apply(this, args); };
    __extends__(wrapper, Context);
    return new wrapper();
  }

  // Mixin properties and methods to the class prototype and merge
  // properties that are plain objects to support the mixin of configs etc.
  static mixin(mixins) {
    if (_.isArray(mixins)) {
      return Array.from(mixins).map((mixin) => this._applyMixin(mixin));
    } else {
      return this._applyMixin(mixins);
    }
  }

  // Returns true if this class has a super class
  static hasSuperClass() { return (!isNil(this.__super__)); }

  static isSubclassOf(sup) {
    let isSubclass = this.prototype instanceof sup;
    let isSameClass = this === sup;
    return isSubclass || isSameClass;
  }

  // Returns either the super class constructor (if no param given) or
  // the static property or method with [key]
  static superClass(key) {
    if (isNil(this.__super__)) { return undefined; }
    let sup = this.__super__.constructor;
    if (!isNil(key)) { return sup[key]; } else { return sup; }
  }

  // Returns a flat, uniq array of all sub classes
  static subClasses() {
    let subs = [].concat(this._subClasses);
    for (let subClass of subs) {
      subs = subs.concat(subClass.subClasses());
    }
    return _.uniq(subs);
  }

  // Returns true if the passed in mixin has been applied to this or a super class
  static hasMixin(mixin) {
    return _.contains(this._getAppliedMixins(), mixin);
  }

  static _applyMixin(mixin) {
    // Add the original mixin to the registry so we can ask if a specific
    // mixin has been added to a host class / instance
    // Each class has its own mixins array
    const hasMixins = !isNil(this._appliedMixins);
    const areInherited = (
      hasMixins && this.superClass('_appliedMixins') === this._appliedMixins
    );
    if (!hasMixins || areInherited) {
      this._appliedMixins = [];
    }

    // Keep the mixins array clean from duplicates
    if (!_.contains(this._appliedMixins, mixin)) {
      this._appliedMixins.push(mixin);
    }

    // Create a clone so that we can remove properties without affecting the global
    // mixin
    const mixinCopy = _.clone(mixin);

    // Remove hooks from mixin, so that they are not added to host class
    delete mixinCopy.onDependenciesReady;
    delete mixinCopy.onConstruction;

    // Mixin static properties into the host class
    if (!isNil(mixinCopy.statics)) {
      const statics = mixinCopy.statics;
      _.extend(this, statics);
      for (let sub of this.subClasses()) {
        _.extend(sub, statics);
      }
      delete mixinCopy.statics;
    }

    // Give mixins the chance to do static setup when applied to the host class
    if (!isNil(mixinCopy.onMixinApplied)) {
      mixinCopy.onMixinApplied.call(this);
    }
    delete mixinCopy.onMixinApplied;

    // Copy over the mixin to the prototype and merge objects
    this._mergeIntoPrototype(this.prototype, mixinCopy);
  }

  static _getAppliedMixins() {
    let mixins = [];
    if (this.hasSuperClass() && !isNil(this.superClass()._getAppliedMixins)) {
      mixins = mixins.concat(this.superClass()._getAppliedMixins());
    }
    if (!isNil(this._appliedMixins)) {
      mixins = mixins.concat(this._appliedMixins);
    }
    return _.uniq(mixins);
  }

  static _mergeIntoPrototype(prototype, extension) {
    for (let [key, value] of ObjectEntries(extension)) {
      const hasProperty = prototype.hasOwnProperty(key);
      if (hasProperty && isPlainObject(value) && isPlainObject(prototype[key])) {
        // Deep extend plain objects
        _.deepExtend(prototype[key], _.clone(value));
      } else {
        if (isPlainObject(value)) {
          value = _.clone(value);
        }
        // Set non-existing props and override existing methods
        prototype[key] = value;
      }
    }
  }
}

SpaceObject.type('Space.Object');
SpaceObject._subClasses = [];

export default SpaceObject;
