Changelog
=========
## Next
- Removes deprecated `grigio:babel@0.1.3` meteor dependency. It was causing errors related to long or failed builds (like: `Cannot enlarge memory arrays`)

## 4.1.3
- Fixes the BDD test helper on `Space.Module` and `Space.Application` to actually accept a second param that can be a existing app instance.

## 4.1.2
- Fixes superClass method for classes that are not directly extending Space.Object

## 4.1.1
- Improves the way mixins are applied to classes and ensures that:
  - Sub classes always inherit all mixins applied to parent classes, even when this happens "later on"
  - All sub classes inherit the static mixin properties, even after extending the base class

- Adds the following helpers are added to `Space.Object` for convenience:
  - **static**
    - `MyClass.hasSuperClass()`
    - `MyClass.superClass([key])` - either returns the super class constructor or static property/method
    - `MyClass.subClasses()` - returns flat array of all sub classes
  - **prototype**
    - `myInstance.hasSuperClass()`
    - `myInstance.superClass([key])` - same as static version but returns prototype props/methods

## 4.1.0
- Adds `hasMixin()` instance method to Space.Object to check if the class has applied or inherited a specific mixin

### 4.0.2
- `Space.Struct` were previously not calling their super constructor which caused a bug with the new `onConstruction` hooks

### 4.0.1

- Improves `Space.Object.extend()` implementations
- Fixes bug in `Space.Error`
- Adds tests for mixin callbacks

## 4.0.0 :tada:
**This is a big major release with many new features and improvements:**

- Adds extensible `Space.Error` class that has the same api as `Space.Object` but can
be used for better custom error classes.
```javascript
// When throwing this: "MyError: The default message for this error"
let MyError = Space.Error.extend('MyError', {
    message: 'The default message for this error'
});
// When throwing this: "MyParamError: Custom message with <param>"
let MyError = Space.Error.extend('MyParamError', {
    Constructor: (param) {
      Space.Error.call(this, `Custom message with ${param}`);
    }
});
```

- Improves mixins for `Space.Object` by making `onDependenciesReady` hooks
available. All mixins can now define their own `onDependenciesReady` methods
which all get called by the host class correctly. This way mixins can do setup
work on host classes.
```javascript
My.CustomMixin = {
    onDependenciesReady() { // Do some setup work }
};
My.CustomClass.mixin(My.CustomMixin);
// Of course normally you dont have to call `onDependenciesReady` yourself
new My.CustomClass().onDependenciesReady() // Mixin hook is called!
```

- You can now add mixins to any subclass of `Space.Object` like this:
```javascript
Space.Object.extend('CustomClass', { mixin: [FirstMixin, SecondMixin] });
```

- Mixin methods now override methods on the host class!

- Many bugfixes and improvements related to `Space.Module` lifecycle hooks.
Previous hooks like `onStart` and `onConfigure` have been replaced with a complete
lifecycle split into three main phases: `initialize`, `start`, `reset`. Each
with `on`, `before` and `after` hooks like `onInitialize` / `afterStart` etc.

- Refactored all core api properties like `Dependencies`, `RequiredModules`,
`Singletons` etc. to lowercase pendants: e.g `dependencies`, `requiredModules`

