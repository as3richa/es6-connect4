// @flow

import Koa from 'koa';
import koaStatic from 'koa-static';
import websockify from 'koa-websocket';
import { join } from 'path';

import logger from './logger';
import { Client } from './Client';

const clientAssetRoot = join(__dirname, '../client');
const port = (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000;

const app = websockify(new Koa());

app.use(koaStatic(clientAssetRoot));

app.ws.use((ctx) => {
  const ws = ctx.websocket;

  logger.info('client connected via websocket interface');

  let clientConnected: boolean = true;

  const client = new Client((message: mixed) => {
    if(!clientConnected) {
      return;
    }
    ws.send(JSON.stringify(message));
  });

  const dispatchTable = {
    nick: (param: mixed) => {
      if(typeof(param) !== 'string') {
        return;
      }
      client.nick(param);
    },

    challenge: (param: mixed) => {
      if(typeof(param) !== 'string') {
        return;
      }
      client.challenge(param);
    },

    accept: () => {
      client.accept();
    },

    decline: () => {
      client.decline();
    },

    cancel: () => {
      client.cancel();
    },

    drop: (param: mixed) => {
      if(typeof(param) !== 'number') {
        return;
      }
      client.drop(param);
    },

    leave: () => {
      client.leave();
    }
  };

  ws.on('message', (raw: string) => {
    let data;

    try {
      data = JSON.parse(raw);
    } catch(e) {
      return;
    }

    const cmd = data['cmd'];
    const param = data['param'];
    dispatchTable[cmd] && dispatchTable[cmd](param);
  });

  const onClose = () => {
    logger.info('client disconnected');
    clientConnected = false;
    client.quit();
  };

  ws.on('error', onClose);
  ws.on('close', onClose);
});

app.listen(port);

logger.info(`listening on port ${port}`);
