'use strict';

const should = require('should');
const sinon = require('sinon');
const Kv = require('../../../lib/consul/kv');

describe('consul/kv', () => {
  var
    kv;

  beforeEach(() => {
    kv = new Kv({
      _delete: sinon.spy(),
      _get: sinon.spy(),
      _put: sinon.spy()
    });
  });

  describe('#keys', () => {
    it('should call _get on proper route', () => {
      kv.keys('prefix');

      should(kv.consul._get)
        .be.calledOnce()
        .be.calledWith('/v1/kv/prefix?keys');
    });
  });

  describe('#set', () => {
    it('should call _put on proper route', () => {
      kv.set('key', 'val');

      should(kv.consul._put)
        .be.calledOnce()
        .be.calledWith('/v1/kv/key', 'val');
    });
  });

  describe('#get', () => {
    it('should call _get on proper route', () => {
      kv.get('key');

      should(kv.consul._get)
        .be.calledOnce()
        .be.calledWith('/v1/kv/key?raw');
    });
  });

  describe('#delete', () => {
    it('shoudl call _delete on proper route', () => {
      kv.delete('key');

      should(kv.consul._delete)
        .be.calledOnce()
        .be.calledWith('/v1/kv/key');
    });
  });

});