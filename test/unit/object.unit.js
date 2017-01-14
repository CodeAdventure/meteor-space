import SpaceObject from '../../lib/object.js';
import Space from '../../lib/space.js';

describe('SpaceObject', function() {

  beforeEach(() => {
    this.namespace = {};
  });

  describe('extending', () => {

    it('creates and returns a subclass', () => {
      SpaceObject.extend(this.namespace, 'MyClass');
      expect(this.namespace.MyClass).to.extend(SpaceObject);
    });

    it('applies the arguments to the super constructor', () => {
      const first = 'first';
      const second = 2;
      const third = {};
      const spy = sinon.spy();
      SpaceObject.extend(this.namespace, 'Base', {
        Constructor() {spy.apply(this, arguments);}
      });
      this.namespace.Base.extend(this.namespace, 'Extended');
      const instance = new this.namespace.Extended(first, second, third);
      expect(spy).to.have.been.calledWithExactly(first, second, third);
      expect(spy).to.have.been.calledOn(instance);
    });

    it('allows to extend the prototype', () => {
      const First = SpaceObject.extend({
        first: 1,
        get: function(property) {
          return this[property];
        }
      });

      const Second = First.extend({
        second: 2,
        get: function() {
          return First.prototype.get.apply(this, arguments);
        }
      });

      class Third extends Second {
        get(property) {
          return super.get(property);
        }
      }

      const instance = new Third();
      expect(instance.get('first')).to.equal(1);
      expect(instance.get('second')).to.equal(2);
    });

    describe("providing fully qualified class path", () => {

      it("registers the class for internal lookup", () => {
        Space.namespace('My.custom');
        const FirstClass = SpaceObject.extend('My.custom.FirstClass', {});
        const SecondClass = SpaceObject.extend('My.custom.SecondClass', {});
        expect(Space.resolvePath('My.custom.FirstClass')).to.equal(FirstClass);
        expect(Space.resolvePath('My.custom.SecondClass')).to.equal(SecondClass);
      });

      it("assigns the class path", () => {
        const className = 'My.custom.Class';
        const MyClass = SpaceObject.extend(className);
        expect(MyClass.toString()).to.equal(className);
        expect(new MyClass().toString()).to.equal(className);
      });

      it("exposes the class on the global scope if possible", () => {
        const my = {};
        my.namespace = Space.namespace('my.namespace');
        const MyClass = SpaceObject.extend('my.namespace.MyClass');
        expect(my.namespace.MyClass).to.equal(MyClass);
      });

      it("works correctly without nested namespaces", () => {
        const MyClass = SpaceObject.extend('MyClass');
        expect(Space.resolvePath('MyClass')).to.equal(MyClass);
      });
    });

    describe("working with static class properties", () => {

      it('allows you to define static class properties', () => {
        const myStatics = {};
        const MyClass = SpaceObject.extend({statics: {myStatics: myStatics}});
        expect(MyClass.myStatics).to.equal(myStatics);
      });

      it('provides an api for defining a callback while extending', () => {
        const onExtendingSpy = sinon.spy();
        const MyClass = SpaceObject.extend({onExtending: onExtendingSpy});
        expect(onExtendingSpy).to.have.been.calledOn(MyClass);
      });
    });
  });

  describe('creating instances', () => {
    it('creates a new instance of given class', () => {
      expect(SpaceObject.create()).to.be.instanceof(SpaceObject);
    });

    it('allows to initialize the instance with given properties', () => {
      const instance = SpaceObject.create({
        first: 1,
        get(property) {return this[property];}
      });
      expect(instance.get('first')).to.equal(1);
    });

    it('forwards any number of arguments to the constructor', () => {
      const Base = SpaceObject.extend({
        Constructor: function(first, second) {
          this.first = first;
          this.second = second;
        }
      });
      const instance = Base.create(1, 2);
      expect(instance.first).to.equal(1);
      expect(instance.second).to.equal(2);
    });
  });

  describe("inheritance helpers", () => {
    const Base = SpaceObject.extend({
      statics: {
        prop: 'static',
        method: function() {}
      },
      prop: 'prototype',
      method: function() {}
    });
    const Sub = Base.extend();
    const GrandSub = Sub.extend();

    describe("static", () => {

      it("can tell if there is a super class", () => {
        expect(Sub.hasSuperClass()).to.be.true;
      });

      it("can return the super class", () => {
        expect(Sub.superClass()).to.equal(Base);
      });

      it("returns undefined if there is no super class", () => {
        expect(SpaceObject.superClass()).to.equal(undefined);
      });

      it("can return a static prop or method of the super class", () => {
        expect(Sub.superClass('prop')).to.equal(Base.prop);
        expect(Sub.superClass('method')).to.equal(Base.method);
      });

      it("can give back a flat array of sub classes", () => {
        expect(Base.subClasses()).to.eql([Sub, GrandSub]);
        expect(Sub.subClasses()).to.eql([GrandSub]);
        expect(GrandSub.subClasses()).to.eql([]);
      });
    });

    describe("prototype", () => {
      it("can tell if there is a super class", () => {
        expect(new Sub().hasSuperClass()).to.be.true;
      });

      it("can return the super class", () => {
        expect(new Sub().superClass()).to.equal(Base);
      });

      it("can return a static prop or method of the super class", () => {
        expect(new Sub().superClass('prop')).to.equal(Base.prototype.prop);
        expect(new Sub().superClass('method')).to.equal(Base.prototype.method);
      });
    });
  });

  describe('mixins', () => {

    it('adds methods to the prototype', () => {
      const testMixin = {
        test() {}
      };
      const TestClass = SpaceObject.extend();
      TestClass.mixin(testMixin);
      expect(TestClass.prototype.test).to.equal(testMixin.test);
    });

    it('overrides existing methods of the prototype', () => {
      const testMixin = {
        test: function() {}
      };
      const TestClass = SpaceObject.extend({
        test: function() {}
      });
      TestClass.mixin(testMixin);
      expect(TestClass.prototype.test).to.equal(testMixin.test);
    });

    it('merges object properties', () => {
      const testMixin = {
        dependencies: {
          second: 'second'
        }
      };

      const TestClass = SpaceObject.extend({
        dependencies: {
          first: 'first'
        }
      });
      TestClass.mixin(testMixin);
      expect(TestClass.prototype.dependencies.first).to.equal('first');
      expect(TestClass.prototype.dependencies.second).to.equal('second');
    });

    it("does not modify other mixins when merging properties", () => {
      const FirstMixin = {
        dependencies: {
          firstMixin: 'onExtending'
        }
      };
      const FirstClass = SpaceObject.extend({
        mixin: [FirstMixin],
        dependencies: {
          first: 'first'
        }
      });
      FirstClass.mixin({
        dependencies: {
          firstMixin: 'afterExtending'
        }
      });
      expect(FirstMixin).to.be.sameAs({dependencies: {firstMixin: 'onExtending'}});
      expect(FirstClass.prototype.dependencies).to.be.sameAs({
        first: 'first',
        firstMixin: 'afterExtending'
      });
    });

    it("can provide a hook that is called when the mixin is applied", () => {
      const myMixin = {onMixinApplied: sinon.spy()};
      const TestClass = SpaceObject.extend();
      TestClass.mixin(myMixin);
      expect(myMixin.onMixinApplied).to.have.been.calledOnce;
    });

    it('can be defined as prototype property when extending classes', () => {
      const myMixin = { onMixinApplied: sinon.spy() };
      const MyClass = SpaceObject.extend({mixin: [myMixin]});
      expect(myMixin.onMixinApplied).to.have.been.calledOn(MyClass);
    });

    it('can be used to mixin static properties on to the class', () => {
      const myMixin = {statics: { myMethod: sinon.spy() }};
      const MyClass = SpaceObject.extend({mixin: [myMixin]});
      MyClass.myMethod();
      expect(myMixin.statics.myMethod).to.have.been.calledOn(MyClass);
    });

    it('can be checked which mixins a class has', () => {
      const FirstMixin = {};
      const SecondMixin = {};
      const ThirdMixin = {};

      const MyClass = SpaceObject.extend({mixin: FirstMixin});
      MyClass.mixin(SecondMixin);
      const instance = new MyClass();
      // Static checks
      expect(MyClass.hasMixin(FirstMixin)).to.be.true;
      expect(MyClass.hasMixin(SecondMixin)).to.be.true;
      expect(MyClass.hasMixin(ThirdMixin)).to.be.false;
      // Instance checks
      expect(instance.hasMixin(FirstMixin)).to.be.true;
      expect(instance.hasMixin(SecondMixin)).to.be.true;
      expect(instance.hasMixin(ThirdMixin)).to.be.false;
    });

    describe("mixin inheritance", () => {

      it("does not apply mixins to super classes", () => {
        const firstMixin = {};
        const secondMixin = {};
        const SuperClass = SpaceObject.extend({mixin: firstMixin});
        const SubClass = SuperClass.extend({mixin: secondMixin});
        expect(SuperClass.hasMixin(firstMixin)).to.be.true;
        expect(SuperClass.hasMixin(secondMixin)).to.be.false;
        expect(SubClass.hasMixin(firstMixin)).to.be.true;
        expect(SubClass.hasMixin(secondMixin)).to.be.true;
      });

      it("inherits mixins to children when added to base class later on", () => {
        const LateMixin = { statics: { test: 'property' } };
        // Base class with a mixin
        const BaseClass = SpaceObject.extend();
        // Sublcass with its own mixin
        const SubClass = BaseClass.extend();
        // Later we extend base class
        BaseClass.mixin(LateMixin);
        // Sub class should have all three mixins correctly applied
        expect(SubClass.hasMixin(LateMixin)).to.be.true;
        expect(SubClass.test).to.equal(LateMixin.statics.test);
      });
    });

    describe("onDependenciesReady hooks", () => {

      it("can provide a hook that is called when dependencies of host class are ready", () => {
        const myMixin = {onDependenciesReady: sinon.spy()};
        const TestClass = SpaceObject.extend();
        TestClass.mixin(myMixin);
        new TestClass().onDependenciesReady();
        expect(myMixin.onDependenciesReady).to.have.been.calledOnce;
      });

      it("inherits the onDependenciesReady hooks to sub classes", () => {
        const firstMixin = {onDependenciesReady: sinon.spy()};
        const secondMixin = {onDependenciesReady: sinon.spy()};
        const SuperClass = SpaceObject.extend();
        SuperClass.mixin(firstMixin);
        const SubClass = SuperClass.extend();
        SubClass.mixin(secondMixin);
        new SubClass().onDependenciesReady();
        expect(firstMixin.onDependenciesReady).to.have.been.calledOnce;
        expect(secondMixin.onDependenciesReady).to.have.been.calledOnce;
      });

      it("calls inherited mixin hooks only once per chain", () => {
        const myMixin = {onDependenciesReady: sinon.spy()};
        const SuperClass = SpaceObject.extend();
        SuperClass.mixin(myMixin);
        const SubClass = SuperClass.extend();
        new SubClass().onDependenciesReady();
        expect(myMixin.onDependenciesReady).to.have.been.calledOnce;
      });
    });

    describe("construction hooks", () => {

      it("can provide a hook that is called on construction of host class", () => {
        const myMixin = {onConstruction: sinon.spy()};
        const TestClass = SpaceObject.extend();
        TestClass.mixin(myMixin);
        const first = {};
        const second = {};
        new TestClass(first, second);
        expect(myMixin.onConstruction).to.have.been.calledWithExactly(first, second);
      });
    });
  });
});
