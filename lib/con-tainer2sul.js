'use strict';

const bunyan = require('bunyan');
const Consul = require('./consul');
const Docker = require('./docker');
const Promise = require('bluebird');
const SkipError = require('./errors/skipError');

class ConTainer2Sul {
  constructor (config) {
    this.config = config;

    this.consul = new Consul(config.consul);
    this.docker = new Docker(this);
    this.log = bunyan.createLogger(config.logger);

    this._attachEvents();
  }

  _attachEvents () {
    this.docker.events.on('start', msg => {
      return this.docker.client.getContainer(msg.id)
        .inspect()
        .then(container => this.registerContainer(container))
        .catch(error => {
          this.log.error(error);
          throw error;
        });
    });
    this.docker.events.on('die', msg => {
      return this.docker.client.getContainer(msg.id)
        .inspect()
        .then(container => this.deregister(this.containerServiceName(container)))
        .catch(error => {
          this.log.error(error);
          throw error;
        });
    });
  }

  start () {
    return this.docker.start()
      // deregister containers that do not run
      .then(() => this.consul.kv.keys('docker/service-ids/')
        .catch(error => {
          if (error.statusCode && error.statusCode === 404) {
            return [];
          }
          throw error;
        }))
      .then(keys => {
        return Promise.all(keys.map(key => {
          return this.consul.kv.get(key)
            .then(containerId => {
              return this.docker.client.getContainer(containerId)
                .inspect()
                .then(container => {
                  if (container.State.Status !== 'running') {
                    return this.deregister(key);
                  }
                })
                .catch(error => {
                  if (error.statusCode && error.statusCode === 404) {
                    return this.deregister(key);
                  }
                  this.log.error(error);
                  throw error;
                });
            });
        }));
      })
      // register all containers
      .then(() => this.docker.containers())
      .then(containers => this.registerContainers(containers))
      .catch(error => {
        this.log.error(error);
        throw error;
      });
  }

  /**
   *
   * @param {Container[]} containers
   * @returns {Promise.<*>}
   */
  registerContainers (containers) {
    return Promise.all(containers.map(container => this.registerContainer(container)));
  }

  /**
   *
   * @param {Container} container
   * @returns {Promise}
   */
  registerContainer (container) {
    let service;

    try {
      service = this.container2Service(container);
    }
    catch (e) {
      if (e instanceof SkipError) {
        this.log.info(e.message);
        return Promise.resolve();
      }

      return Promise.reject(e);
    }

    this.log.info('registering container', service);

    return this.consul.catalog.register(service)
      .then(() => this.consul.kv.set(`docker/service-ids/${this.containerServiceName(container)}`, container.Id))
      .catch(error => {
        this.log.error(error);
        throw error;
      });
  }

  deregister (service) {
    this.log.info('deregistering container', service);

    return this.consul.catalog.deregister({ Node: service })
      .then(() => this.consul.kv.delete(`docker/service-ids/${service}`))
      .catch(error => {
        this.log.error(error);
        throw error;
      });
  }

  container2Service (container) {
    let service = {
      Node: this.containerServiceName(container),
      Address: this.docker.docker0,
      Service: {
        Service: this.containerServiceName(container)
      }
    };
    let containerIPAddress = container
        .NetworkSettings
        .Networks[Object.keys(container.NetworkSettings.Networks)[0]]
        .IPAddress;

    if (containerIPAddress !== '') {
      service.Address = containerIPAddress;
    }

    let lbls = container.Labels;
    if (!lbls && container.Config && container.Config.Labels) {
      lbls = container.Config.Labels;
    }

    if (lbls) {
      Object.keys(lbls).forEach(label => {
        switch(label) {
          case 'consul.ip':
            service.Address = lbls[label];
            if (service.Address === 'host') {
              service.Address = this.docker.docker0;
            }
            break;
          case 'consul.port':
            try {
              service.Service.Port = parseInt(lbls[label]);
              if (isNaN(service.Service.Port)) {
                delete service.Service.Port;
              }
            }
            catch (e) {
              // do nothing
            }
            break;
          case 'consul.service':
            service.Service.Service = lbls[label];
            break;
          case 'consul.tags':
            service.Service.Tags = lbls[label]
              .split(',')
              .map(tag => tag.trim());
            break;
          case 'consul.skip':
            if (lbls[label] !== 'false') {
              throw new SkipError(`Container ${this.containerServiceName(container)} skipped from label`);
            }
            break;
        }
      });
    }

    this.log.debug('service', service);

    return service;
  }

  containerServiceName (container) {
    let name = container.Name;

    if (!name && container.Names) {
      name = container.Names[0];
    }

    let lbls = container.Labels;
    if (!lbls && container.Config && container.Config.Labels) {
      lbls = container.Config.Labels;
    }
    if (lbls && lbls['consul.name']) {
      name = lbls['consul.name'];
    }
    name = name.replace(/^\//, '');

    return name;
  }

}



module.exports = ConTainer2Sul;
