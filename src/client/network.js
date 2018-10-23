// @flow

const messageCallbacks: Array<(data: Object) => void> = [];
const errorCallbacks: Array<() => void> = [];
let sock: WebSocket | null = null;

export function establishConnection() {
  const proto = (window.location.protocol === 'https') ? 'wss' : 'ws';
  const url = `${proto}://${window.location.hostname}:${window.location.port}`;

  sock = new WebSocket(url);

  sock.onmessage = (raw: MessageEvent) => {
    let data: mixed;

    if(typeof(raw.data) !== 'string') {
      return;
    }

    try {
      data = JSON.parse(raw.data);
    } catch(e) {
      return;
    }

    if(typeof(data) !== 'object') {
      return;
    }

    for(const cb of messageCallbacks) {
      cb(data);
    }
  };

  const onError = () => {
    for(const cb of errorCallbacks) {
      cb();
    }
  };

  sock.onclose = onError;
  sock.onerror = onError;
}

export function onMessage(cb: (data: Object) => void) {
  messageCallbacks.push(cb);
}

export function onError(cb: () => void) {
  errorCallbacks.push(cb);
}

export function send(data: Object) {
  if(sock === null) {
    throw new Error('exception to help Flow with typing');
  }
  const serialized = JSON.stringify(data);
  sock.send(serialized);
}
