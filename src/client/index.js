// @flow

import { Engine } from './Engine';
import { toPlayer } from '../common/Game';
import { registerKeyHandlers, registerMouseHandlers, registerTouchHandlers, enableKeyHandlers, disableKeyHandlers } from './controls';
import { establishConnection, onMessage, onError } from './network';
import { toClientState } from '../common/ClientState';

import type { ClientState } from '../common/ClientState';

function showOverlay(s: ClientState, m: string) { }
function hideOverlay() { }

window.addEventListener('load', () => {
  const documentBody = document.body;
  const documentElement = document.documentElement;

  if(!documentBody || !documentElement) {
    throw new Error('missing documentBody or documentElement');
  }

  documentBody.style.margin = '0px';
  documentBody.style.padding = '0px';
  documentBody.style.overflow = 'hidden';

  const canvas = document.createElement('canvas');
  documentBody.appendChild(canvas);

  const engine = new Engine(canvas);

  const renderFrame = () => {
    engine.renderFrame();
    window.requestAnimationFrame(renderFrame);
  };
  renderFrame();

  const resizeCanvas = () => {
    canvas.width = documentElement.clientWidth;
    canvas.height = documentElement.clientHeight;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  registerKeyHandlers(engine);
  registerMouseHandlers(canvas, engine);
  registerTouchHandlers(canvas, engine);

  establishConnection();

  onMessage((data: mixed) => {
    const state: ClientState | null = toClientState(data.state);

    if(state === null) {
      return;
    } else if(state === 'playing') {
      enableKeyHandlers();

      if(data.drop && typeof(data.column) === 'number') {
        if(data.yours) {
          engine.moveCursorTo(data.column);
          engine.dropOurPiece();
        } else {
          engine.dropOpponentPiece(data.column);
        }
      } else if(typeof(data.opponent) === 'string' && toPlayer(data.player) !== null) {
        hideOverlay();
        engine.newSession(data.opponent, toPlayer(data.player));
      }
    } else {
      const message = (typeof(data.message) === 'string') ? data.message : '';
      disableKeyHandlers();
      showOverlay(state, message);
    }
  });

  onError(() => {});
});
