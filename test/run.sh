#!/bin/sh

cd /var/app

npm install
npm install -g pm2

pm2 start test/pm2.yml
pm2 logs --raw | /var/app/node_modules/.bin/bunyan -l debug