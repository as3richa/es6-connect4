// @flow

const messageCallbacks: Array<(data: mixed) => mixed> = [];
const errorCallbacks: Array<() => mixed> = [];

export function establishConnection() {
  const proto = (window.location.protocol === 'https') ? 'wss' : 'ws';
  const url = `${proto}://${window.location.hostname}`;

  const sock = new WebSocket(url);

  sock.onmessage = (raw: string) => {
    let data;

    try {
      data = JSON.parse(raw);
    } catch(e) {
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

export function onMessage(cb: (data: mixed) => mixed) {
  messageCallbacks.push(cb);
}

export function onError(cb: () => mixed) {
  errorCallbacks.push(cb);
}
