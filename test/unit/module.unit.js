import SpaceObject from '../../lib/object.js';
import Module from '../../lib/module.js';
import {Injector} from '../../lib/injector.js';

describe('Module', function() {

  beforeEach(() => {
    // Reset published space modules
    Module.published = {};
  });

  it('extends space object', () => {
    expect(Module.prototype).to.be.instanceof(SpaceObject);
  });

  describe('static publish', () => {

    it('adds given module to the static collection of published modules', () => {
      const module = Module.define('test');
      expect(Module.published.test).to.equal(module);
    });

    it('throws an error if two modules try to publish under same name', () => {
      const publishTwoModulesWithSameName = () => {
        Module.define('test');
        Module.define('test');
      };
      expect(publishTwoModulesWithSameName).to.throw(Error);
    });
  });

  describe('static require', () => {
    it('returns published module for given identifier', () => {
      const module = Module.define('test');
      const requiredModule = Module.require('test');
      expect(requiredModule).to.equal(module);
    });

    it('throws and error if no module was registered for given identifier', () => {
      const requireUnkownModule = () => {Module.require('unknown module');};
      expect(requireUnkownModule).to.throw(Error);
    });
  });

  describe('constructor', () => {
    it('sets required modules to empty array if none defined', () => {
      const module = new Module();
      expect(module.requiredModules).to.be.instanceof(Array);
      expect(module.requiredModules).to.be.empty;
    });

    it('leaves the defined required modules intact', () => {
      const testArray = [];
      const module = Module.create({requiredModules: testArray});
      expect(module.requiredModules).to.equal(testArray);
    });

    it('sets the correct state', () => {
      const module = new Module();
      expect(module.is('constructed')).to.be.true;
    });
  });
});

describe('Module - #initialize', function() {

  beforeEach(() => {
    // Reset published space modules
    Module.published = {};
    this.injector = new Injector();
    sinon.spy(this.injector, 'injectInto');
    this.module = new Module();
    // faked required modules to spy on
    this.SubModule1 = Module.define('SubModule1');
    this.SubModule2 = Module.define('SubModule2');
    this.app = {modules: {}};
  });

  it('asks the injector to inject dependencies into the module', () => {
    this.module.initialize(this.app, this.injector);
    expect(this.injector.injectInto).to.have.been.calledWith(this.module);
  });

  it('throws an error if no injector is provided', () => {
    const initializeWithoutInjector = () => this.module.initialize();
    expect(initializeWithoutInjector).to.throw(Error);
  });

  it('sets the initialized flag correctly', () => {
    this.module.initialize(this.app, this.injector);
    expect(this.module.is('initialized')).to.be.true;
  });

  xit('server adds Npm as property to the module', () => {
    this.module.initialize(this.app, this.injector);
    expect(this.module.npm.require).to.be.defined;
  });

  it('invokes the onInitialize method on itself', () => {
    this.module.onInitialize = sinon.spy();
    this.module.initialize(this.app, this.injector);
    expect(this.module.onInitialize).to.have.been.calledOnce;
  });

  it('creates required modules and adds them to the app', () => {
    this.module.requiredModules = [this.SubModule1.name, this.SubModule2.name];
    this.module.initialize(this.app, this.injector);
    expect(this.app.modules[this.SubModule1.name]).to.be.instanceof(this.SubModule1);
    expect(this.app.modules[this.SubModule2.name]).to.be.instanceof(this.SubModule2);
  });

  it('initializes required modules', () => {
    sinon.stub(this.SubModule1.prototype, 'initialize');
    this.module.requiredModules = [this.SubModule1.name];
    this.module.initialize(this.app, this.injector);
    expect(this.SubModule1.prototype.initialize).to.have.been.calledOnce;
  });

  it('can only be initialized once', () => {
    this.module.onInitialize = sinon.spy();
    this.module.initialize(this.app, this.injector);
    this.module.initialize(this.app, this.injector);
    expect(this.module.onInitialize).to.have.been.calledOnce;
  });
});

describe('Module - #start', function() {

  beforeEach(() => {
    this.module = new Module();
    this.module.log = {debug: sinon.spy()};
    this.module.start();
    this.module._runLifeCycleAction = sinon.spy();
  });

  it('sets the state to running', () => {
    expect(this.module.is('running')).to.be.true;
  });

  it('ignores start calls on a running module', () => {
    this.module.start();
    expect(this.module._runLifeCycleAction).not.to.have.been.called;
  });
});

describe('Module - #stop', function() {

  beforeEach(() => {
    this.module = new Module();
    this.module.log = {debug: sinon.spy()};
    this.module.start();
    this.module.stop();
    this.module._runLifeCycleAction = sinon.spy();
  });

  it('sets the state to stopped', () => {
    expect(this.module.is('stopped')).to.be.true;
  });

  it('ignores stop calls on a stopped module', () => {
    this.module.stop();
    expect(this.module._runLifeCycleAction).not.to.have.been.called;
  });
});

describe('Module - #reset', function() {

  beforeEach(() => {
    this.module = new Module();
    this.module.log = {debug: sinon.spy()};
    this.module._runLifeCycleAction = sinon.spy();
  });

  xit('rejects attempts to reset when in production', () => {
    const nodeEnvBackup = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    this.module.reset();
    process.env.NODE_ENV = nodeEnvBackup;
    expect(this.module._runLifeCycleAction).not.to.have.been.called;
  });
});

describe("Module - wrappable lifecycle hooks", function() {
  it("allows mixins to hook into the module lifecycle", () => {
    const moduleOnInitializeSpy = sinon.spy();
    const mixinOnInitializeSpy = sinon.spy();
    const MyModule = Module.extend({
      onInitialize: moduleOnInitializeSpy
    });

    MyModule.mixin({
      onDependenciesReady: function() {
        this._wrapLifecycleHook('onInitialize', function(onInitialize) {
          onInitialize.call(this);
          return mixinOnInitializeSpy.call(this);
        });
      }
    });
    const module = new MyModule();
    module.initialize(module, new Injector());

    expect(moduleOnInitializeSpy).to.have.been.calledOnce;
    expect(mixinOnInitializeSpy).to.have.been.calledOnce;
    expect(moduleOnInitializeSpy).to.have.been.calledBefore(mixinOnInitializeSpy);
  });
});
