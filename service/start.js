/* eslint-disable no-console */
const svc = require('./service');

svc.on('install', () => {
  console.log('Service installed. Starting...');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('alreadyinstalled', () => {
  console.log('Service already installed. Restarting...');
  svc.restart();
});

svc.install();
