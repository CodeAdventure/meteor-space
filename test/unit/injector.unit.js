import {Injector} from '../../lib/injector.js';
import SpaceObject from '../../lib/object.js';
import Space from '../../lib/space.js';

describe('Injector', function() {

  beforeEach(() => {
    this.injector = new Injector();
  });

  // ============ MAPPINGS ============

  describe('working with mappings', () => {

    it('injects into requested dependency', () => {
      const myObject = {dependencies: {test: 'test'}};
      const testValue = {};
      this.injector.map('test').to(testValue);
      this.injector.map('myObject').to(myObject);

      expect(this.injector.get('myObject').test).to.equal(testValue);
    });

    it(`throws error if mapping doesn't exist`, () => {
      const id = 'blablub';
      expect(()=> this.injector.get(id)).to.throw(
        this.injector.ERRORS.noMappingFound(id).message
      );
    });

    it('throws error if mapping would be overriden', () => {
      this.injector.map('test').to('test');
      const override = () => this.injector.map('test').to('other');
      expect(override).to.throw(Error);
    });

    it('can remove existing mappings', () => {
      this.injector.map('test').to('test');
      this.injector.remove('test');
      expect(()=> this.injector.get('test')).to.throw(Error);
    });

    it('provides an alias for getting values', () => {
      this.injector.map('test').to('test');
      expect(this.injector.create('test')).to.equal('test');
    });

    it('uses the toString method if its not a string id', () => {
      class TestClass extends SpaceObject {
        static toString() {return 'TestClass';}
      }

      this.injector.map(TestClass).asSingleton();
      expect(this.injector.get('TestClass')).to.be.instanceof(TestClass);
    });

    it('throws error if you try to map undefined', () => {
      expect(()=> this.injector.map(undefined)).to.throw(
        this.injector.ERRORS.cannotMapUndefinedId()
      );
      expect(()=> this.injector.map(null)).to.throw(
        this.injector.ERRORS.cannotMapUndefinedId()
      );
    });
  });

  describe('overriding mappings', () => {
    it('allows to override mappings', () => {
      this.injector.map('test').to('test');
      this.injector.override('test').to('other');
      expect(this.injector.get('test')).to.equal('other');
    });

    it('dynamically updates all dependent objects with the new dependency', () => {
      const myObject = {dependencies: {test: 'test'}};
      const firstValue = {first: true};
      const secondValue = {second: true};
      this.injector.map('test').to(firstValue);
      this.injector.injectInto(myObject);
      expect(myObject.test).to.equal(firstValue);
      this.injector.override('test').to(secondValue);
      expect(myObject.test).to.equal(secondValue);
    });

    it('allows to de-register a dependent object from the mappings', () => {
      const myObject = {
        dependencies: {
          first: 'First',
          second: 'Second'
        }
      };
      const firstValue = { first: true };
      const secondValue = { second: true };
      this.injector.map('First').to(firstValue);
      this.injector.map('Second').to(secondValue);

      this.injector.injectInto(myObject);
      const firstMapping = this.injector.getMappingFor('First');
      const secondMapping = this.injector.getMappingFor('Second');
      expect(firstMapping.hasDependent(myObject)).to.be.true;
      expect(secondMapping.hasDependent(myObject)).to.be.true;
      // Release the reference to the dependent
      this.injector.release(myObject);
      expect(firstMapping.hasDependent(myObject)).to.be.false;
      expect(secondMapping.hasDependent(myObject)).to.be.false;
    });

    it('tells the dependent object when a dependency changed', () => {
      const dependentObject = {
        dependencies: {
          test: 'Test'
        },
        onDependencyChanged: sinon.spy()
      };
      const firstValue = {};
      const secondValue = {};
      this.injector.map('Test').to(firstValue);
      this.injector.injectInto(dependentObject);
      this.injector.override('Test').to(secondValue);

      expect(dependentObject.onDependencyChanged).to.have.been.calledWith(
        'test', secondValue
      );
    });
  });

  // ========== INJECTING DEPENDENCIES =========

  describe('injecting dependencies', () => {

    it('injects static values', () => {
      const value = {};
      this.injector.map('test').to(value);
      const instance = SpaceObject.create({dependencies: {value: 'test'}});
      this.injector.injectInto(instance);
      expect(instance.value).to.equal(value);
    });

    it('injects into provided dependencies', () => {
      const first = {dependencies: {value: 'test'}};
      const second = {dependencies: {first: 'first'}};
      this.injector.map('test').to('value');
      this.injector.map('first').to(first);

      this.injector.injectInto(second);
      expect(second.first).to.equal(first);
      expect(first.value).to.equal('value');
    });

    it('handles inherited dependencies', () => {
      const Base = SpaceObject.extend({dependencies: {base: 'base'}});
      const Extended = Base.extend({dependencies: {extended: 'extended'}});
      this.injector.map('base').to('base');
      this.injector.map('extended').to('extended');

      const instance = new Extended();
      this.injector.injectInto(instance);
      expect(instance.base).to.equal('base');
      expect(instance.extended).to.equal('extended');
    });

    it('never overrides existing properties', () => {
      const instance = SpaceObject.create({
        dependencies: {test: 'test'},
        test: 'value'
      });

      this.injector.map('test').to('test');
      this.injector.injectInto(instance);

      expect(instance.test).to.equal('value');
    });

    describe('when dependencies are ready', () => {

      it('tells the instance that they are ready', () => {
        const value = 'test';
        const instance = SpaceObject.create({
          dependencies: {value: 'value'},
          onDependenciesReady: sinon.spy()
        });

        this.injector.map('value').to('value');
        this.injector.injectInto(instance);
        this.injector.injectInto(instance); // shouldnt trigger twice;

        expect(instance.onDependenciesReady).to.have.been.calledOnce;
      });

      it('tells every single instance exactly once', () => {
        const readySpy = sinon.spy();
        class TestClass extends SpaceObject {
          constructor() {
            super();
            this.dependencies = {value: 'test'};
            this.onDependenciesReady = readySpy;
          }
        }

        this.injector.map('test').to('test');
        this.injector.map('TestClass').toInstancesOf(TestClass);

        const first = this.injector.create('TestClass');
        const second = this.injector.create('TestClass');

        expect(readySpy).to.have.been.calledTwice;
        expect(readySpy).to.have.been.calledOn(first);
        expect(readySpy).to.have.been.calledOn(second);
      });
    });
  });

  // ============ DEFAULT PROVIDERS ============

  describe('default providers', () => {

    describe('static value providers', () => {

      it('maps to static value', () => {
        const value = 'test';
        this.injector.map('first').to(value);
        this.injector.map('second').toStaticValue(value);

        expect(this.injector.get('first')).to.equal(value);
        expect(this.injector.get('second')).to.equal(value);
      });

      it('supports Space namespace lookup', () => {
        Space.__test__ = {TestClass: SpaceObject.extend()};
        const path = 'Space.__test__.TestClass';
        this.injector.map(path).asStaticValue();

        expect(this.injector.get(path)).to.equal(Space.__test__.TestClass);
        delete Space.__test__;
      });

      it('can uses static toString method if available', () => {
        class Test {
          static toString() {return 'Test';}
        }

        this.injector.map(Test).asStaticValue();
        expect(this.injector.get('Test')).to.equal(Test);
      });
    });

    describe('instance provider', () => {

      it('creates new instances for each request', () => {
        class Test {}
        this.injector.map('Test').toClass(Test);

        const first = this.injector.get('Test');
        const second = this.injector.get('Test');

        expect(first).to.be.instanceof(Test);
        expect(second).to.be.instanceof(Test);
        expect(first).not.to.equal(second);
      });
    });

    describe('singleton provider', () => {

      it('maps class as singleton', () => {
        class Test {
          static toString() {return 'Test';}
        }
        this.injector.map(Test).asSingleton();
        const first = this.injector.get('Test');
        const second = this.injector.get('Test');

        expect(first).to.be.instanceof(Test);
        expect(first).to.equal(second);
      });

      it('maps id to singleton of class', () => {
        class Test {}
        this.injector.map('Test').toSingleton(Test);
        const first = this.injector.get('Test');
        const second = this.injector.get('Test');

        expect(first).to.be.instanceof(Test);
        expect(first).to.equal(second);
      });

      it('looks up the value on Space namespace if only a path is given', () => {
        Space.__test__ = {TestClass: SpaceObject.extend()};
        this.injector.map('Space.__test__.TestClass').asSingleton();

        const first = this.injector.get('Space.__test__.TestClass');
        const second = this.injector.get('Space.__test__.TestClass');

        expect(first).to.be.instanceof(Space.__test__.TestClass);
        expect(first).to.equal(second);
        delete Space.__test__;
      });
    });
  });

  // ============ CUSTOM PROVIDERS ============

  describe('adding custom providers', () => {
    it('adds the provider to the api', () => {
      const loremIpsum = 'lorem ipsum';

      this.injector.addProvider('toLoremIpsum', SpaceObject.extend({
        Constructor: function() {
          this.provide = function() {
            return loremIpsum;
          };
        }
      }));
      this.injector.map('test').toLoremIpsum();
      expect(this.injector.get('test')).to.equal(loremIpsum);
    });
  });
});
