
class Space.Module extends Space.Object

  ERRORS: {
    injectorMissing: 'Instance of Space.Injector needed to initialize module.'
  }

  configuration: {}
  requiredModules: null
  # An array of paths to classes that you want to become
  # singletons in your application e.g: ['Space.messaging.EventBus']
  # these are automatically mapped and created on `app.run()`
  singletons: []
  injector: null
  _state: 'constructed'

  constructor: ->
    super
    @requiredModules ?= []

  initialize: (@app, @injector, isSubModule=false) ->
    return if not @is('constructed') # only initialize once
    if not @injector? then throw new Error @ERRORS.injectorMissing

    @_state = 'configuring'
    unless isSubModule
      @log = @_setupLogger()
    else
      @log = @injector.get('log')
    @log.debug("#{@constructor.publishedAs}: initialize")

    # Setup basic mappings required by all modules if this the top-level module
    unless isSubModule
      @injector.map('Injector').to @injector
      @_mapSpaceServices()
      @_mapMeteorApis()

    # Setup required modules
    for moduleId in @requiredModules
      # Create a new module instance if not already registered with the app
      unless @app.modules[moduleId]?
        moduleClass = Space.Module.require(moduleId, this.constructor.name)
        @app.modules[moduleId] = new moduleClass()
        # Initialize required module
        module = @app.modules[moduleId]
        module.initialize(@app, @injector, true)

    # Merge in own configuration to give the chance for overwriting.
    if isSubModule
      _.deepExtend(@app.configuration, @configuration)
      @configuration = @app.configuration
    else
      # The app can override all other modules
      _.deepExtend(@configuration, @constructor.prototype.configuration)

    # Provide lifecycle hook before any initialization has been done
    @beforeInitialize?()
    # Give every module access Npm
    if Meteor.isServer then @npm = Npm
    # Top-level module
    if not isSubModule
      @injector.map('configuration').to(@configuration)
      @_runOnInitializeHooks()
      @_autoMapSingletons()
      @_autoCreateSingletons()
      @_runAfterInitializeHooks()

  start: ->
    if @is('running') then return
    @_runLifeCycleAction 'start'
    @_state = 'running'

  reset: ->
    return if Meteor.isServer and process.env.NODE_ENV is 'production'
    return if @_isResetting
    restartRequired = @is('running')
    @_isResetting = true
    if restartRequired then @stop()
    @_runLifeCycleAction 'reset'
    if restartRequired then @start()
    # There is no other way to avoid reset being called multiple times
    # if multiple modules require the same sub-module.
    Meteor.defer => @_isResetting = false

  stop: ->
    if @is('stopped') then return
    @_runLifeCycleAction 'stop', =>
    @_state = 'stopped'

  is: (expectedState) -> expectedState is @_state

  # ========== STATIC MODULE MANAGEMENT ============ #

  @define: (moduleName, prototype={}) ->
    prototype.toString = -> moduleName # For better debugging
    @publish Space.Module.extend(moduleName, prototype), moduleName

  # All published modules register themselves here
  @published = {}

  # Publishes a module into the space environment to make it
  # visible and requireable for other modules and the application
  @publish: (module, identifier) ->
    module.publishedAs = module.name = identifier
    if Space.Module.published[identifier]?
      throw new Error "Two modules tried to be published as <#{identifier}>"
    else
      Space.Module.published[identifier] = module

  # Retrieve a module by identifier
  @require: (requiredModule, requestingModule) ->
    module = Space.Module.published[requiredModule]
    if not module?
      throw new Error "Could not find module <#{requiredModule}>
                      required by <#{requestingModule}>"
    else
      return module

  # Invokes the lifecycle action on all required modules, then on itself,
  # calling the instance hooks before, on, and after
  _runLifeCycleAction: (action, func) ->
    @_invokeActionOnRequiredModules action
    @log.debug("#{@constructor.publishedAs}: #{action}")
    this["before#{Space.capitalizeString(action)}"]?()
    func?()
    this["on#{Space.capitalizeString(action)}"]?()
    this["after#{Space.capitalizeString(action)}"]?()

  # Provide lifecycle hook after this module was configured and injected
  _runOnInitializeHooks: ->
    @_invokeActionOnRequiredModules '_runOnInitializeHooks'
    # Never run this hook twice
    if @is('configuring')
      @log.debug("#{@constructor.publishedAs}: onInitialize")
      @_state = 'initializing'
      # Inject required dependencies into this module
      @injector.injectInto this
      # Call custom lifecycle hook if existant
      @onInitialize?()

  _autoMapSingletons: ->
    @_invokeActionOnRequiredModules '_autoMapSingletons'
    if @is('initializing')
      @log.debug("#{@constructor.publishedAs}: _autoMapSingletons")
      @_state = 'auto-mapping-singletons'
      # Map classes that are declared as singletons
      @injector.map(singleton).asSingleton() for singleton in @singletons

  _autoCreateSingletons: ->
    @_invokeActionOnRequiredModules '_autoCreateSingletons'
    if @is('auto-mapping-singletons')
      @log.debug("#{@constructor.publishedAs}: _autoCreateSingletons")
      @_state = 'auto-creating-singletons'
      # Create singleton classes
      @injector.create(singleton) for singleton in @singletons

  # After all modules in the tree have been configured etc. invoke last hook
  _runAfterInitializeHooks: ->
    @_invokeActionOnRequiredModules '_runAfterInitializeHooks'
    # Never run this hook twice
    if @is('auto-creating-singletons')
      @log.debug("#{@constructor.publishedAs}: afterInitialize")
      @_state = 'initialized'
      # Call custom lifecycle hook if existant
      @afterInitialize?()

  _invokeActionOnRequiredModules: (action) ->
    @app.modules[moduleId][action]?() for moduleId in @requiredModules

  _wrapLifecycleHook: (hook, wrapper) ->
    this[hook] ?= ->
    this[hook] = _.wrap(this[hook], wrapper)

  _setupLogger: ->
    config = @_loggingConfig(@configuration)
    logger = new Space.Logger()
    logger.start() if config.enabled == true
    return logger

  _loggingConfig: () ->
    config = {}
    _.deepExtend(config, @configuration)
    _.deepExtend(config, @constructor.prototype.configuration)
    return config.log or {}

  _mapSpaceServices: ->
    @injector.map('log').to @log

  _mapMeteorApis: ->
    @log.debug("#{@constructor.publishedAs}: _mapMeteorApis")
   # Map Meteor standard packages
    @injector.map('Meteor').to Meteor
    if Package.ejson?
      @injector.map('EJSON').to Package.ejson.EJSON
    if Package.ddp?
      @injector.map('DDP').to Package.ddp.DDP
    if Package.random?
      @injector.map('Random').to Package.random.Random
    @injector.map('underscore').to Package.underscore._
    if Package.mongo?
      @injector.map('Mongo').to Package.mongo.Mongo
      if Meteor.isServer
        @injector.map('MongoInternals').to Package.mongo.MongoInternals

    if Meteor.isClient
      if Package.tracker?
        @injector.map('Tracker').to Package.tracker.Tracker
      if Package.templating?
        @injector.map('Template').to Package.templating.Template
      if Package.session?
        @injector.map('Session').to Package.session.Session
      if Package.blaze?
        @injector.map('Blaze').to Package.blaze.Blaze

    if Meteor.isServer
      @injector.map('check').to check
      @injector.map('Match').to Match
      @injector.map('process').to process
      @injector.map('Future').to Npm.require 'fibers/future'

      if Package.email?
        @injector.map('Email').to Package.email.Email

    if Package['accounts-base']?
      @injector.map('Accounts').to Package['accounts-base'].Accounts

    if Package['reactive-var']?
      @injector.map('ReactiveVar').to Package['reactive-var'].ReactiveVar
