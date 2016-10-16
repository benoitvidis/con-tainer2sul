'use strict';

const mockRequire = require('mock-require');
const should = require('should');
const sinon = require('sinon');

describe('con-tainer2sul', () => {
  var C2C;
  var c2c;
  var stubs;

  beforeEach(() => {
    stubs = {
      log: {
        debug: sinon.spy(),
        info: sinon.spy(),
        error: sinon.spy()
      },
      consul: {
        catalog: {
          register: sinon.stub(),
          deregister: sinon.stub()
        },
        kv: {
          keys: sinon.stub(),
          get: sinon.stub(),
          set: sinon.stub(),
          delete: sinon.stub()
        }
      },
      docker: {
        _container: {
          inspect: sinon.stub().resolves()
        },
        client: {},
        events: {
          on: sinon.stub()
        }
      }
    };
    stubs.bunyan = {
      createLogger: sinon.stub().returns(stubs.log)
    };
    stubs.docker.client.getContainer = sinon.stub().returns(stubs.docker._container);
    stubs.Consul = sinon.stub().returns(stubs.consul);
    stubs.Docker = sinon.stub().returns(stubs.docker);

    mockRequire('bunyan', stubs.bunyan);
    mockRequire('../lib/consul', stubs.Consul);
    mockRequire('../lib/docker', stubs.Docker);
    C2C = require('../lib/con-tainer2sul');
    mockRequire.reRequire('../lib/con-tainer2sul');

    c2c = new C2C({
      consul: {
        host: 'consul',
        port: 8500
      },
      docker: {
        socketPath: '/path'
      },
      logger: {
        name: 'test'
      }
    });
  });

  afterEach(() => {
    mockRequire.stopAll();
  });

  describe('#constructor', () => {
    it('should populate the object and attach Docker events', () => {
      should(c2c.config).match({
        consul: {
          host: 'consul',
          port: 8500
        },
        docker: {
          socketPath: '/path'
        }
      });

      should(stubs.Consul)
        .be.calledOnce()
        .be.calledWithMatch({
          host: 'consul',
          port: 8500
        });

      should(stubs.Docker)
        .calledOnce()
        .be.calledWith(c2c);

      should(stubs.docker.events.on)
        .be.calledTwice()
        .be.calledWith('start')
        .be.calledWith('die');
    });

    describe('#events', () => {
      const container = {foo: 'bar'};
      var start;
      var die;

      beforeEach(() => {
        c2c.docker._container.inspect.resolves(container);
        sinon.stub(C2C.prototype, 'registerContainer').resolves();
        sinon.stub(C2C.prototype, 'containerServiceName').returns('service');
        sinon.stub(C2C.prototype, 'deregister').resolves();
        c2c._attachEvents();
        start = c2c.docker.events.on.getCall(2).args[1];
        die = c2c.docker.events.on.getCall(3).args[1];
      });

      it('#start should register the container', () => {
        return start({
          id: 'test'
        })
          .then(() => {
            should(c2c.docker.client.getContainer)
              .be.calledOnce()
              .be.calledWith('test');

            should(c2c.docker._container.inspect)
              .be.calledOnce();

            should(c2c.registerContainer)
              .be.calledOnce()
              .be.calledWithExactly(container);

          });
      });

      it('#start should log the error if something goes wrong', () => {
        let error = new Error('test');

        c2c.docker._container.inspect.rejects(error);

        return start({id: 'test'})
          .then(() => {
            should(1).be.false();
          })
          .catch(err => {
            should(c2c.log.error)
              .be.calledOnce()
              .be.calledWithExactly(err);

            should(err).be.exactly(error);
          });
      });

      it('#die should deregister the container', () => {
        return die({id: 'test'})
          .then(() => {
            should(c2c.docker.client.getContainer)
              .be.calledOnce()
              .be.calledWith('test');

            should(c2c.docker._container.inspect)
              .be.calledOnce();

            should(c2c.containerServiceName)
              .be.calledOnce()
              .be.calledWithExactly(container);

            should(c2c.deregister)
              .be.calledOnce()
              .be.calledWith('service');
          });
      });

      it('#die should log the error if something goes wrong', () => {
        let error = new Error('test');

        c2c.docker._container.inspect.rejects(error);

        return die({id: 'test'})
          .then(() => {
            should(1).be.false();
          })
          .catch(err => {
            should(c2c.log.error)
              .be.calledOnce()
              .be.calledWithExactly(err);

            should(err).be.exactly(error);
          });
      });
    });
  });

  describe('#start', () => {

  });

});