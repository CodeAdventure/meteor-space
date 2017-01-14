const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
const spaceTesting = require('space-testing');
const chaiExtensions = spaceTesting.chai;

global.expect = chai.expect;
global.sinon = sinon;

chai.use(sinonChai);
for (let key in chaiExtensions) {
  chai.use(chaiExtensions[key]);
}

