'use strict';

const ConTainer2Sul = require('./con-tainer2sul');
const config = require('./config');
const conTainer2Sul = new ConTainer2Sul(config);

conTainer2Sul.start();

