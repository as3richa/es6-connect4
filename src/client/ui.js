// @flow

import type { ClientState } from '../common/ClientState';
import type { Callbacks } from './Callbacks';

type Modal = {
  div: HTMLDivElement,
  message: HTMLParagraphElement
};

const modalProportion = 0.4;
const modalAspectRatio = 4 / 3;
const modalFontSizeProportion = 0.06;

let overlay: HTMLDivElement | null = null;
let modals: { [ClientState | 'error']: Modal } = {};

function mDiv(): HTMLDivElement {
  const modal = document.createElement('div');
  modal.style.backgroundColor = '#a3f0ff';
  modal.style.border = '2px solid #000';
  modal.style.position = 'absolute';
  modal.style.boxSizing = 'border-box';
  modal.style.fontFamily = 'sans-serif';
  return modal;
}

function mPara(): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  paragraph.style.fontSize = '100%';
  paragraph.style.margin = '6%';
  paragraph.style.textAlign = 'center';
  return paragraph;
}

function mTextBox(placeholder: string, onEnter: () => void): HTMLInputElement {
  const box = document.createElement('input');
  box.type = 'text';
  box.style.fontSize = '100%';
  box.placeholder = placeholder;
  box.style.display = 'block';
  box.style.height = '15%';
  box.style.margin = '6%';
  box.style.width = '88%';
  box.style.textAlign = 'center';
  box.style.boxSizing = 'border-box';

  box.addEventListener('keydown', (event: KeyboardEvent) => {
    if(event.code === 'Enter') {
      onEnter();
      event.preventDefault();
    }
  });

  return box;
}

function mButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.appendChild(document.createTextNode(text));
  button.style.fontSize = '100%';
  button.style.display = 'block';
  button.style.height = '15%';
  button.style.margin = '6%';
  button.style.width = '88%';
  button.style.boxSizing = 'border-box';

  button.addEventListener('click', onClick);

  return button;
}

function unnamedModal(callbacks: Callbacks): Modal {
  let textBox;
  const submit = () => callbacks.nick(textBox.value);

  const div = mDiv();
  const message = mPara();
  textBox = mTextBox('Nickname', submit);
  const button = mButton('Enter', submit);

  div.appendChild(message);
  div.appendChild(textBox);
  div.appendChild(button);

  return { div: div, message: message };
}

function idleModal(callbacks: Callbacks): Modal {
  let textBox;
  const submit = () => callbacks.challenge(textBox.value);

  const div = mDiv();
  const message = mPara();
  textBox = mTextBox('Opponent', submit);
  const button = mButton('Challenge', submit);

  div.appendChild(message);
  div.appendChild(textBox);
  div.appendChild(button);

  return { div: div, message: message };
}

function challengedModal(callbacks: Callbacks): Modal {
  const div = mDiv();
  const message = mPara();
  const acceptButton = mButton('Accept', callbacks.accept);
  const declineButton = mButton('Decline', callbacks.decline);

  div.appendChild(message);
  div.appendChild(acceptButton);
  div.appendChild(declineButton);

  return { div: div, message: message };
}

function errorModal(): Modal {
  const div = mDiv();
  const message = mPara();
  message.style.color = '#f00';

  div.appendChild(message);

  return { div: div, message: message };
}

function challengingModal(callbacks: Callbacks): Modal {
  const div = mDiv();
  const message = mPara();
  const cancelButton = mButton('Cancel', callbacks.cancel);

  div.appendChild(message);
  div.appendChild(cancelButton);

  return { div: div, message: message };
}

function initModals(callbacks: Callbacks) {
  if(overlay === null) {
    throw new Error('missing documentBody or documentElement');
  }

  modals['unnamed'] = unnamedModal(callbacks);
  modals['idle'] = idleModal(callbacks);
  modals['challenged'] = challengedModal(callbacks);
  modals['challenging'] = challengingModal(callbacks);
  modals['error'] = errorModal();

  for(let id of Object.keys(modals)) {
    overlay.appendChild(modals[id].div);
  }
}

export function initUi(callbacks: Callbacks): { canvas: HTMLCanvasElement } {
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

  overlay = document.createElement('div');
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  documentBody.appendChild(overlay);

  initModals(callbacks);

  const resize = () => {
    if(overlay === null) {
      throw new Error('exception to help Flow with typing');
    }

    const width = documentElement.clientWidth;
    const height = documentElement.clientHeight;

    canvas.width = width;
    canvas.height = height;
    overlay.style.width = width + 'px';
    overlay.style.height = height + 'px';

    let modalWidth;
    let modalHeight;

    if(modalProportion * width < modalProportion * height * modalAspectRatio) {
      modalWidth = modalProportion * width;
      modalHeight = modalWidth / modalAspectRatio;
    } else {
      modalHeight = modalProportion * height;
      modalWidth = modalHeight * modalAspectRatio;
    }

    const modalLeft = (width - modalWidth) / 2;
    const modalTop = (height - modalHeight) / 2;

    const modalFontSize = modalFontSizeProportion * modalWidth;

    for(let id of Object.keys(modals)) {
      const div = modals[id].div;
      div.style.width = modalWidth + 'px';
      div.style.height = modalHeight + 'px';
      div.style.left = modalLeft + 'px';
      div.style.top = modalTop + 'px';
      div.style.fontSize = modalFontSize + 'px';
    }
  };

  window.addEventListener('resize', resize);
  resize();

  return { canvas };
}

export function showOverlay(state: ClientState | 'loading' | 'error', text: string) {
  if(overlay === null) {
    throw new Error('exception to help Flow with typing');
  }

  if(text[text.length - 1] != '.') {
    text += '.';
  }

  for(let id of Object.keys(modals)) {
    const modal = modals[id];
    const { div, message } = modal;

    if(id === state) {
      div.style.display = 'block';

      while (message.firstChild) {
        message.removeChild(message.firstChild);
      }

      message.appendChild(document.createTextNode(text));
    } else {
      div.style.display = 'none';
    }
  }

  overlay.style.display = 'block';
}

export function hideOverlay() {
  if(overlay === null) {
    throw new Error('exception to help Flow with typing');
  }
  overlay.style.display = 'none';
}
