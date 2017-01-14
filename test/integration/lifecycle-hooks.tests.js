import _ from 'underscore';
import Module from '../../lib/module.js';
import Application from '../../lib/application.js';

describe("Space.base - Application lifecycle hooks", function() {

  // TEST HELPERS

  const addHookSpy = function(hooks, hookName) {
    hooks[hookName] = function() {};
    sinon.spy(hooks, hookName);
  };

  const createLifeCycleHookSpies = function() {
    const hooks = {};
    const hookNames = [
      'beforeInitialize', 'onInitialize', 'afterInitialize', 'beforeStart', 'onStart',
      'afterStart', 'beforeReset', 'onReset', 'afterReset', 'beforeStop', 'onStop', 'afterStop'
    ];
    for (let i = 0; i < hookNames.length; i++) {
      addHookSpy(hooks, hookNames[i]);
    }
    return hooks;
  };

  const testOrderOfLifecycleHook = function(context, before, on, after) {
    const modules = ['firstHooks', 'secondHooks', 'appHooks'];
    const hooks = [before, on, after];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(context[modules[i]][hooks[j]]).to.have.been.calledOnce;
        if (i < 2) {
          expect(context[modules[i]][hooks[j]]).to.have.been.calledBefore(
            context[modules[i + 1]][hooks[j]]
          );
        }
      }
    }
  };

  const expectHooksNotToBeCalledYet = function(context, before, on, after) {
    const modules = ['firstHooks', 'secondHooks', 'appHooks'];
    const hooks = [before, on, after];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(context[modules[i]][hooks[j]]).not.to.have.been.called;
      }
    }
  };

  beforeEach(() => {
    // reset published space modules
    Module.published = {};
    // Setup lifecycle hooks with sinon spys
    this.firstHooks = createLifeCycleHookSpies();
    this.secondHooks = createLifeCycleHookSpies();
    this.appHooks = createLifeCycleHookSpies();
    // Create a app setup with two modules and use the spied apon hooks
    Module.define('First', this.firstHooks);
    Module.define('Second', _.extend(this.secondHooks, { requiredModules: ['First'] }));
    this.app = Application.create(_.extend(this.appHooks, { requiredModules: ['Second'] }));
  });

  it("runs the initialize hooks in correct order", () => {
    testOrderOfLifecycleHook(this, 'beforeInitialize', 'onInitialize', 'afterInitialize');
  });

  it("runs the start hooks in correct order", () => {
    expectHooksNotToBeCalledYet(this, 'beforeStart', 'onStart', 'afterStart');
    this.app.start();
    testOrderOfLifecycleHook(this, 'beforeStart', 'onStart', 'afterStart');
  });

  it("runs the stop hooks in correct order", () => {
    expectHooksNotToBeCalledYet(this, 'beforeStop', 'onStop', 'afterStop');
    this.app.start();
    this.app.stop();
    testOrderOfLifecycleHook(this, 'beforeStop', 'onStop', 'afterStop');
  });

  it("runs the reset hooks in correct order when app is running", () => {
    expectHooksNotToBeCalledYet(this, 'beforeReset', 'onReset', 'afterReset');
    this.app.start();
    this.app.reset();
    testOrderOfLifecycleHook(this, 'beforeStop', 'onStop', 'afterStop',
                             'beforeReset', 'onReset', 'afterReset', 'beforeStart',
                             'onStart', 'afterStart');
  });

  it("runs the reset hooks in correct order when app is stopped", () => {
    expectHooksNotToBeCalledYet(this, 'beforeReset', 'onReset', 'afterReset');
    this.app.reset();
    testOrderOfLifecycleHook(this, 'beforeReset', 'onReset', 'afterReset');
  });
});