- Added `Space.Logger`, an extensible logger based on [winston](https://www.npmjs.com/package/winston)
available in your application as `dependencies: { log: 'log' }`

- You can now do static setup work on classes like this:
```javascript
Space.Object.extend('CustomClass', {
    onExtending() {
      // <this> is the class itself here!
    }
});
```

- Adds static `Space.Object.isSubclassOf` method that is available for all
sub classes automatically. So you can ask `MyFirstClass.isSubclassOf(OtherClass)`

- Improved error handling and messages of `Space.Injector` (DI System)

- `Space.Struct` can now be serialized `toData` and `Space.Struct.fromData`
which has some benefits over EJSON: all fields are plain and accessible for
queries!

- New recommended way to define classes with full class path for improved
debugging and automatic type registration (EJSON / toData):
```javascript
// Instead of:
Space.Object.extend(My.namespace, 'MyCustomClass');
// Do this now:
Space.Object.extend('My.namespace.MyCustomClass');
```

- Added proper MIT license

- Added BDD test helper `Space.Module.registerBddApi`

*Thanks to all the new people on the team who made this awesome release possible:*

- [Rhys Bartels-Waller](https://github.com/rhyslbw)
- [Darko Mijić](https://github.com/darko-mijic)
- [Adam Desivi](https://github.com/qejk)
- [Jonas Aschenbrenner](https://github.com/Sanjo)

:clap:

## 3.2.1
- Bug fixes relating to package configuration

## 3.2.0
**Module/Application state and lifecycle improvements**
- Formalizes state to better manage module lifecycle
- States include: Constructed -> Initialized -> Stopped -> Running
- Accessor method `app.is(expectedState) // eg 'running'`
- Calling .reset() on a running Application or Module now calls .stop()
on it first, then start() again after it's been reset.

**Configuration API Support**
- `Space.getenv` helper wraps [getenv](https://www.npmjs.com/package/getenv) to provide support for ENV typecasting, particularly for merging with runtime config

**Other Changes**
- Default Meteor mappings have been moved down to Module from Application
- `MongoInternals` is now mapped on the server

**Bugfixes**
- Minor injector fixes, with better error handling.

### 3.1.1
- Fixes bug with recently updated injector code

### 3.1.0
- Fixed bug with module lifecycle hooks
- Improved `Space.Object` mixin api to make it possible to mixin static class
properties via the special `Static` property and to do static setup when the
mixin is applied by providing a `onMixinApplied` method in the mixin definition.
Both properties are not added to the prototype of course. The `onMixinApplied`
method is called with the host class as `this` context.

### 3.0.0
Several breaking changes and API improvements have been made:
- `ReactiveVar` is now mapped statically instead of `instancesOf`, so you
can use it like the "normal"
- The module/app lifecycle has been harmonized into a simple system:
There are 4 lifecycle phases: `initialize`, `start`, `reset` and `stop`.
For each phase there are `before`, `on`, and `after` hooks that are called
in the logical order -> deepest nested module first. The `initialize` method
is the only one that should not be called from outside but is automatically
called when constructing a module/app.
- The configuration API slightly changed again: The `configure` method is
only defined on `Space.Application` and allows to override the default config of
the app / modules.
- The previous `configure` hooks does not exist anymore. You should use `onInitialize`
instead.

### 2.5.1
- Thanks @sanjo for a patch that fixes dependency injection if two components
  depend on each other.

### 2.5.0
Several improvements and bug fixes have been made:
- Keep the required min version of Meteor down to 1.0
- Added `afterApplicationStart` hook for modules and apps that is called
  after everything has been configured and started.
- Improved configuration api to allow overriding of arbitrarily nested
  configuration values. This is super awesome for overriding configs of
  modules.
- Added  `Space.Object#type` api for adding debug info about class types.
- Added `stop` hook for modules and apps that is similar to `reset` but
  should be used for really drastic cleanup (like stopping observers etc.)

### 2.4.2
Fixes some bugs with the new Meteor dependency tracker and the default
dependency injections in Space applications.

### 2.4.1
Introduces better way to configure modules and applications. Now you can
define a default `Configuration` property on the prototype and override
specific values of it when creating the application instance like this:
```javascript
new TestApp({
  Configuration: {
    propertyToOverride: 'customValue',
  }
});
```
All configurations are merged into a single `Configuration` object available
via the application injector like this: `injector.get('Configuration')`.

### 2.4.0
Introduces dynamic overriding of injected dependencies in the running system.
Now you can call `injector.override('Test').to('newValue')` and all objects
that had the previous value of `Test` injected will be updated with the new
value dynamically. This makes it possible to swap out complete sub-systems
while the application is running. Of course it also comes with the potential
of memory leaks, because now the injection mappings have to hold references
to each and every object that dependencies are injected to. That's where the
new `Space.Injector::release` API comes to play. If you have an object that
should be garbage collected but has dependencies injected you need to release
it from the Injector to let the mappings remove the references. In reality you
rarely have to manage this yourself because other packages like `space:ui` will
handle this transparently in the background.

### 2.3.1
Only updated the Github repository links after moving it to the new
https://github.com/meteor-space organization.

### 2.3.0
- Adds `Space.namespace('MyNamespace')` which simplifies working with Meteor
package scopes. Up until now Space could not resolve exported variables from
packages in your app because Meteor is hiding them from the `space:base` package.

### 2.2.0
- Improves `Space.Object.extend` capabilities to work smoothly with Javascript
and provide multiple ways to extend core classes.
- Improves general debugging experience by throwing errors when values can
not be resolved with `Space.resolvePath`
- `Space.resolvePath` now also takes into account published space modules, which
solves the problem of Meteor package scoping.
- adds `Space.Module.define` and `Space.Application.define` which makes it easier
to flesh out modules and apps in Javascript (without having to call `publish`)

### 2.1.0
Introduces lazy auto-mapping of singletons and static values if they are
requested by other parts via the `Dependencies` property. For the first request
it looks up the dependency on the global context and maps functions as singletons
and other values as static. Be aware that some part of the system has to require
your singleton before it ever exists. In some cases this is not what you want
(e.g event handling)

### 2.0.1
@Sanjo fixed an issue with weak-dependencies injection in `Space.Application`.

### 2.0.0
#### Breaking Changes:

- Unified the API for starting `Space.Module` and `Space.Application`. This
means you have to call `yourApp.start()` instead of `yourApp.run()` now.
- Renamed the `run` hook for modules and applications to `startup`, so instead
of defining `run: function() { … }` you need `startup: function() { … }` inside your modules and apps now.

### 1.4.2
Make it possible to declare `Singletons: []` on any module with paths to classes
that should be mapped and created as singletons automatically.

### 1.4.1
Fixes some package dependency issues

### 1.4.0
Adds basic mixin capabilities to Space.Object that allows to extend
the prototype of a given class without direct inheritance

### 1.3.2
Fixes bug with running dependent modules in correct order.

### 1.3.1
Throw error when trying to map `undefined` or `null` value.

### 1.3.0
Adds helpers specs and fixes edge case bug with resolve path helper

### 1.2.9
Introduces general purpose helpers on the Space namespace

### 1.2.8
Adds global value lookup for injection mapping support: e.g:
`@injector.map('my.awesome.Class').asSingleton()`

### 1.2.7
Support old js engines that without Object.defineProperty support.

### 1.2.6
Fixes bug where `onDependenciesReady` was only called once per prototype

### 1.2.5
Fixes bug where `onDependenciesReady` was called more than once

### 1.2.4
Fixes bug where injected values were overwritten

### 1.2.4
Fixes bug where injected values were overwritten

### 1.2.3
Fixes regression bug where injector didn't inject into values

### 1.2.2
Renames `Space.Class` to `Space.Object`

### 1.2.1
#### Features:
  * Adds support for static constructor functions while extending classes
  * Completes API compatibility to dependance injector

#### Bugfixes:
  * Providers are now added to the `Mapping` prototype, not to every instance.

### 1.2.0
#### Features:
  * Adds `Space.Object` for better Javascript inheritance support
  * Replaces Dependance with brand new (but compatible) `Space.Injector`

### 1.1.0
Added mappings to core Meteor packages

### 1.0.0
Publish first version to Meteor package system

### 0.1.0
Initial release of Space
