'use strict';

const { envName } = require('./build/util');
const server      = require('./build/server');
const client      = require('./build/client');
const logger      = require('./server/logger');

logger.info(`started ${envName} build`);
server.buildServer(() => client.buildClient(() => logger.info('build complete')));
