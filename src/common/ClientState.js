// @flow

export type ClientState = 'unnamed' | 'idle' | 'challenged' | 'challenging' | 'playing';

export function toClientState(s: mixed): ClientState | null {
  if(s === 'unnamed' || s === 'idle' || s === 'challenged' || s === 'challenging' || s === 'playing') {
    return s;
  }
  return null;
}
