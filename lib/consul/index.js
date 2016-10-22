'use strict';

const rq = require('request-promise');
const Catalog = require('./catalog');
const Kv = require('./kv');

class Consul {
  constructor (config) {
    this.host = config.host;
    this.port = config.port;

    this.acl = config.acl;
    this.dc = config.dc || false;
  }

  _send (method, uri, body) {
    if (this.acl) {
      uri += uri.indexOf('?') > -1 ? '&' : '?';
      uri += `token=${this.acl}`;
    }

    let request = {
      method,
      uri: `http://${this.host}:${this.port}${uri}`,
      json: true
    };

    if (body) {
      request.body = body;
    }

    return rq(request);
  }

  _get (uri) {
    return this._send('GET', uri);
  }

  /*
  _post (uri, data) {
    if (this.dc) {
      data.Datacenter = this.dc;
    }

    return this._send('POST', uri, data);
  }
  */

  _put (uri, data) {
    if (this.dc) {
      data.Datacenter = this.dc;
    }

    return this._send('PUT', uri, data);
  }

  _delete (uri) {
    return this._send('DELETE', uri);
  }

  get catalog () {
    return new Catalog(this);
  }

  get kv () {
    return new Kv(this);
  }
}

module.exports = Consul;