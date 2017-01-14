import _ from 'underscore';
import {ensure} from 'simplecheck';
import {isNil} from 'lodash';
import SpaceObject from './object.js';

class Struct extends SpaceObject {

  constructor(data = {}) {
    super(data);
    this._checkFields(data);
  }

  fields() {
    return _.clone(this.constructor.fields) || {};
  }

  toPlainObject() {
    const copy = {};
    for (let key of Object.keys(this.fields())) {
      if (!isNil(this[key])) {
        copy[key] = this[key];
      }
    }
    return copy;
  }

  //  Use the fields configuration to check given data during runtime
  _checkFields(data) {
    ensure(data, this.fields());
  }
}
Struct.fields = {};
Struct.type('Space.Struct');

export default Struct;
