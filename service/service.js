const { Service } = require('node-windows');
const path = require('path');
const fs = require('fs');

const packageFile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json')));

const options = {
  name: packageFile.description,
  description: 'BPA SPFx CI Web Server',
  script: path.resolve(__dirname, '..', 'bin', 'www'),
  env: [
    {
      name: 'PORT',
      value: 80,
    },
    {
      name: 'IS_SERVICE',
      value: true,
    },
    {
      name: 'SERVICE_NAME',
      value: packageFile.description,
    },
  ],
};

const svc = new Service(options);

module.exports = svc;
