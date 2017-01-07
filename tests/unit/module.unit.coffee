
describe 'Space.Module', ->

  beforeEach ->
    # Reset published space modules
    Space.Module.published = {}

  it 'extends space object', -> expect(Space.Module).to.extend Space.Object

  describe '@publish', ->

    it 'adds given module to the static collection of published modules', ->
      module = Space.Module.define 'test'
      expect(Space.Module.published['test']).to.equal module

    it 'throws an error if two modules try to publish under same name', ->
      publishTwoModulesWithSameName = ->
        Space.Module.define 'test'
        Space.Module.define 'test'
      expect(publishTwoModulesWithSameName).to.throw Error

  describe '@require', ->

    it 'returns published module for given identifier', ->
      module = Space.Module.define 'test'
      requiredModule = Space.Module.require 'test'
      expect(requiredModule).to.equal module

    it 'throws and error if no module was registered for given identifier', ->
      requireUnkownModule = -> Space.Module.require 'unknown module'
      expect(requireUnkownModule).to.throw Error

  describe 'constructor', ->

    it 'sets required modules to empty array if none defined', ->
      module = new Space.Module()
      expect(module.requiredModules).to.be.instanceof Array
      expect(module.requiredModules).to.be.empty

    it 'leaves the defined required modules intact', ->
      testArray = []
      module = Space.Module.create requiredModules: testArray
      expect(module.requiredModules).to.equal testArray

    it 'sets the correct state', ->
      module = new Space.Module()
      expect(module.is 'constructed').to.be.true


describe 'Space.Module - #initialize', ->

  beforeEach ->
    # Reset published space modules
    Space.Module.published = {}
    @injector = new Space.Injector()
    sinon.spy @injector, 'injectInto'
    @module = new Space.Module()
    # faked required modules to spy on
    @SubModule1 = Space.Module.define 'SubModule1'
    @SubModule2 = Space.Module.define 'SubModule2'
    @app = modules: {}

  it 'asks the injector to inject dependencies into the module', ->
    @module.initialize @app, @injector
    expect(@injector.injectInto).to.have.been.calledWith @module

  it 'throws an error if no injector is provided', ->
    initializeWithoutInjector = => @module.initialize()
    expect(initializeWithoutInjector).to.throw Error

  it 'sets the initialized flag correctly', ->
    @module.initialize @app, @injector
    expect(@module.is 'initialized').to.be.true

  it.server 'adds Npm as property to the module', ->
    @module.initialize @app, @injector
    expect(@module.npm.require).to.be.defined

  it 'invokes the onInitialize method on itself', ->
    @module.onInitialize = sinon.spy()
    @module.initialize @app, @injector
    expect(@module.onInitialize).to.have.been.calledOnce

  it 'creates required modules and adds them to the app', ->
    @module.requiredModules = [@SubModule1.name, @SubModule2.name]
    @module.initialize @app, @injector
    expect(@app.modules[@SubModule1.name]).to.be.instanceof(@SubModule1)
    expect(@app.modules[@SubModule2.name]).to.be.instanceof(@SubModule2)

  it 'initializes required modules', ->
    sinon.stub @SubModule1.prototype, 'initialize'
    @module.requiredModules = [@SubModule1.name]
    @module.initialize @app, @injector
    expect(@SubModule1.prototype.initialize).to.have.been.calledOnce

  it 'can only be initialized once', ->
    @module.onInitialize = sinon.spy()
    @module.initialize @app, @injector
    @module.initialize @app, @injector
    expect(@module.onInitialize).to.have.been.calledOnce

describe 'Space.Module - #start', ->

  beforeEach ->
    @module = new Space.Module()
    @module.log = {debug: sinon.spy()}
    @module.start()
    @module._runLifeCycleAction = sinon.spy()

  it 'sets the state to running', ->
    expect(@module.is 'running').to.be.true

  it 'ignores start calls on a running module', ->
    @module.start()
    expect(@module._runLifeCycleAction).not.to.have.been.called

describe 'Space.Module - #stop', ->

  beforeEach ->
    @module = new Space.Module()
    @module.log = {debug: sinon.spy()}
    @module.start()
    @module.stop()
    @module._runLifeCycleAction = sinon.spy()

  it 'sets the state to stopped', ->
    expect(@module.is 'stopped').to.be.true

  it 'ignores stop calls on a stopped module', ->
    @module.stop()
    expect(@module._runLifeCycleAction).not.to.have.been.called

describe 'Space.Module - #reset', ->

  beforeEach ->
    @module = new Space.Module()
    @module.log = {debug: sinon.spy()}
    @module._runLifeCycleAction = sinon.spy()

  it.server 'rejects attempts to reset when in production', ->
    nodeEnvBackup = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    @module.reset()
    process.env.NODE_ENV = nodeEnvBackup
    expect(@module._runLifeCycleAction).not.to.have.been.called

describe "Space.Module - wrappable lifecycle hooks", ->

  it "allows mixins to hook into the module lifecycle", ->
    moduleOnInitializeSpy = sinon.spy()
    mixinOnInitializeSpy = sinon.spy()
    MyModule = Space.Module.extend {
      onInitialize: moduleOnInitializeSpy
    }
    MyModule.mixin {
      onDependenciesReady: ->
        @_wrapLifecycleHook 'onInitialize', (onInitialize) ->
          onInitialize.call(this)
          mixinOnInitializeSpy.call(this)
    }
    module = new MyModule()
    module.initialize(module, new Space.Injector())

    expect(moduleOnInitializeSpy).to.have.been.calledOnce
    expect(mixinOnInitializeSpy).to.have.been.calledOnce
    expect(moduleOnInitializeSpy).to.have.been.calledBefore(mixinOnInitializeSpy)
