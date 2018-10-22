// @flow

import assert from 'assert';

import { Game, gridColumns, playerOne, playerTwo } from '../common/Game';
import { Renderer } from './Renderer';

import type { Player } from '../common/Game';
import type { Drop } from './Renderer';

const centerColumn = Math.floor(gridColumns / 2);
const freezeDuration = 3000;

export class Engine {
  _renderer: Renderer;

  _ourPlayer: Player;
  _ourNickname: string;
  _ourScore: number;

  _opponentPlayer: Player;
  _opponentNickname: string;
  _opponentScore: number;

  _game: Game;

  _memoizedDrop: Drop | null;
  _memoizedCursorColumn: number | null;

  _resetTimeoutId: TimeoutID | null;

  constructor(canvas: HTMLCanvasElement) {
    this._renderer = new Renderer(canvas);

    this._ourPlayer = playerOne;
    this._ourNickname = 'Adam';
    this._ourScore = 0;

    this._opponentPlayer = playerTwo;
    this._opponentNickname = 'Ignatius';
    this._opponentScore = 0;

    this._game = new Game();

    this._memoizedDrop = null;
    this._memoizedCursorColumn = null;

    this._resetTimeoutId = null;
  }

  setNickname(nickname: string) {
    this._ourNickname = nickname;
  }

  newSession(opponentNickname: string, ourPlayer: Player) {
    this._reset();

    this._ourPlayer = ourPlayer;
    this._ourScore = 0;

    this._opponentPlayer = ((ourPlayer === playerOne) ? playerTwo : playerOne);
    this._opponentScore = 0;
    this._opponentNickname = opponentNickname;

    this._game = new Game();

    this._memoizedDrop = null;
    this._memoizedCursorColumn = null;
  }

  moveCursorToX(canvasX: number): {| handled: boolean, moved: boolean |} {
    if(!this._cursorIsActive) {
      return { handled: false, moved: false };
    }

    const column = this._cursorColumn();

    let newColumn = this._renderer.computeColumn(canvasX, column);

    if(newColumn === null) {
      newColumn = column;
    }

    this._memoizedCursorColumn = newColumn;
    return { handled: true, moved: (newColumn !== column) };
  }

  moveCursorTo(column: number) {
    if(!this._cursorIsActive) {
      return;
    }
    this._memoizedCursorColumn = column;
  }

  moveCursorLeft(): boolean {
    if(!this._cursorIsActive) {
      return false;
    }

    this._memoizedCursorColumn = Math.max(0, this._cursorColumn() - 1);
    return true;
  }

  moveCursorRight(): boolean {
    if(!this._cursorIsActive) {
      return false;
    }

    this._memoizedCursorColumn = Math.min(gridColumns - 1, this._cursorColumn() + 1);
    return true;
  }

  dropOurPiece(): boolean {
    if(!this._cursorIsActive) {
      return false;
    }

    const column = this._cursorColumn();

    if(this._drop(true, column)) {
      this._memoizedCursorColumn = null;
      return true;
    }

    return false;
  }

  dropOpponentPiece(column: number) {
    this._reset();
    this._drop(false, column);
  }

  skipDropAnimation() {
    this._memoizedDrop = null;
  }

  renderFrame() {
    const cursorColumn = (this._cursorIsActive) ? this._cursorColumn() : null;
    const drop = this._ongoingDrop();
    this._renderer.render(this._game, this._ourPlayer, cursorColumn, drop);
  }

  get _cursorIsActive(): boolean {
    return (
      this._ongoingDrop() === null &&
      !this._game.isWon &&
      !this._game.isDrawn &&
      this._game.nextPlayer === this._ourPlayer
    );
  }

  _cursorColumn(): number {
    assert(this._cursorIsActive);
    return (this._memoizedCursorColumn === null) ? centerColumn : this._memoizedCursorColumn;
  }

  _ongoingDrop(): Drop | null {
    const ongoingDrop = this._memoizedDrop;

    if(ongoingDrop === null) {
      return null;
    }

    if(performance.now() < ongoingDrop.finishesAt) {
      return ongoingDrop;
    }

    return (this._memoizedDrop = null);
  }

  _drop(ours: boolean, column: number): boolean {
    const player = (ours) ? this._ourPlayer : this._opponentPlayer;

    if(!this._game.playIsLegal(player, column)) {
      return false;
    }

    const row = this._game.play(player, column);

    const startedAt = performance.now();
    const finishesAt = startedAt + this._renderer.computeDropDuration(row);

    this._memoizedDrop = {
      row,
      column,
      ours,
      startedAt,
      finishesAt
    };

    if(this._game.isWon || this._game.isDrawn) {
      const delay = (finishesAt - startedAt) + freezeDuration;
      this._resetTimeoutId = setTimeout(() => { this._reset(); }, delay);
    }

    return true;
  }

  _reset() {
    if(this._resetTimeoutId == null) {
      return;
    }

    this._resetTimeoutId = null;

    if(this._game.isWon) {
      if(this._game.winner === this._ourPlayer) {
        this._ourScore ++;
      } else {
        this._opponentScore ++;
      }
    }

    this._game = new Game();
  }
}
