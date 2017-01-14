import Space from './space.js';
import SpaceObject from './object.js';
import Struct from './struct.js';
import SpaceError from './error.js';
import {Injector, InjectionError} from './injector.js';
import Logger from './logger.js';
import LoggingAdapter from './loggers/adapter.js';
import ConsoleLogger from './loggers/console-adapter.js';
import Module from './module.js';
import Application from './application.js';

Space.Object = SpaceObject;
Space.Struct = Struct;
Space.Error = SpaceError;
Space.Injector = Injector;
Space.InjectionError = InjectionError;
Space.Logger = Logger;
Space.LoggingAdapter = LoggingAdapter;
Space.ConsoleLogger = ConsoleLogger;
Space.Module = Module;
Space.Application = Application;

export {
  SpaceObject as SpaceObject,
  Struct as Struct,
  SpaceError as SpaceError,
  Injector as Injector,
  InjectionError as InjectionError,
  Logger as Logger,
  LoggingAdapter as LoggingAdapter,
  ConsoleLogger as ConsoleLogger,
  Module as Module,
  Application as Application,
  Space as Space
};
