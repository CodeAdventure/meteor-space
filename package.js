Package.describe({
  summary: 'Modular application architecture for Meteor.',
  name: 'space:base',
  version: '1.2.1',
  git: 'https://github.com/CodeAdventure/meteor-space.git'
});

Package.onUse(function(api) {

  api.versionsFrom("METEOR@1.0");

  api.use([
    'coffeescript',
  ]);

  api.addFiles([
    'source/namespace.coffee',
    'source/class.coffee',
    'source/injector.coffee',
    'source/module.coffee',
    'source/application.coffee'
  ]);

});

Package.onTest(function(api) {

  api.use([
    'coffeescript',
    'space:base',

    // weak-dependencies
    'ejson',
    'accounts-base',
    'email',
    'session',
    'reactive-var',

    'practicalmeteor:munit@2.0.2',
    'space:testing@1.2.1',
  ]);

  api.addFiles([

    // unit tests
    'tests/unit/class.unit.coffee',
    'tests/unit/module.unit.coffee',
    'tests/unit/application.unit.coffee',
    'tests/unit/injector.unit.coffee',

    // integration tests
    'tests/integration/application_with_modules.spec.js',
    'tests/integration/standalone_application.integration.coffee',
  ]);

});
