/* eslint-disable no-console */
const svc = require('./service');

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.uninstall();
