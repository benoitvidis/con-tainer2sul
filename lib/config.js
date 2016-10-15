'use strict';

const rc = require('rc');

module.exports = rc('c2c', {
  consul: {
    host: 'localhost',
    port: 8500
  },
  docker: {
    socketPath: '/var/run/docker.sock'
  },
  logger: {
    name: 'con-tainer2sul'
  }
});