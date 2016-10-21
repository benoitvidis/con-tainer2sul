'use strict';

const DockerOde = require('dockerode');
const DockerOdePromise = require('dockerode-promise');
const DockerEvents = require('docker-events');
const Promise = require('bluebird');

class Docker {
  constructor (c2c) {
    this.c2c = c2c;

    this.client = new DockerOdePromise(c2c.config.docker);
    this.docker0 = '172.17.0.1';
    this.events = new DockerEvents({
      docker: new DockerOde(c2c.config.docker)
    });
  }

  start () {
    return new Promise((resolve) => {
      this.events.start();

      this.events.on('connect', () => {
        this.c2c.log.info('Connected to docker');

        return this.client.listNetworks()
          .then(networks => {
            this.docker0 = networks.filter(net => net.Name === 'bridge')[0].IPAM.Config[0].Gateway;
            resolve();
          });
      });
    });
  }

  containers () {
    return this.client.listContainers();
  }
}

module.exports = Docker;
