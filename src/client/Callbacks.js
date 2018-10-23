// @flow

export type Callbacks = {
  nick: (nickname: string) => void,
  challenge: (oppponentName: string) => void,
  accept: () => void,
  decline: () => void,
  cancel: () => void,
  drop: (column: number) => void,
};
