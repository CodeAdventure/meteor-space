import Module from '../../lib/module.js';
import SpaceObject from '../../lib/object.js';
import {Injector} from '../../lib/injector.js';
import Space from '../../lib/space.js';

describe("Module - regressions", function() {

  it("ensures autoboot singletons have access to injector mappings made in module onInitialize", function() {
    const Test = Space.namespace('Test');

    const SomeLib = { libMethod: function() {} };
    const singletonReadySpy = sinon.spy();
    const myInjector = new Injector();

    SpaceObject.extend(Test, 'MySingleton', {
      dependencies: { someLib: 'SomeLib' },
      onDependenciesReady: singletonReadySpy
    });

    Test.MyModule = Module.extend(Test, 'MyModule', {
      singletons: ['Test.MySingleton'],
      onInitialize() { this.injector.map('SomeLib').to(SomeLib); }
    });

    const module = new Test.MyModule();
    module.initialize(module, myInjector);

    expect(singletonReadySpy).to.have.been.called;

  });

});
