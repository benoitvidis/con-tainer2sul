class Catalog {
  constructor (consul) {
    this.consul = consul;
  }

  register (data) {
    return this.consul._put('/v1/catalog/register', data);
  }

  deregister (data) {
    return this.consul._put('/v1/catalog/deregister', data);
  }
}

module.exports = Catalog;