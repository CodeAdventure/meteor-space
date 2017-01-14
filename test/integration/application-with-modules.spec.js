import Module from '../../lib/module.js';
import Application from '../../lib/application.js';

describe('Building applications based on modules', function() {

  beforeEach(function() {
    Module.published = {}; // reset published space modules
  });

  it('loads required module correctly', function() {

    let testValue = {};
    let testResult = null;

    Module.define('FirstModule', {
      onInitialize: function() {
        this.injector.map('testValue').to(testValue);
      }
    });

    Application.create({
      requiredModules: ['FirstModule'],
      dependencies: { testValue: 'testValue' },
      onInitialize: function() { testResult = this.testValue; }
    });

    expect(testResult).to.equal(testValue);
  });

  it('configures module before running', function() {

    const moduleValue = 'module configuration';
    const appValue = 'application configuration';
    let testResult = null;

    Module.define('FirstModule', {
      onInitialize: function() {
        this.injector.map('moduleValue').to(moduleValue);
      },
      onStart: function() {
        testResult = this.injector.get('moduleValue');
      }
    });

    const app = Application.create({
      requiredModules: ['FirstModule'],
      dependencies: { moduleValue: 'moduleValue' },
      onInitialize: function() {
        this.injector.override('moduleValue').toStaticValue(appValue);
      }
    });

    app.start();
    expect(testResult).to.equal(appValue);
  });
});
