'use strict';

const mockRequire = require('mock-require');
const should = require('should');
const sinon = require('sinon');
const sandbox = sinon.sandbox.create();
const Catalog = require('../../../lib/consul/catalog');
const Kv = require('../../../lib/consul/kv');

describe('consul', () => {
  var
    Consul,
    consul,
    stubs = {
      rq: sandbox.stub().resolves()
    };

  before(() => {
    mockRequire('request-promise', stubs.rq);
    Consul = require('../../../lib/consul');
  });

  beforeEach(() => {
    consul = new Consul({
      host: 'host',
      port: 'port'
    });
  });

  afterEach(() => {
    // sandbox.restore does actually not restore stubs
    sandbox.fakes.forEach(fake => fake.reset());
  });

  describe('#_send', () => {
    it ('should send what needs to', () => {
      consul.acl = 'acl';

      return consul._send('method', '/uri?foo=bar', 'body')
        .then(() => {
          should(stubs.rq)
            .be.calledOnce()
            .be.calledWithMatch({
              method: 'method',
              uri: 'http://host:port/uri?foo=bar&token=acl',
              json: true,
              body: 'body'
            });

        });
    });
  });

  describe('#_get', () => {
    it('should call _send with GET', () => {
      consul.acl = 'acl';

      return consul._get('/uri')
        .then(() => {
          should(stubs.rq)
            .be.calledOnce()
            .be.calledWithMatch({
              method: 'GET',
              uri: 'http://host:port/uri?token=acl',
              json: true
            });
        });
    });
  });

  describe('#_put', () => {
    beforeEach(() => {
      consul._send = sinon.spy();
    });

    it('should call _send with PUT', () => {
      consul._put('/uri', 'data');

      should(consul._send)
        .be.calledOnce()
        .be.calledWith('PUT', '/uri', 'data');
    });

    it('should set the dc if set globally', () => {
      consul.dc = 'dc';

      consul._put('/uri', {foo: 'bar'});

      should(consul._send)
        .be.calledWithMatch('PUT', '/uri', {
          foo: 'bar',
          Datacenter: 'dc'
        });
    });
  });

  describe('#_delete', () => {
    beforeEach(() => {
      consul._send = sinon.spy();
    });

    it('should call _send with DELETE', () => {
      consul._delete('/uri');

      should(consul._send)
        .be.calledOnce()
        .be.alwaysCalledWith('DELETE', '/uri');
    });
  });

  it('These are just for coverage', () => {
    should(consul.catalog)
      .be.an.instanceOf(Catalog);
    should(consul.kv)
      .be.an.instanceOf(Kv);
  });

});