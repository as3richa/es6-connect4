'use strict';

const fs   = require('fs');
const path = require('path');

/* prodBuild iff NODE_ENV === 'production'. This just makes webpack pack harder, I think */
const prodBuild = (process.env.NODE_ENV === 'production');
const envName = (prodBuild ? 'production' : 'development');

const projectRoot     = path.join(path.relative('', __dirname), '..',  '..');
const sourceRoot      = path.join(projectRoot, 'src');

/* Root directories for the source */
const clientRoot      = path.join(sourceRoot, 'client');
const serverRoot      = path.join(sourceRoot, 'server');
const commonRoot      = path.join(sourceRoot, 'common');

/* Root directories for the completed build */
const buildRoot       = path.join(projectRoot, 'build');
const serverBuildRoot = path.join(buildRoot, 'server');
const clientBuildRoot = path.join(buildRoot, 'client');
const commonBuildRoot = path.join(buildRoot, 'common');

/* Same across server and client */
const babelPresets = ['@babel/preset-flow', '@babel/preset-env'];
const babelPlugins = ['@babel/plugin-proposal-class-properties'];

/* mkdirs a set of paths in serial, swallowing any EEXIST errors */
function mkdirsIfAbsent(dirpaths, cb) {
  const miaRecursive = (index) => {
    if(index >= dirpaths.length) {
      cb(null);
      return;
    }

    fs.mkdir(dirpaths[index], (err) => {
      if(err && err.code !== 'EEXIST') {
        cb(err);
        return;
      }

      miaRecursive(index + 1);
    });
  };

  miaRecursive(0);
}

/* Walk the directory tree under root, streaming the pathnames of all regular files
 * via onFile; invoke onDone when complete; swallow any and all errors */
function eachFilepath(root, onFile, onDone) {
  fs.readdir(root, (err, filenames) => {
    if(err || filenames.length === 0) {
      onDone();
      return;
    }

    let remaining = filenames.length;

    const myOnDone = () => {
      remaining --;

      if(remaining === 0) {
        onDone();
      }
    };

    const filepaths = filenames.map(filename => path.join(root, filename));

    filepaths.forEach((filepath) => {
      fs.stat(filepath, (err, stats) => {
        if(err || !stats.isDirectory()) {
          if(!err && stats.isFile()) {
            onFile(filepath);
          }
          myOnDone();
        } else {
          eachFilepath(filepath, onFile, myOnDone);
        }
      });
    });
  });
}

module.exports = {
  prodBuild,
  envName,

  babelPresets,
  babelPlugins,

  projectRoot,
  sourceRoot,
  clientRoot,
  serverRoot,
  commonRoot,
  buildRoot,
  serverBuildRoot,
  clientBuildRoot,
  commonBuildRoot,

  mkdirsIfAbsent,
  eachFilepath
};
