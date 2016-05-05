Package.describe({
  summary: 'Modular Application Architecture for Meteor.',
  name: 'space:base',
  version: '4.1.3',
  git: 'https://github.com/meteor-space/base.git',
  documentation: 'README.md'
});

Npm.depends({
  "getenv": "0.5.0",
  "winston": "2.1.0"
});

Package.onUse(function(api) {

  api.versionsFrom('1.2.0.1');

  api.use([
    'coffeescript',
    'check',
    'underscore',
    'ecmascript'
  ]);

  api.use([
    'ejson',
    'ddp',
    'random',
    'mongo',
    'tracker',
    'templating',
    'session',
    'blaze',
    'email',
    'accounts-base',
    'reactive-var'
  ], {weak: true});

  api.addFiles([
    'source/lib/underscore_deep_extend_mixin.js',
    'source/namespace.coffee',
    'source/helpers.coffee',
    'source/configuration.js',
    'source/object.coffee',
    'source/logger.js',
    'source/struct.coffee',
    'source/error.js',
    'source/injector.coffee',
    'source/injector_annotations.coffee',
    'source/module.coffee',
    'source/application.coffee'
  ]);

  // Test helpers
  api.addFiles([
    'source/testing/bdd-api.coffee'
  ]);

});

Package.onTest(function(api) {

  api.use([
    'meteor',
    'coffeescript',
    'check',
    'ecmascript',
    'space:base',

    // weak-dependencies
    'ddp',
    'random',
    'underscore',
    'mongo',
    'tracker',
    'templating',
    'ejson',
    'accounts-base',
    'email',
    'session',
    'reactive-var',
    'practicalmeteor:munit@2.1.5',
    'space:testing@3.0.1'
  ]);

  api.addFiles([

    // unit tests
    'tests/unit/object.unit.coffee',
    'tests/unit/module.unit.coffee',
    'tests/unit/struct.unit.coffee',
    'tests/unit/application.unit.coffee',
    'tests/unit/injector.unit.coffee',
    'tests/unit/injector_annotations.unit.es6',
    'tests/unit/helpers.unit.coffee',
    'tests/unit/error.tests.js',
    'tests/unit/logger.tests.js',

    // integration tests
    'tests/integration/application_with_modules.spec.js',
    'tests/integration/standalone_application.integration.coffee',
    'tests/integration/lifecycle_hooks.tests.js',
    'tests/integration/requiring-modules.tests.js',
    'tests/integration/module.regressions.js'
  ]);

});
