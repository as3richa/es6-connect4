// @flow

import type { Engine } from './Engine';

const maxTapDuration: DOMHighResTimeStamp = 100;

type ClickInfo = { startedAt: DOMHighResTimeStamp, moved: boolean }
type TouchInfo = { startedAt: DOMHighResTimeStamp, id: number, moved: boolean }

let keyHandlersEnabled = false;

export function registerKeyHandlers(engine: Engine) {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if(!keyHandlersEnabled || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return;
    }

    let handled = false;

    if(event.key === ' ' || event.key === 'Enter') {
      handled = engine.dropOurPiece() || engine.skipDropAnimation();
    } else if(event.key === 'ArrowLeft') {
      handled = engine.moveCursorLeft();
    } else if(event.key === 'ArrowRight') {
      handled = engine.moveCursorRight();
    }

    if(handled) {
      event.preventDefault();
    }
  });
}

export function enableKeyHandlers() {
  keyHandlersEnabled = true;
}

export function disableKeyHandlers() {
  keyHandlersEnabled = false;
}

export function registerMouseHandlers(canvas: HTMLCanvasElement, engine: Engine) {
  let ci: ClickInfo | null = null;

  canvas.addEventListener('mousedown', (event: MouseEvent) => {
    if(event.button !== 0) {
      return;
    }

    const { handled, moved } = engine.moveCursorToX(event.clientX);

    if(handled) {
      ci = { startedAt: performance.now(), moved };
    } else {
      engine.skipDropAnimation();
    }
  });

  canvas.addEventListener('mousemove', (event: MouseEvent) => {
    if(ci === null) {
      return;
    }

    const { moved } = engine.moveCursorToX(event.clientX);
    ci.moved = (ci.moved || moved);
  });

  canvas.addEventListener('mouseup', (event: MouseEvent) => {
    if(event.button !== 0 || ci === null) {
      return;
    }

    const clickDuration = performance.now() - ci.startedAt;

    if(clickDuration <= maxTapDuration && !ci.moved) {
      engine.dropOurPiece();
    }

    ci = null;
  });
}

export function registerTouchHandlers(canvas: HTMLCanvasElement, engine: Engine) {
  let ti: TouchInfo | null = null;

  function findTouch(event: TouchEvent): Touch | null {
    if(ti === null) {
      return null;
    }

    for(const touch of event.changedTouches) {
      if(touch.identifier === ti.id) {
        return touch;
      }
    }

    return null;
  }

  canvas.addEventListener('touchstart', (event: TouchEvent) => {
    event.preventDefault();

    const touch = event.changedTouches[0];
    const { handled, moved } = engine.moveCursorToX(touch.clientX);

    if(handled) {
      ti = {
        startedAt: performance.now(),
        id: touch.identifier,
        moved
      };
    } else {
      engine.skipDropAnimation();
    }
  });

  canvas.addEventListener('touchmove', (event: TouchEvent) => {
    event.preventDefault();

    const touch = findTouch(event);

    if(touch === null) {
      return;
    }

    if(ti === null) {
      throw new Error('exception to help Flow with typing');
    }

    const { moved } = engine.moveCursorToX(touch.clientX);
    ti.moved = (ti.moved || moved);
  });

  canvas.addEventListener('touchend', (event: TouchEvent) => {
    event.preventDefault();

    const touch = findTouch(event);

    if(touch === null) {
      return;
    }

    if(ti === null) {
      throw new Error('exception to help Flow with typing');
    }

    const touchDuration = performance.now() - ti.startedAt;

    if(touchDuration <= maxTapDuration && !ti.moved) {
      engine.dropOurPiece();
    }

    ti = null;
  });

  canvas.addEventListener('touchcancel', (event: TouchEvent) => {
    event.preventDefault();

    const touch = findTouch(event);

    if(touch === null) {
      return;
    }

    if(ti === null) {
      throw new Error('exception to help Flow with typing');
    }

    ti = null;
  });
}
