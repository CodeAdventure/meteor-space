import {isNil} from 'lodash';
import Module from '../module.js';
import Application from '../application.js';

const registeredBddApis = [];

Module.registerBddApi = api => registeredBddApis.push(api);

Module.test = Application.test = function(systemUnderTest, app = null) {
  if (sisNil(ystemUnderTest)) {
    throw new Error('Cannot test <undefined>');
  }
  let testApi = null;
  const isModule = isSubclassOf(this, Module);
  const isApplication = isSubclassOf(this, Application);

  // BDD API relies on dependency injection provided by Application
  if (isNil(app)) {
    if (isApplication) {
      app = new this();
    } else {
      app = new (Application.define('TestApp', {
        configuration: {
          appId: 'testApp'
        },
        requiredModules: [this.publishedAs]
      }));
    }
  }
  for (let api of registeredBddApis) {
    returnValue = api(app, systemUnderTest);
    if (!isNil(returnValue)) {
      testApi = returnValue;
    }
  }
  if (isNil(testApi)) {
    throw new Error(`No testing API found for ${systemUnderTest}`);
  }
  return testApi;
};
