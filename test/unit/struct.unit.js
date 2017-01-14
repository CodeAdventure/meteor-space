import {MatchError, Integer} from 'simplecheck';
import Struct from '../../lib/struct.js';
import SpaceObject from '../../lib/object.js';

describe('Struct', function() {

  const MyMixin = {
    onConstruction: sinon.spy()
  };

  class MyTestStruct extends Struct {
    fields() {
      return {name: String, age: Integer};
    }
  }
  MyTestStruct.mixin([MyMixin]);

  class MyExtendedTestStruct extends MyTestStruct {
    fields() {
      const fields = super.fields();
      fields.extra = Integer;
      return fields;
    }
  }

  it("is a SpaceObject", () => {
    expect(Struct.prototype).to.be.instanceof(SpaceObject);
  });

  it("calls the super constructor", () => {
    const data = {name: 'Dominik', age: 26};
    const struct = new MyTestStruct(data);
    expect(MyMixin.onConstruction).to.have.been.calledWithExactly(data);
    expect(MyMixin.onConstruction).to.have.been.calledOn(struct);
  });

  describe('defining fields', () => {
    it('assigns the properties to the instance', () => {
      const properties = {name: 'Dominik', age: 26};
      const instance = new MyTestStruct(properties);
      expect(instance).to.be.sameAs(properties);
    });

    it('provides a method to cast to plain object', () => {
      const instance = new MyTestStruct({name: 'Dominik', age: 26});
      const copy = instance.toPlainObject();
      expect(copy.name).to.equal('Dominik');
      expect(copy.age).to.equal(26);
      expect(copy).to.be.an.object;
      expect(copy).not.to.be.instanceof(MyTestStruct);
    });

    it('throws a match error if a property is of wrong type', () => {
      const properties = {name: 5, age: 26};
      expect(() => new MyTestStruct(properties)).to.throw(MatchError);
    });

    it('throws a match error if additional properties are given', () => {
      const properties = {name: 5, age: 26, extra: 0};
      expect(() => new MyTestStruct(properties)).to.throw(MatchError);
    });

    it('throws a match error if a property is missing', () => {
      const properties = {name: 5};
      expect(() => new MyTestStruct(properties)).to.throw(MatchError);
    });

    it('allows to extend the fields of base classes', () => {
      const properties = {name: 'test', age: 26, extra: 0};
      expect(() => new MyExtendedTestStruct(properties)).not.to.throw(MatchError);
    });

    // TODO: remove when breaking change is made for next major version:
    it('stays backward compatible with static fields api', () => {
      class StaticFieldsStruct extends Struct {}
      StaticFieldsStruct.fields = {name: String, age: Integer};

      const properties = {name: 'Dominik', age: 26};
      const instance = new StaticFieldsStruct(properties);
      expect(instance).to.be.sameAs(properties);
      expect(() => new StaticFieldsStruct({name: 5})).to.throw(MatchError);
    });
  });
});
