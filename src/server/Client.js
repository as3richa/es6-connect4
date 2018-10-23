// @flow

import assert from 'assert';

import logger from './logger';
import { Game, playerOne, playerTwo, gridColumns } from '../common/Game';

import type { Player } from '../common/Game';
import type { ClientState } from '../common/ClientState';

type Sender = (data: mixed) => mixed;

const nicknameRegex = /^[\w-]{1,20}$/;

const clientsByNickname: { [string]: Client } = {};

export class Client {
  _sender: Sender;
  _state: ClientState;

  _nickname: string;
  _myOpponent: Client | null;
  _myGame: Game | null;
  _myPlayer: Player | null;

  constructor(sender: Sender) {
    this._state = 'unnamed';
    this._sender = sender;

    this._nickname = '[unnamed]';
    this._myOpponent = null;
    this._myGame = null;
    this._myPlayer = null;

    this._send({ message: 'Welcome to es6-connect4! Please choose a nickname' });
  }

  nick(nickname: string) {
    if(this._state !== 'unnamed') {
      return;
    }

    nickname = nickname.trim();

    if(!nicknameRegex.exec(nickname)) {
      this._send({ message: 'Nickname may contain only alphanumeric characters, underscores, and dashes, and must be 1 to 20 characters long'});
      return;
    }

    if(clientsByNickname[nickname.toLowerCase()]) {
      this._send({ message: `The nickname ${nickname} is already taken`});
      return;
    }

    this._state = 'idle';
    this._nickname = nickname;

    clientsByNickname[nickname.toLowerCase()] = this;

    this._send({
      message: `You are now known as ${nickname}`,
      nickname: nickname
    });

    logger.info(`client has chose nickname ${nickname}`);
  }

  challenge(opponentNickname: string) {
    if(this._state !== 'idle') {
      return;
    }

    opponentNickname = opponentNickname.trim();

    const opponent = clientsByNickname[opponentNickname.toLowerCase()];

    let errorMessage: string | null = null;

    if(!opponent) {
      errorMessage = `No such opponent ${opponentNickname}`;
    } else if(opponent._state !== 'idle') {
      errorMessage = `${opponentNickname} is already occupied`;
    } else if(opponent === this) {
      errorMessage = 'You cannot challenge yourself';
    }

    if(errorMessage) {
      this._send({ message: errorMessage });
      return;
    }

    this._state = 'challenging';
    this._myOpponent = opponent;
    this._send({ message: `You have issued a challenge to ${opponent._nickname}`});

    opponent._state = 'challenged';
    opponent._myOpponent = this;
    opponent._send({ message: `You are being challenged by ${this._nickname}`});

    logger.info(`${this._nickname} has issued a challenge to ${opponent._nickname}`);
  }

  accept() {
    if(this._state !== 'challenged') {
      return;
    }

    const game = new Game();

    this._state = 'playing';
    this._myGame = game;
    this._myPlayer = playerOne;
    this._send({ opponent: this._opponent._nickname, player: this._myPlayer });

    this._opponent._state = 'playing';
    this._opponent._myGame = game;
    this._opponent._myPlayer = playerTwo;
    this._opponent._send({ opponent: this._nickname, player: this._opponent._myPlayer });

    logger.info(`${this._nickname} has accepted ${this._opponent._nickname}'s challenge`);
  }

  decline() {
    if(this._state !== 'challenged') {
      return;
    }

    const opponent = this._opponent;

    this._state = 'idle';
    this._myOpponent = null;
    this._send({ message: `You have declined ${opponent._nickname}'s challenge`});

    opponent._state = 'idle';
    opponent._myOpponent = null;
    opponent._send({ message: `${this._nickname} has declined your challenge`});

    logger.info(`${this._nickname} has declined ${opponent._nickname}'s challenge`);
  }

  cancel() {
    if(this._state !== 'challenging') {
      return;
    }

    const opponent = this._opponent;

    this._state = 'idle';
    this._myOpponent = null;
    this._send({ message: `You have canceled your challenge to ${opponent._nickname}`});

    opponent._state = 'idle';
    opponent._myOpponent = null;
    opponent._send({ message: `${this._nickname} has canceled their challenge`});

    logger.info(`${this._nickname} has canceled their challenge to ${opponent._nickname}`);
  }

  drop(column: number) {
    if(this._state !== 'playing') {
      return;
    }

    if(!(0 <= column && column < gridColumns && Number.isInteger(column))) {
      return;
    }

    const game = this._game;
    const player = this._player;

    if(!game.playIsLegal(player, column)) {
      return;
    }

    game.play(player, column);
    this._opponent._send({ drop: true, column });

    logger.info(`${this._nickname} has made a play in their game versus ${this._opponent._nickname}`);

    if(game.isWon || game.isDrawn) {
      const swap = this._player;
      this._myPlayer = this._opponent._player;
      this._opponent._myPlayer = swap;
      this._myGame = this._opponent._myGame = new Game();
    }
  }

  leave() {
    const opponent = this._opponent;

    this._state = 'idle';
    this._myOpponent = null;
    this._send({ message: 'You have left the lobby'});

    opponent._state = 'idle';
    opponent._myOpponent = null;
    opponent._send({ message: `${this._nickname} has left the lobby`});

    logger.info(`${this._nickname} has left their game versus ${opponent._nickname}`);
  }

  quit() {
    if(this._state !== 'unnamed') {
      const deleted = delete clientsByNickname[this._nickname.toLowerCase()];
      assert(deleted);
    }

    if(this._state === 'challenging') {
      this.cancel();
    } else if(this._state === 'challenged') {
      this.decline();
    } else if(this._state === 'playing') {
      this.leave();
    }
  }

  get _opponent(): Client {
    if(!this._myOpponent) {
      throw new Error('exception to help Flow with typing');
    }
    return this._myOpponent;
  }

  get _game(): Game {
    if(!this._myGame) {
      throw new Error('exception to help Flow with typing');
    }
    return this._myGame;
  }

  get _player(): Player {
    if(!this._myPlayer) {
      throw new Error('exception to help Flow with typing');
    }
    return this._myPlayer;
  }

  _send(data: { [string]: mixed }) {
    this._sender({ ...data, state: this._state });
  }
}
