// @flow

import assert from 'assert';

export type Player = 'player-one' | 'player-two'

export const playerOne: Player = 'player-one';
export const playerTwo: Player = 'player-two';

export const gridRows = 6;
export const gridColumns = 7;

export function toPlayer(s: mixed): Player | null {
  if(s === playerOne) {
    return playerOne;
  } else if(s === playerTwo) {
    return playerTwo;
  } else {
    return null;
  }
}

export class Game {
  _playerOneGrid: Array<Array<boolean>>;
  _playerTwoGrid: Array<Array<boolean>>;
  _winningPieceGrid: Array<Array<boolean>>;

  _nextPlayer: Player;
  _winner: Player | null;
  _drawn: boolean;

  constructor() {
    this._playerOneGrid = [];
    this._playerTwoGrid = [];
    this._winningPieceGrid = [];

    for(let row = 0; row < gridRows; row ++) {
      this._playerOneGrid.push([]);
      this._playerTwoGrid.push([]);
      this._winningPieceGrid.push([]);

      for(let column = 0; column < gridColumns; column ++) {
        this._playerOneGrid[row].push(false);
        this._playerTwoGrid[row].push(false);
        this._winningPieceGrid[row].push(false);
      }
    }

    this._nextPlayer = playerOne;
    this._winner = null;
    this._drawn = false;
  }

  playIsLegal(player: Player, column: number): boolean {
    assert(0 <= column && column < gridColumns && Number.isInteger(column));
    assert(!this.isWon && !this.isDrawn);

    return (
      player === this._nextPlayer &&
      !this._playerOneGrid[0][column] &&
      !this._playerTwoGrid[0][column]
    );
  }

  play(player: Player, column: number): number {
    assert(this.playIsLegal(player, column));

    let row = 0;

    for(; (row + 1) < gridRows; row ++) {
      if(this._playerOneGrid[row + 1][column] || this._playerTwoGrid[row + 1][column]) {
        break;
      }
    }

    this._gridFor(player)[row][column] = true;

    this._checkWinConditions(player);
    this._nextPlayer = (player === playerOne) ? playerTwo : playerOne;

    return row;
  }

  get isWon(): boolean {
    return this._winner !== null;
  }

  get isDrawn(): boolean {
    return this._drawn;
  }

  get winner(): Player {
    if(!this._winner) {
      throw new Error('exception to help Flow with typing');
    }
    return this._winner;
  }

  get nextPlayer(): Player {
    assert(!this.isWon && !this.isDrawn);
    return this._nextPlayer;
  }

  forEachCell(cb: (row: number, column: number, player: Player | null, winingPiece: boolean) => any) {
    for(let row = 0; row < gridRows; row ++) {
      for(let column = 0; column < gridColumns; column ++) {
        if(this._playerOneGrid[row][column]) {
          cb(row, column, playerOne, (this._winner === playerOne && this._winningPieceGrid[row][column]));
        } else if(this._playerTwoGrid[row][column]) {
          cb(row, column, playerTwo, (this._winner === playerTwo && this._winningPieceGrid[row][column]));
        } else {
          cb(row, column, null, false);
        }
      }
    }
  }

  _checkWinConditions(player: Player) {
    const grid = this._gridFor(player);
    const k = [0, 1, 2, 3];

    for(let r = 0; r < gridRows; r ++) {
      for(let c = 0; c < gridColumns; c ++) {
        if(!grid[r][c]) {
          continue;
        }

        if(r + 4 <= gridRows && k.every(i => grid[r + i][c])) {
          k.forEach(i => this._winningPieceGrid[r + i][c] = true);
        }

        if(c + 4 <= gridColumns && k.every(i => grid[r][c + i])) {
          k.forEach(i => this._winningPieceGrid[r][c + i] = true);
        }

        if(r + 4 <= gridRows && c + 4 <= gridColumns && k.every(i => grid[r + i][c + i])) {
          k.forEach(i => this._winningPieceGrid[r + i][c + i] = true);
        }

        if(r + 4 <= gridRows && c - 4 + 1 >= 0 && k.every(i => grid[r + i][c - i])) {
          k.forEach(i => this._winningPieceGrid[r + i][c - i] = true);
        }
      }
    }

    const isWon = this._winningPieceGrid.some(wRow => wRow.includes(true));

    if(isWon) {
      this._winner = player;
    } else {
      this._drawn = true;

      for(let r = 0; r < gridRows; r ++) {
        for(let c = 0; c < gridColumns; c ++) {
          if(!(this._playerOneGrid[r][c] || this._playerTwoGrid[r][c])) {
            this._drawn = false;
            break;
          }
        }
      }
    }
  }

  _gridFor(player: Player): Array<Array<boolean>> {
    return (player === playerOne) ? this._playerOneGrid : this._playerTwoGrid;
  }
}
