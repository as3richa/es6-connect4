'use strict';

const path       = require('path');
const webpack    = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');


const util = require('./util');
const logger = require('../server/logger').withContext('client build');

const { envName, prodBuild, clientRoot, babelPresets, babelPlugins, clientBuildRoot } = util;

const htmlWebpackPluginConfig = {
  title: 'es6-connect4',
  minify: { collapseWhitespace: true },
  inject: 'head',
  meta: { viewport: 'width=device-width,initial-scale=1,shrink-to-fit=no,user-scalable=0' }
};

const webpackConfig = {
  entry: path.resolve(path.join(clientRoot, 'index.js')),
  mode: envName,
  output: { path: path.resolve(clientBuildRoot), filename: 'bundle.[hash].js' },
  module: {
    rules: [{
      loader: 'babel-loader',
      test: /\.js$/,
      query: { presets: babelPresets, plugins: babelPlugins }
    }]
  },
  plugins: [new HtmlWebpackPlugin(htmlWebpackPluginConfig)],
  devtool: (prodBuild ? false: 'inline-sourcemap')
};

const compiler = webpack(webpackConfig);

function buildClient(cb) {
  logger.info('running webpack build');
  compiler.run((err, stats) => {
    if(err) {
      logger.error(`error running webpack build: ${err.toString()}`);
      cb(err);
      return;
    }

    const { errors, warnings } = stats.toJson();

    if(stats.hasWarnings()) {
      for(let i = 0; i < 10 && i < warnings.count; i ++) {
        logger.warn(warnings[i]);
      }
    }

    if(stats.hasErrors()) {
      for(let i = 0; i < 10 && i < errors.length; i ++) {
        logger.error(errors[i]);
      }

      const prettyError = 
        `webpack build terminated with ${errors.length} error${errors.length === 1 ? '' : 's'}` +
        ` and ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;

      logger.error(prettyError);
      cb(prettyError);
      return;
    }

    logger.info('webpack build completed successfully');
    cb(null);
  });
}

module.exports = { buildClient };
