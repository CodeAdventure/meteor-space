
describe 'Space.Application', ->

  beforeEach ->
    # Reset published space modules
    Space.Module.published = {}

  it 'extends Space.Module', ->
    expect(Space.Application).to.extend Space.Module

  describe 'construction', ->

    it 'initializes modules map as empty object', ->
      @application = new Space.Application()
      expect(@application.modules).to.eql {}

    it 'creates a new injector instance if none was given', ->
      @application = new Space.Application()
      expect(@application.injector).to.be.instanceof Space.Injector

    it 'uses the provided injector when given', ->
      injector = new Space.Injector()
      @application = new Space.Application injector: injector
      expect(@application.injector).to.equal injector

    it 'can also be created via static create method', ->
      injector = new Space.Injector()
      @application = Space.Application.create injector: injector
      expect(@application.injector).to.equal injector
      expect(Space.Application.create().injector).to.be.instanceof Space.Injector

    it 'maps injector instance with itself', ->
      injector = new Space.Injector()
      injectionMapping =
        to: sinon.spy()
        toInstancesOf: sinon.spy()
      injector.map = sinon.stub().returns injectionMapping
      @application = new Space.Application injector: injector

      expect(injector.map).to.have.been.calledWithExactly 'Injector'
      expect(injectionMapping.to).to.have.been.calledWithExactly injector

    it 'initializes the application', ->
      initializeSpy = sinon.spy Space.Application.prototype, 'initialize'
      @application = new Space.Application()
      expect(initializeSpy).to.have.been.calledOnce
      initializeSpy.restore()

    it 'merges configurations of all modules and user options', ->
      class FirstModule extends Space.Module
        @publish this, 'FirstModule'
        Configuration: {
          first: {
            toChange: 'first'
            toKeep: 'first'
          }
        }
      class SecondModule extends Space.Module
        @publish this, 'SecondModule'
        RequiredModules: ['FirstModule']
        Configuration: {
          second: {
            toChange: 'second'
            toKeep: 'second'
          }
        }
      class TestApp extends Space.Application
        RequiredModules: ['SecondModule']
        Configuration: {
          toChange: 'app'
          toKeep: 'app'
        }
      app = new TestApp Configuration: {
        toChange: 'appPropChanged'
        first: {
          toChange: 'firstChanged'
        }
        second: {
          toChange: 'secondChanged'
        }
      }
      expect(app.injector.get 'Configuration').to.deep.equal {
        toChange: 'appPropChanged'
        toKeep: 'app'
        first: {
          toChange: 'firstChanged'
          toKeep: 'first'
        }
        second: {
          toChange: 'secondChanged'
          toKeep: 'second'
        }
      }

  describe '#start', ->

    it 'Tells all loaded modules to start.', ->
      app = new Space.Application()
      app.RequiredModules = ['module1', 'module2']
      app.modules =
        module1:
          start: sinon.spy()
          afterStarted: sinon.spy()
        module2:
          start: sinon.spy()
          afterStarted: sinon.spy()
      app.start()

      expect(app.modules.module1.start).to.have.been.called
      expect(app.modules.module2.start).to.have.been.called
      expect(app.modules.module1.afterStarted).to.have.been.called
      expect(app.modules.module2.afterStarted).to.have.been.called
