'use strict';

const rewire = require('rewire');
const should = require('should');
const sinon = require('sinon');
const C2C = rewire('../lib/con-tainer2sul');

describe('con-tainer2sul', () => {
  var c2c;
  var reset;

  beforeEach(() => {
    reset = C2C.__set__({
      bunyan: {
        createLogger: sinon.stub().returns({
          debug: sinon.spy(),
          info: sinon.spy(),
          error: sinon.spy()
        })
      },
      Consul: function () {
        this.catalog = {
          register: sinon.stub(),
          deregister: sinon.stub()
        };
        this.kv = {
          keys: sinon.stub(),
          get: sinon.stub(),
          set: sinon.stub(),
          delete: sinon.stub()
        };
      }
    });
    c2c = new C2C();


  });

  afterEach(() => {
    reset();
  });

  describe('#constructor', () => {


  });

});