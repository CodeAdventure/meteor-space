import SpaceError from '../../lib/error.js';

describe("SpaceError", function() {

  const MyError = SpaceError.extend('MyError', {
    message: 'The default message for this error'
  });

  it("is an instance of error", function() {
    expect(new MyError()).to.be.instanceof(Error);
  });

  it("has same behavior as Space.Struct", function() {
    const data = { message: 'test', code: 123 };
    const error = new MyError(data);
    expect(error).to.be.instanceof(Error);
    expect(error).to.be.instanceof(MyError);
    expect(error.name).to.equal('MyError');
    expect(error.message).to.equal(data.message);
    expect(error.code).to.equal(data.code);
  });

  it("is easy to add additional fields", function() {
    MyError.fields = { customField: String };
    const data = { message: 'test', code: 123, customField: 'test' };
    const error = new MyError(data);
    expect(error.customField).to.equal('test');
    MyError.fields = {};
  });

  it("throws the prototype message by default", function() {
    const throwWithDefaultMessage = function() {
      throw new MyError();
    };
    expect(throwWithDefaultMessage).to.throw(MyError.prototype.message);
  });

  it("takes an optional message during construction", function() {
    const myMessage = 'this is a custom message';
    const throwWithCustomMessage = function() {
      throw new MyError(myMessage);
    };
    expect(throwWithCustomMessage).to.throw(myMessage);
  });

  it("includes a stack trace", function() {
    const error = new MyError();
    expect(error.stack).to.be.a.string;
  });

  describe("applying mixins", function() {

    it("supports mixin callbacks", function() {
      const MyMixin = {
        onConstruction: sinon.spy(),
        onDependenciesReady: sinon.spy()
      };
      const MyMixinError = SpaceError.extend('MyMixinError', { mixin: MyMixin });
      const param = 'test';
      const error = new MyMixinError(param);
      expect(MyMixin.onConstruction).to.have.been.calledOn(error);
      expect(MyMixin.onConstruction).to.have.been.calledWithExactly(param);
    });

  });

});
