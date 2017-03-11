'use strict';

class Kv {
  constructor (consul) {
    this.consul = consul;
  }

  keys (prefix) {
    return this.consul._get(`/v1/kv/${prefix}?keys`);
  }

  set (key, value) {
    return this.consul._put(`/v1/kv/${key}`, value);
  }

  get (key) {
    return this.consul._get(`/v1/kv/${key}?raw`);
  }

  delete (key, recurse) {
    let url = `/v1/kv/${key}`;

    if (recurse === true) {
      url += '?recurse';
    }

    return this.consul._delete(url);
  }
}

module.exports = Kv;