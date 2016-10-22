# Con-tainer2sul

[![Build Status](https://travis-ci.org/vidiben/con-tainer2sul.svg?branch=master)](https://travis-ci.org/vidiben/con-tainer2sul) 
[![codecov](https://codecov.io/gh/vidiben/con-tainer2sul/branch/master/graph/badge.svg)](https://codecov.io/gh/vidiben/con-tainer2sul)

Con-tainer2sul automatically registers and deregisters nodes for any Docker container.

This project is inspired by [gliderlabs registrator](https://github.com/gliderlabs/registrator).

The main difference is that Con-tainer2sul will by default register the containers as nodes. This allows to register a container without having to expose any network service on the host.

<!-- toc -->

- [Running Con-tainer2sul](#running-con-tainer2sul)
  * [Using Docker](#using-docker)
  * [Configuration](#configuration)
    + [Consul](#consul)
    + [Docker](#docker)
    + [Logger](#logger)
- [Container registration](#container-registration)
  * [IP Address](#ip-address)
  * [Service name](#service-name)
  * [Tags](#tags)
  * [Skipping registration](#skipping-registration)

<!-- tocstop -->

## Running Con-tainer2sul

### Using Docker

```
docker run -d \
  -e c2c_consul__host=localhost \
  -e c2c_consul__port=8500 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  vidiben/container2sul
```

### Configuration

Con-tainer2sul uses [rc](https://www.npmjs.com/package/rc) to import its configuration.

The configuration can be overridden using any method supported by rc, for instance using a custom `.c2crc` file or by defining some environmental variables prefixed by `c2c_`.

#### Consul

Consul `host` and `port` can be configured:

_.c2crc_
```json
{
  "consul": {
    "host": "localhost",
    "port": 8500
  },
  "[..]": "[..]"
}
```

#### Docker

The `docker` section of the configuration is given to [dockerode](https://github.com/apocas/dockerode) constructor.

Please refer to [dockerode](https://github.com/apocas/dockerode) documentation for supported options.

Default configuration listens to Docker daemon on `/var/run/docker.sock` unix socket.

_.c2crc_
```json
{
  "[..]": "[..]",
  "docker": {
    "socketPath": "/var/run/docker.sock"
  }
}
```

#### Logger

Con-tainer2sul uses [bunyan](https://github.com/trentm/node-bunyan). The `logger` section of the configuraton object is passed to `bunyan.createLogger` method.

Default configuration outputs logs at `info` level to `stdout`.

_.c2crc_
```json
{
  "[..]": "[..]",
  "logger": {
    "name": "con-tainer2sul"
  }
}
```

## Container registration

Con-tainer2sul relies on [Docker labels](https://docs.docker.com/engine/userguide/labels-custom-metadata/) to define the values sent to Consul.

Internally, Con-tainer2sul calls Consul low-level [catalog/register](https://www.consul.io/docs/agent/http/catalog.html#catalog_register) and [catalog/deregister](https://www.consul.io/docs/agent/http/catalog.html#catalog_deregister) API endpoints.

### IP Address

By default, the registered ip address is the first one found in the `NetworkSettings` group from `docker inspect` result.

If the container is running in `host` network mode, the ip address used is the `docker0` one.

The registered ip address can be configured using a `consul.ip` label.

```
docker run --rm --name c2c -ti -l consul.ip=10.0.0.1 alpine ash
```

will register a service `c2c` on a node `c2c`, which will be registered to the ip `10.0.0.1`.

By setting the `consul.ip` label to `host`, Con-tainer2sul will use `docker0` ip address for the node.

### Service name

By default, the registered service name is the container name.

The service name can be configured using a `consul.service` label.

```
docker run --rm --name c2c -ti -l consul.service=myservice alpine ash
```

will register a service `myservice` in Consul.

### Tags

Tags can be set using a `consul.tags` label, container the list of tags, comma separated.

```
docker run --rm --name c2c -ti -l consul.tags=www,api alpine ash
```

will register a service `c2c` with `www` and `api` tags.

### Port

For the time being, Con-tainer2sul support registering only one port.

Port can be set using a `consul.port` label.

```
docker run --rm --name c2c -ti -l consul.port=80 alpine ash
```

will register a service `c2c` on port 80.


### Skipping registration

You can tell Con-tainer2sul to not register the container by using a `container.skip` label, set to anything else than `false`.

```
docker run --rm --name c2c -ti -l consul.skip=true ash
```

will **not** register any node or service in Consul.
