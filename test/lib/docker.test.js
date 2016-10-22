'use strict';

const mockRequire = require('mock-require');
const should = require('should');
const sinon = require('sinon');

describe('docker', () => {
  var
    clock,
    Docker,
    docker,
    stubs;

  before(() => {
    clock = sinon.useFakeTimers();

  });

  after(() => {
    clock.restore();
  });

  beforeEach(() => {
    stubs = {
      client: {
        listContainers: sinon.stub().resolves(),
        listNetworks: sinon.stub().resolves([{
          Name: 'bridge',
          IPAM: {
            Config: [{
              Gateway: 'docker0 from docker'
            }]
          }
        }])
      },
      events: {
        on: sinon.stub(),
        start: sinon.stub()
      },
      c2c: {
        config: {
          docker: {
            connectTimeout: 5000,
            foo: 'bar'
          }
        },
        log: {
          error: sinon.spy(),
          info: sinon.spy(),
          warn: sinon.spy()
        }
      },
      dockerode: sinon.stub(),
      dockerodePromise: sinon.stub(),
      dockerEvents: sinon.stub(),
    };
    stubs.dockerodePromise = sinon.stub().returns(stubs.client);
    stubs.dockerEvents = sinon.stub().returns(stubs.events);

    mockRequire('dockerode', stubs.dockerode);
    mockRequire('dockerode-promise', stubs.dockerodePromise);
    mockRequire('docker-events', stubs.dockerEvents);
    Docker = require('../../lib/docker');
    mockRequire.reRequire('../../lib/docker');

    docker = new Docker(stubs.c2c);
  });

  describe('#constructor', () => {
    it('should construct a proper object', () => {
      should(docker.c2c).be.exactly(stubs.c2c);
      should(docker.docker0).be.exactly('172.17.0.1');
    });
  });

  describe('#start', () => {
    it('should start events and attach the connect event', () => {
      let p = docker.start();

      let connect = docker.events.on.firstCall.args[1];
      let disconnect = docker.events.on.secondCall.args[1];

      connect();

      return p
        .then(() => {
          should(docker.events.start)
            .be.calledOnce();

          should(docker.events.on)
            .be.calledTwice()
            .be.calledWith('connect')
            .be.calledWith('disconnect');

          should(docker.docker0).be.exactly('docker0 from docker');
        });
    });

    it('should call start again on timeout', () => {
      sinon.spy(docker, 'start');
      docker.events.on
        .withArgs('connect')
        .onSecondCall()
        .yields();

      let p = docker.start();

      should(docker.start)
        .be.calledOnce();

      clock.tick(10000);

      return p
        .then(() => {
          should(docker.start)
            .be.calledTwice();
        });
    });

    it('should reject the promise if something unexpected occured', () => {
      var error = new Error('test');

      docker.events.start.throws(error);

      return docker.start()
        .then(() => {
          throw new Error('this should not happen');
        })
        .catch(e => {
          should(e).be.exactly(error);

          should(docker.c2c.log.error)
            .be.calledOnce()
            .be.calledWith(error);
        });
    });

    it('#disconnect event should try to restart', () => {
      sinon.spy(docker, 'start');
      docker.events.on
        .withArgs('connect')
        .yields();

      docker.start();

      let disconnect = docker.events.on.secondCall.args[1];

      disconnect();

      should(docker.c2c.log.warn)
        .be.calledOnce()
        .be.calledWith('Disconnected from Docker. Reconnecting');

      should(docker.start)
        .be.calledTwice();
    });
  });

  describe('#containers', () => {
    it('should list containers', () => {
      return docker.containers()
        .then(() => {
          should(docker.client.listContainers)
            .be.calledOnce();
        });
    });
  });

});