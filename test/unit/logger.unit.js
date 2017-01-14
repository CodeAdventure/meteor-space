import Logger from '../../lib/logger.js';
import LoggingAdapter from '../../lib/loggers/adapter.js';
import SpaceObject from '../../lib/object.js';

const TestAdapter = LoggingAdapter.extend('TestAdapter', {
  Constructor(lib) {
    return this.setLibrary(lib);
  }
});

describe("Logger", function() {

  beforeEach(() => {
    this.lib = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warning: sinon.spy(),
      error: sinon.spy()
    };
    this.testAdapter = new TestAdapter(this.lib);
    this.logger = new Logger();
  });

  it('extends SpaceObject', () => {
    expect(Logger.prototype).to.be.instanceof(SpaceObject);
  });

  it("is available of both client and server", () => {
    expect(this.logger).to.be.instanceOf(Logger);
  });

  describe('adapters', () => {
    it('throws error if id does not exists', () => {
      const adapter = new TestAdapter(sinon.spy());
      expect(() => this.logger.addAdapter(undefined, adapter)).to.throw(
        Logger.ERRORS.invalidId
      );
    });

    it('throws error if id is not a string value', () => {
      const adapter = new TestAdapter(sinon.spy());
      expect(() => this.logger.addAdapter(adapter)).to.throw(
        Logger.ERRORS.invalidId
      );
    });

    it('throws error if adapter would be overridden', () => {
      const adapterId = 'testAdapter';
      const adapter = new TestAdapter(sinon.spy());

      this.logger.addAdapter(adapterId, adapter);
      expect(() => this.logger.addAdapter(adapterId, adapter)).to.throw(
        Logger.ERRORS.mappingExists(adapterId)
      );
    });

    it('adds adapter', () => {
      const adapterId = 'testAdapter';
      const adapter = new TestAdapter(sinon.spy());

      this.logger.addAdapter(adapterId, adapter);
      expect(this.logger.getAdapter(adapterId)).to.equal(adapter);
      expect(this.logger.hasAdapter(adapterId)).to.be.true;
    });

    it('allows to override adapter', () => {
      const adapterId = 'testAdapter';
      const adapter = new TestAdapter(sinon.spy());
      const overridingAdapter = new TestAdapter(sinon.spy());

      this.logger.addAdapter(adapterId, adapter);
      expect(() => {
        this.logger.overrideAdapter(adapterId, overridingAdapter);
      }).to.not.throw(Error);
      expect(this.logger.getAdapter(adapterId)).to.equal(overridingAdapter);
    });

    it('resolves adapter by id', () => {
      const consoleAdapter = new TestAdapter(sinon.spy());
      const fileAdapter = new TestAdapter(sinon.spy());

      this.logger.addAdapter('console', consoleAdapter);
      this.logger.addAdapter('file', fileAdapter);
      expect(this.logger.getAdapter('console')).to.equal(consoleAdapter);
      expect(this.logger.getAdapter('file')).to.equal(fileAdapter);
      expect(this.logger.getAdapter('non-existing-adapter')).to.be.null;
    });

    it('removes adapter', () => {
      const adapterId = 'testAdapter';
      const adapter = new TestAdapter(sinon.spy());

      this.logger.addAdapter(adapterId, adapter);
      this.logger.removeAdapter(adapterId);
      expect(this.logger.getAdapter(adapterId)).to.be.null;
      expect(this.logger.hasAdapter(adapterId)).to.be.false;
    });

    it('returns adapters', () => {
      const adapters = {
        console: new TestAdapter(sinon.spy()),
        file: new TestAdapter(sinon.spy())
      };
      this.logger.addAdapter('console', adapters.console);
      this.logger.addAdapter('file',  adapters.file);
      expect(this.logger.getAdapters()).to.be.eql(adapters);
    });
  });

  it("only logs after starting", () => {
    this.logger.addAdapter('my-logger', this.testAdapter);
    const message = 'My log message';

    expect(this.logger.isRunning()).to.be.false;
    expect(this.logger.isStopped()).to.be.true;
    this.logger.info(message);
    expect(this.lib.info).to.not.be.called;

    this.logger.start();
    expect(this.logger.isRunning()).to.be.true;
    expect(this.logger.isStopped()).to.be.false;
    this.logger.info(message);
    expect(this.lib.info).to.be.calledOnce;
    expect(this.lib.info.calledWith(message)).to.be.true;
  });

  it("allows logging output to be stopped", () => {
    this.logger.addAdapter('my-logger', this.testAdapter);
    const message = 'My log message';

    expect(this.logger.isRunning()).to.be.false;
    expect(this.logger.isStopped()).to.be.true;
    this.logger.start();
    expect(this.logger.isRunning()).to.be.true;
    expect(this.logger.isStopped()).to.be.false;
    this.logger.info(message);
    expect(this.lib.info.calledWith(message)).to.be.true;

    this.logger.stop();
    expect(this.logger.isRunning()).to.be.false;
    expect(this.logger.isStopped()).to.be.true;

    this.logger.info(message);
    expect(this.lib.info).to.not.be.calledTwice;
  });

  describe('logging', () => {
    it('allows multiple logging adapters to log same message', () => {
      const firstLib = {debug: sinon.spy()};
      const firstAdapter = new TestAdapter(firstLib);
      const secondLib = {debug: sinon.spy()};
      const secondAdapter = new TestAdapter(secondLib);
      const message = 'My log message';

      this.logger.addAdapter('first', firstAdapter);
      this.logger.addAdapter('second', secondAdapter);
      this.logger.start();

      this.logger.debug(message);
      expect(firstLib.debug.calledWith(message)).to.be.true;
      expect(firstLib.debug).to.be.calledOnce;
      expect(secondLib.debug.calledWith(message)).to.be.true;
      expect(secondLib.debug).to.be.calledOnce;
    });

    describe('logs message as', () => {
      it("debug", () => {
        this.logger.addAdapter('my-logger', this.testAdapter);
        this.logger.start();

        const message = 'My log message';
        this.logger.debug(message);
        expect(this.lib.debug.calledWith(message)).to.be.true;
      });

      it("info", () => {
        this.logger.addAdapter('my-logger', this.testAdapter);
        this.logger.start();

        const message = 'My log message';
        this.logger.info(message);
        expect(this.lib.info.calledWith(message)).to.be.true;
      });

      it("warning", () => {
        this.logger.addAdapter('my-logger', this.testAdapter);
        this.logger.start();

        const message = 'My log message';
        this.logger.warning(message);
        expect(this.lib.warning.calledWith(message)).to.be.true;
      });

      it("error", () => {
        this.logger.addAdapter('my-logger', this.testAdapter);
        this.logger.start();

        const message = 'My log message';
        this.logger.error(message);
        expect(this.lib.error.calledWith(message)).to.be.true;
      });
    });
  });
});
