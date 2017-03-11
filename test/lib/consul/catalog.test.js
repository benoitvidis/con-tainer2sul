'use strict';

const should = require('should');
const sinon = require('sinon');
const Catalog = require('../../../lib/consul/catalog');

describe('consul/catalog', () => {
  var catalog;

  beforeEach(() => {
    catalog = new Catalog({
      _put: sinon.spy()
    });
  });

  describe('#register', () => {
    it('should call _put on proper route', () => {
      catalog.register('data');

      should(catalog.consul._put)
        .be.calledOnce()
        .be.calledWith('/v1/catalog/register', 'data');
    });
  });

  describe('#deregisterService', () => {
    it('should call _put on proper route', () => {
      catalog.deregister('data');

      should(catalog.consul._put)
        .be.calledOnce()
        .be.calledWith('/v1/catalog/deregister', 'data');
    });
  });
});