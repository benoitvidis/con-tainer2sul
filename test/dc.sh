#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

docker-compose stop
docker-compose rm -f
docker-compose up -d
docker-compose logs -f c2c