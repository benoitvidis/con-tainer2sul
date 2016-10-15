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

  delete (key) {
    return this.consul._delete(`/v1/kv/${key}`);
  }
}

module.exports = Kv;