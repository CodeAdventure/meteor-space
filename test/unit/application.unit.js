import Application from '../../lib/application.js';
import Module from '../../lib/module.js';
import {Injector} from '../../lib/injector.js';

describe('Application', function() {

  beforeEach(() => {
    // Reset published space modules
    Module.published = {};
  });

  it('extends Module', () => {
    expect(Application.prototype).to.be.instanceof(Module);
  });

  describe('construction', () => {
    it('initializes modules map as empty object', () => {
      expect(new Application().modules).to.eql({});
    });

    it('creates a new injector instance if none was given', () => {
      expect(new Application().injector).to.be.instanceof(Injector);
    });

    it('uses the provided injector when given', () => {
      const injector = new Injector();
      const application = new Application({injector: injector});
      expect(application.injector).to.equal(injector);
    });

    it('can also be created via static create method', () => {
      const injector = new Injector();
      const application = Application.create({injector: injector});
      expect(application.injector).to.equal(injector);
      expect(Application.create().injector).to.be.instanceof(Injector);
    });

    it('maps injector instance with itself', () => {
      const injector = new Injector();
      const injectionMapping = {
        to: sinon.spy(),
        toInstancesOf: sinon.spy()
      };
      injector.map = sinon.stub().returns(injectionMapping);
      const application = new Application({injector: injector});

      expect(injector.map).to.have.been.calledWithExactly('Injector');
      expect(injectionMapping.to).to.have.been.calledWithExactly(injector);
    });

    it('initializes the application', () => {
      const initializeSpy = sinon.spy(Application.prototype, 'initialize');
      const application = new Application();
      expect(initializeSpy).to.have.been.calledOnce;
      initializeSpy.restore();
    });

    it('can be passed a configuration', () => {
      const application = new Application({
        configuration: {
          environment: 'testing'
        }
      });
      expect(application.configuration.environment).to.equal('testing');
    });

    it('merges configurations of all modules and user options', () => {
      Module.define('GrandchildModule', {
        configuration: {
          subModuleValue: 'grandChild',
          grandchild: {
            toChange: 'grandchildChangeMe',
            toKeep: 'grandchildKeepMe'
          }
        }
      });

      Module.define('ChildModule', {
        requiredModules: ['GrandchildModule'],
        configuration: {
          subModuleValue: 'child',
          child: {
            toChange: 'childChangeMe',
            toKeep: 'childKeepMe'
          }
        }
      });

      Application.extend('TestApp', {
        requiredModules: ['ChildModule'],
        configuration: {
          toChange: 'appChangeMe',
          subModuleValue: 'overriddenByApp'
        }
      });

      const app = new TestApp();
      app.configure({
        toChange: 'appNewValue',
        child: {
          toChange: 'childNewValue'
        },
        grandchild: {
          toChange: 'grandchildNewValue'
        }
      });

      expect(app.injector.get('configuration')).to.be.sameAs({
        toChange: 'appNewValue',
        subModuleValue: 'overriddenByApp',
        child: {
          toChange: 'childNewValue',
          toKeep: 'childKeepMe'
        },
        grandchild: {
          toChange: 'grandchildNewValue',
          toKeep: 'grandchildKeepMe'
        }
      });
    });
  });
});
