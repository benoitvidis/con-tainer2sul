#!/bin/sh

set -e

npm install
npm test

cat ./coverage/lcov.info | ./node_modules/.bin/codecov  

