import Module from '../../lib/module.js';
import Application from '../../lib/application.js';

describe("Space.base - Requiring modules in other modules and apps", function() {

  it("multiple modules should be able to require the same base module", function() {

    Module.define('BaseModule', {
      // Regression test -> this was invoked twice at some point
      afterInitialize: function() {
        this.injector.map('x').to('y');
      }
    });

    Module.define('DependentModule1', { requiredModules: ['BaseModule'] });
    Module.define('DependentModule2', { requiredModules: ['BaseModule'] });

    const MyApp = Application.define('MyApp', {
      requiredModules: ['DependentModule1', 'DependentModule2']
    });

    let appInit = function() { return new MyApp(); };
    expect(appInit).to.not.throw(Error);
  });

});
