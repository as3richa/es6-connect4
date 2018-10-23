'use strict';

const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');
const babel = require('@babel/core');

const util   = require('./util');
const logger = require('../server/logger').withContext('server build');

const { envName, babelPresets, babelPlugins, sourceRoot, buildRoot, serverBuildRoot, serverRoot, commonBuildRoot, commonRoot } = util;
const { eachFilepath, mkdirsIfAbsent } = util;

function destinationFor(filepath) {
  return path.join(buildRoot, path.relative(sourceRoot, filepath));
}

function buildOneFile(filepath, cb) {
  const babelConfig = { envName, filename: filepath, babelrc: false, presets: babelPresets, plugins: babelPlugins };

  babel.transformFile(filepath, babelConfig, (err, result) => {
    if(err) {
      cb(err);
      return;
    }
    fs.writeFile(destinationFor(filepath), result.code, cb);
  });
}

function buildSeveralFiles(filepaths, cb) {
  if(filepaths.length === 0) {
    logger.warn('no input files given - nothing to do');
    return;
  }

  let successfulBuilds = 0;
  let completedBuilds = 0;
  let firstFailure = null;

  logger.info(`building ${filepaths.length} source file${filepaths.length > 1 ? 's': ''}`);

  filepaths.forEach(filepath => buildOneFile(filepath, (err) => {
    completedBuilds ++;

    if(err) {
      logger.error(`${filepath} => ${destinationFor(filepath)} failed to build`);
      firstFailure = firstFailure || { filepath, err };
    } else {
      logger.info(`${filepath} => ${destinationFor(filepath)} built successfully`);
      successfulBuilds ++;
    }

    if(completedBuilds >= filepaths.length) {
      if(firstFailure) {
        const failedBuilds = completedBuilds - successfulBuilds;

        let suffix;
        if(failedBuilds === 1) {
          suffix = '';
        } else if(failedBuilds === 2) {
          suffix = ' and one other file';
        } else {
          suffix = ` and ${failedBuilds - 1} other files`;
        }
        suffix += `; ${successfulBuilds} file${successfulBuilds === 1 ? '' : 's'} built successfully`;

        const detailedError = firstFailure.err.toString().split('\n').map(line => `${chalk.red('==')} ` + line).join('\n');

        logger.error(`failed to build ${firstFailure.filepath}${suffix}`);
        logger.error(`detailed error for ${firstFailure.filepath} was:\n${detailedError}`);
        cb(firstFailure);
      } else {
        logger.info(`successfully rebuilt ${successfulBuilds} sourcefile${successfulBuilds > 1 ? 's' : ''}`);
        cb(null);
      }
    }
  }));
}

/* Builds the server, either selectively from a list of changed files, or in its entirety
 * by enumerating all the sourcefiles in src/server and src/common. In the former case,
 * the first parameter is an array of filepaths and the second is a callback; in the
 * latter, the sole parameter is a callback */
function buildServer(filepaths_or_cb, cb) {
  mkdirsIfAbsent([buildRoot, serverBuildRoot, commonBuildRoot], (err) => {
    if(err) {
      logger.error(`failed to mkdir build directories: ${err.toString()}`);
      return;
    }

    if(cb) {
      const filepaths = filepaths_or_cb.filter(f => path.extname(f) === '.js');
      buildSeveralFiles(filepaths, cb);
      return;
    }

    cb = filepaths_or_cb;
    const filepaths = [];

    eachFilepath(serverRoot, filepath => filepaths.push(filepath), () => {
      eachFilepath(commonRoot, filepath => filepaths.push(filepath), () => {
        buildSeveralFiles(filepaths.filter(f => path.extname(f) === '.js'), cb);
      });
    });
  });
}

module.exports = { buildServer };
