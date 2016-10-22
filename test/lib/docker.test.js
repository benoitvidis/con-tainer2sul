'use strict';

const mockRequire = require('mock-require');
const should = require('should');
const sinon = require('sinon');

describe('docker', () => {
  var
    Docker,
    docker,
    stubs;

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
        on: sinon.spy(function (event, cb) { cb(); }),
        start: sinon.spy()
      },
      c2c: {
        config: {
          docker: {
            connectTimeout: 5000,
            foo: 'bar'
          }
        },
        log: {
          info: sinon.spy()
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
      return docker.start()
        .then(() => {
          should(docker.events.start)
            .be.calledOnce();

          should(docker.events.on)
            .be.calledOnce()
            .be.calledWith('connect');

          should(docker.docker0).be.exactly('docker0 from docker');
        });
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