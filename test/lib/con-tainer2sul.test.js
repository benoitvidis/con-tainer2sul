'use strict';

const mockRequire = require('mock-require');
const should = require('should');
const sinon = require('sinon');
const SkipError = require('../../lib/errors/skipError');

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
          register: sinon.stub().resolves(),
          deregister: sinon.stub().resolves()
        },
        kv: {
          keys: sinon.stub().resolves(),
          get: sinon.stub().resolves(),
          set: sinon.stub().resolves(),
          delete: sinon.stub().resolves()
        }
      },
      docker: {
        _container: {
          inspect: sinon.stub().resolves()
        },
        client: {},
        containers: sinon.stub().resolves(),
        docker0: 'docker0',
        events: {
          on: sinon.stub()
        },
        start: sinon.stub().resolves()
      }
    };
    stubs.bunyan = {
      createLogger: sinon.stub().returns(stubs.log)
    };
    stubs.docker.client.getContainer = sinon.stub().returns(stubs.docker._container);
    stubs.Consul = sinon.stub().returns(stubs.consul);
    stubs.Docker = sinon.stub().returns(stubs.docker);

    mockRequire('bunyan', stubs.bunyan);
    mockRequire('../../lib/consul', stubs.Consul);
    mockRequire('../../lib/docker', stubs.Docker);
    C2C = require('../../lib/con-tainer2sul');
    mockRequire.reRequire('../../lib/con-tainer2sul');

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
      let
        start,
        die;

      beforeEach(() => {
        c2c.docker._container.inspect.resolves(container);
        sinon.stub(C2C.prototype, 'registerContainer').resolves();
        sinon.stub(C2C.prototype, 'containerServiceName').returns('service');
        sinon.stub(C2C.prototype, 'deregisterService').resolves();
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

      it('#die should deregisterService the container', () => {
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

            should(c2c.deregisterService)
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
    var container;

    beforeEach(() => {
      let error = new Error('test');
      error.statusCode = 404;

      container = {
        inspect: sinon.stub().rejects(error)
      };

      c2c.registerContainers = sinon.stub().resolves();
      c2c.registerContainer = sinon.stub().resolves();
      c2c.deregisterService = sinon.stub().resolves();
      c2c.consul.kv.keys.resolves([
        'test',
        'foo'
      ]);
      c2c.docker.client.getContainer.returns(container);
    });

    it('should deregisterService non-running containers and register running ones', () => {
      return c2c.start()
        .then(() => {
          should(c2c.consul.kv.keys)
            .be.calledOnce()
            .be.calledWith('docker/service-ids/');

          should(c2c.consul.kv.get)
            .be.calledTwice()
            .be.calledWith('test')
            .be.calledWith('foo');

          should(c2c.docker.client.getContainer)
            .be.calledTwice();

          should(c2c.deregisterService)
            .be.calledTwice()
            .be.calledWith('test')
            .be.calledWith('foo');

          should(c2c.docker.containers)
            .be.calledOnce();

          should(c2c.registerContainers)
            .be.calledOnce();
        });
    });

    it('should not fail if no docker/service-ids key is stored in consul', () => {
      var error = new Error('test');
      error.statusCode = 404;

      c2c.consul.kv.keys.rejects(error);

      return c2c.start()
        .then(() => {
          should(c2c.registerContainers)
            .be.calledOnce();
        });
    });

    it('should reject the promise if consul kv throws an unexpected error', () => {
      var error = new Error('unexpected');
      c2c.consul.kv.keys.rejects(error);

      return c2c.start()
        .then(() => {
          throw new Error('this should not happen');
        })
        .catch(e => {
          should(e).be.exactly(error);

          should(c2c.log.error)
            .be.calledOnce()
            .be.calledWith(e);
        });
    });

    it('should deregisterService non-running containers', () => {
      container.inspect
        .onFirstCall().resolves({
          State: {
            Status: 'down'
          }
        });

      return c2c.start()
        .then(() => {
          should(c2c.deregisterService)
            .be.calledTwice();
        });
    });

    it('should reject the promise if we cannot inspect the container', () => {
      var error = new Error('test');

      container.inspect
        .onSecondCall().rejects(error);

      return c2c.start()
        .then(() => {
          throw new Error('this should not happen');
        })
        .catch(e => {
          should(c2c.log.error)
            .be.calledWith(e);

          should(e).be.exactly(error);
        });
    });
  });

  describe('#registerConstainers', () => {
    it('should call registerContainer for all containers', () => {
      c2c.registerContainer = sinon.stub().resolves();

      return c2c.registerContainers([
        'test',
        'foo'
      ])
        .then(() => {
          should(c2c.registerContainer)
            .be.calledTwice()
            .be.calledWith('test')
            .be.calledWith('foo');
        });
    });
  });

  describe('#registerContainer', () => {
    beforeEach(() => {
      c2c.container2Service = sinon.stub().returns({foo: 'bar'});
      c2c.containerServiceName = sinon.stub().returns('foo');
    });

    it('should reject if we cannot parse the docker inspect result', () => {
      var error = new Error('test');

      c2c.container2Service.throws(error);

      return should(c2c.registerContainer('test'))
        .be.rejectedWith(error);
    });

    it('should resolve and do nothing is the container needs to be skipped', () => {
      var error = new SkipError('test');

      c2c.container2Service.throws(error);

      return c2c.registerContainer('test')
        .then(() => {
          should(c2c.log.info)
            .be.calledOnce()
            .be.calledWith('test');

          should(c2c.consul.catalog.register)
            .have.callCount(0);
        });
    });

    it('should register the service in consul', () => {
      return c2c.registerContainer({Id: 'test'})
        .then(() => {
          should(c2c.log.info)
            .be.calledOnce()
            .be.calledWith('registering container');

          should(c2c.consul.catalog.register)
            .be.calledOnce()
            .be.calledWithMatch({foo: 'bar'});

          should(c2c.consul.kv.set)
            .be.calledOnce()
            .be.calledWith('docker/service-ids/foo', 'test');
        });
    });

    it('should reject the promise if consul fails to register the service', () => {
      let error = new Error('test');

      c2c.consul.catalog.register.rejects(error);

      return should(c2c.registerContainer({}))
        .be.rejectedWith(error);
    });
  });

  describe('#deregisterService', () => {
    it('should log and reject errors', () => {
      let error = new Error('test');

      c2c.consul.catalog.deregister.rejects(error);

      return c2c.deregisterService()
        .then(() => {
          throw new Error('this should not happen');
        })
        .catch(e => {
          should(e).be.exactly(error);

          should(c2c.log.error)
            .be.calledOnce()
            .be.calledWith(error);
        });
    });

    it('should deregisterService the node and associated key', () => {
      return c2c.deregisterService('test')
        .then(() => {
          should(c2c.consul.catalog.deregister)
            .be.calledOnce()
            .be.calledWithMatch({ Node: 'test' });

          should(c2c.consul.kv.delete)
            .be.calledTwice()
            .be.calledWith('docker/service-ids/test')
            .be.calledWith('services/test');
        });
    });
  });

  describe('#container2Service', () => {
    beforeEach(() => {
      c2c.containerServiceName = sinon.stub().returns('foo');
    });

    it('should parse the inspect result', () => {
      let result = c2c.container2Service({
        Config: {
          Labels: {
            'consul.ip': 'consul ip',
            'consul.port': '8888 consul port',
            'consul.service': 'consul service',
            'consul.tags': 'consul,tags',
            'consul.skip': 'false'
          }
        },
        NetworkSettings: {
          Networks: {
            test: {
              IPAddress: 'ip'
            }
          }
        }
      });

      should(result.Node).be.exactly('foo');
      should(result.Address).be.exactly('consul ip');
      should(result.Service.Service).be.exactly('consul service');
      should(result.Service.Port).be.exactly(8888);
      should(result.Service.Tags).match(['consul', 'tags']);
    });

    it('should not set the port if it does not manage to cast it to an int', () => {
      let result = c2c.container2Service({
        Labels: {
          'consul.port': 'not a number'
        },
        NetworkSettings: {
          Networks: {
            IPAddress: 'ip'
          }
        }
      });

      should(result.Service.Port).be.undefined();
    });

    it('should use docker0 ip address if `host` is specified for ip', () => {
      let result = c2c.container2Service({
        Labels: {
          'consul.ip': 'host'
        },
        NetworkSettings: {
          Networks: {
            IPAddress: 'ip'
          }
        }
      });

      should(result.Address).be.exactly(c2c.docker.docker0);
    });

    it('should throw a SkipError execption if the container is marked to be skipped', () => {
      return should(() => c2c.container2Service({
        Labels: {
          'consul.skip': 'true'
        },
        NetworkSettings: {
          Networks: {
            IPAddress: 'ip'
          }
        }
      })).throw(SkipError, {message: 'Container foo skipped from label'});
    });
  });

  describe('#containerServiceName', () => {
    it('should get the container name from inecpted result', () => {
      should(c2c.containerServiceName({
        Name: 'container',
        Labels: {
          'consul.name': 'name'
        }
      })).be.exactly('name');

      should(c2c.containerServiceName({
        Names: ['name', 'foo']
      })).be.exactly('name');

      should(c2c.containerServiceName({
        Name: 'test',
        Config: {
          Labels: {
            'consul.name': 'foobar'
          }
        }
      })).be.exactly('foobar');
    });
  });


});