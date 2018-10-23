// @flow

import { Engine } from './Engine';
import { toPlayer } from '../common/Game';
import { registerKeyHandlers, registerMouseHandlers, registerTouchHandlers, enableKeyHandlers, disableKeyHandlers } from './controls';
import { establishConnection, onMessage, onError, send } from './network';
import { toClientState } from '../common/ClientState';
import { initUi, showOverlay, hideOverlay } from './ui';

import type { ClientState } from '../common/ClientState';

window.addEventListener('load', () => {
  const callbacks = {
    nick: (nickname: string) => { send({ cmd: 'nick', param: nickname }); },
    challenge: (opponentName: string) => { send({ cmd: 'challenge', param: opponentName }); },
    accept: () => { send({ cmd: 'accept'}); },
    decline: () => { send({ cmd: 'decline'}); },
    cancel: () => { send({ cmd: 'cancel'}); },
    drop: (column: number) => { send({ cmd: 'drop', param: column }); }
  };

  const { canvas } = initUi(callbacks);

  const engine = new Engine(canvas, callbacks.drop);

  const renderFrame = () => {
    engine.renderFrame();
    window.requestAnimationFrame(renderFrame);
  };
  renderFrame();

  registerKeyHandlers(engine);
  registerMouseHandlers(canvas, engine);
  registerTouchHandlers(canvas, engine);

  onMessage((data: Object) => {
    const state: ClientState | null = toClientState(data.state);

    if(state === null) {
      return;
    }

    if(state === 'playing') {
      enableKeyHandlers();
      hideOverlay();

      if(data['drop'] && typeof(data['column']) === 'number') {
        engine.dropOpponentPiece(data.column);
      } else if(typeof(data['opponent']) === 'string') {
        const player = toPlayer(data['player']);
        if(player !== null) {
          engine.newSession(data.opponent, player);
        } 
      }
    } else {
      const message = (typeof(data['message']) === 'string') ? data.message : '';
      disableKeyHandlers();
      showOverlay(state, message);
    }
  });

  onError(() => {
    showOverlay('error', 'Something went wrong - please refresh the page.');
  });

  establishConnection();
});
