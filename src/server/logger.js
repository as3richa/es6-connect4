'use strict';

const chalk = require('chalk');

const colorByLogLevel = {
  info:  chalk.blue,
  warn:  chalk.yellow,
  error: chalk.red
};

class Logger {
  constructor(context) {
    this.context = context;
    this.stringifiedContext = context && context.map(c => `[${c}]`).join(' ');
  }

  withContext() {
    const newContext = Array.prototype.slice.call(arguments);
    const mergedContext = this.context ? (this.context.slice().concat(newContext)) : newContext;
    return new Logger(mergedContext);
  }

  info(message) {
    console.info(`${this._preamble('info')}  ${message}`);
  }

  warn(message) {
    console.warn(`${this._preamble('warn')}  ${message}`);
  }

  error(message) {
    console.error(`${this._preamble('error')} ${message}`);
  }

  _preamble(logLevel) {
    const color = colorByLogLevel[logLevel];

    let preamble = utcTimestampString();
  
    if(this.stringifiedContext) {
      preamble = `${preamble} ${this.stringifiedContext}`;
    }
  
    preamble = `${preamble} ${color(logLevel.toUpperCase())}`;

    return preamble;
  }
}

function pad2(number) {
  const string = number.toString();
  return (string.length === 1) ? ('0' + string) : string;
}

function utcTimestampString() {
  const now = new Date();
  const datePart = `${now.getUTCFullYear()}/${pad2(now.getUTCMonth())}/${pad2(now.getUTCDate())}`;
  const timePart = `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(now.getUTCSeconds())}Z`;
  return `[${datePart} ${timePart}]`;
}

const defaultLogger = new Logger();

module.exports = defaultLogger;
