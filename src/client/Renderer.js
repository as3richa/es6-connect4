// @flow

import assert from 'assert';

import { gridRows, gridColumns } from '../common/Game';
import type { Game, Player } from '../common/Game';

type Extents = {|
  canvasWidth: number,
  canvasHeight: number,
  renderWidth: number,
  renderHeight: number,
  renderLeft: number,
  renderTop: number
|}

export type Drop = {|
  row: number,
  column: number,
  ours: boolean,
  startedAt: DOMHighResTimeStamp,
  finishesAt: DOMHighResTimeStamp
|}

const colors = {
  background:        '#000080',
  board:             '#cca019',
  stroke:            '#000000',
  ourPieceOuter:     '#ee0000',
  ourPieceInner:     '#cc0000',
  theirPieceOuter:   '#00bbee',
  theirPieceInner:   '#0099cc',
  winningPieceOuter: '#ffef00',
  winningPieceInner: '#efdf00'
};

const aspectRatio = 1.42;

const scale = (() => {
  const width = 1;
  const height = 1 / aspectRatio;

  const stroke = 0.002;

  const cellSize = 0.08;
  const cellPadding = 0.008;
  const cellRadius = (cellSize - 2 * cellPadding) / 2;

  const boardPadding = 0.018;
  const boardWidth = gridColumns * cellSize + 2 * boardPadding;
  const boardHeight = gridRows * cellSize + 2 * boardPadding;
  const boardLeft = (width - boardWidth) / 2;
  const boardTop = 1.2 * cellSize;

  const cursorY = 0.05;
  const dropSpeed = 0.001;

  const columnBias = 0.75 * cellSize;

  return {
    width,
    height,
    stroke,
    cellSize,
    cellPadding,
    cellRadius,
    boardPadding,
    boardWidth,
    boardHeight,
    boardLeft,
    boardTop,
    cursorY,
    dropSpeed,
    columnBias
  };
})();

const rowY = (() => {
  const ary = [];

  for(let row = 0; row < gridRows; row ++) {
    const y = (scale.boardTop + scale.boardPadding) + (row * scale.cellSize) + scale.cellSize / 2;
    ary.push(y);
  }

  return ary;
})();

const columnX = (() => {
  const ary = [];

  for(let column = 0; column < gridColumns; column ++) {
    const x = (scale.boardLeft + scale.boardPadding) + (column * scale.cellSize) + scale.cellSize / 2;
    ary.push(x);
  }

  return ary;
})();

const pieceInnerOuterRatio = 0.83;

export class Renderer {
  _canvas: HTMLCanvasElement;
  _context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._context = canvas.getContext('2d');
  }

  computeColumn(x: number, biasToColumn: number | null): number | null {
    const { renderLeft, renderWidth } = this._computeExtents();
    x = (x - renderLeft) / renderWidth;

    if(x < (0 - scale.cellSize) || x > (scale.width + scale.cellSize)) {
      return null;
    }

    if(biasToColumn !== null && Math.abs(columnX[biasToColumn] - x) <= scale.columnBias) {
      return biasToColumn;
    }

    let bestColumn = null;
    let bestDelta = 1e100;

    for(let column = 0; column < gridColumns; column ++) {
      let delta = Math.abs(columnX[column] - x);

      if(delta < bestDelta) {
        bestColumn = column;
        bestDelta = delta;
      }
    }

    assert(bestColumn !== null);

    return bestColumn;
  }

  computeDropDuration(row: number): number {
    return (rowY[row] - scale.cursorY) / scale.dropSpeed;
  }

  render(game: Game, ourPlayer: Player, cursorColumn: number | null, drop: Drop | null) {
    assert(cursorColumn === null || drop === null);
    this._clearAndTransform();

    if(cursorColumn !== null) {
      this._drawCursor(cursorColumn);
    }

    this._drawBoard(game, ourPlayer, drop);
  }

  _clearAndTransform() {
    const ctx = this._context;
    const { canvasWidth, canvasHeight, renderWidth, renderLeft, renderTop } = this._computeExtents();    

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(renderLeft, renderTop);
    ctx.scale(renderWidth, renderWidth);

    this._context.strokeStyle = colors.stroke;
    this._context.lineWidth = scale.stroke;
  }

  _drawBoard(game: Game, ourPlayer: Player, drop: Drop | null) {
    const ctx = this._context;

    ctx.fillStyle = colors.board;
    ctx.fillRect(scale.boardLeft, scale.boardTop, scale.boardWidth, scale.boardHeight);

    const renderOneCell = (row: number, column: number, player: Player | null, winningPiece: boolean) => {
      const dropping = (drop !== null && row === drop.row && column === drop.column);

      if(player === null || dropping) {
        this._drawEmptyCell(row, column);
      } else {
        this._drawPiece(columnX[column], rowY[row], (player === ourPlayer), (winningPiece && drop === null), scale.cellRadius);
      }
    };

    game.forEachCell(renderOneCell);

    if(drop !== null) {
      this._drawDroppingPiece(drop);
    }

    ctx.strokeRect(scale.boardLeft, scale.boardTop, scale.boardWidth, scale.boardHeight);

    for(let row = 0; row < gridRows; row ++) {
      for(let column = 0; column < gridColumns; column ++) {
        ctx.beginPath();
        ctx.arc(columnX[column], rowY[row], scale.cellRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  _drawPiece(x: number, y: number, ours: boolean, winningPiece: boolean, radius: number) {
    const ctx = this._context;

    let outerColor: string;
    let innerColor: string;

    if(winningPiece) {
      outerColor = colors.winningPieceOuter;
      innerColor = colors.winningPieceInner;
    } else if(ours) {
      outerColor = colors.ourPieceOuter;
      innerColor = colors.ourPieceInner;
    } else {
      outerColor = colors.theirPieceOuter;
      innerColor = colors.theirPieceInner;
    }

    ctx.fillStyle = outerColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(x, y, radius * pieceInnerOuterRatio, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  _drawEmptyCell(row: number, column: number) {
    const ctx = this._context;
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(columnX[column], rowY[row], scale.cellRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  _drawDroppingPiece(drop: Drop) {
    const x = columnX[drop.column];

    const y = Math.min(
      rowY[drop.row],
      scale.cursorY + Math.max(0, scale.dropSpeed * (performance.now() - drop.startedAt))
    );

    const clippingPath = new Path2D();

    clippingPath.rect(0, 0, scale.width, scale.boardTop);

    for(let row = 0; row < gridRows; row ++) {
      const ry = rowY[row];

      if(Math.abs(y - ry) <= 2 * scale.cellRadius) {
        clippingPath.moveTo(x, ry);
        clippingPath.arc(x, ry, scale.cellRadius, 0, 2 * Math.PI);
      }
    }

    const ctx = this._context;
    ctx.save();
    ctx.clip(clippingPath);
    this._drawPiece(x, y, drop.ours, false, scale.cellRadius);
    ctx.restore();
  }

  _drawCursor(column: number) {
    this._drawPiece(columnX[column], scale.cursorY, true, false, scale.cellRadius);
  }

  _drawDisplay() {
  }

  _computeExtents(): Extents {
    const canvasWidth = this._canvas.offsetWidth;
    const canvasHeight = this._canvas.offsetHeight;

    let renderWidth, renderHeight;

    if(canvasWidth / aspectRatio >= canvasHeight) {
      renderWidth = canvasHeight * aspectRatio;
      renderHeight = canvasHeight;
    } else {
      renderWidth = canvasWidth;
      renderHeight = canvasWidth / aspectRatio;
    }

    const renderLeft = (canvasWidth - renderWidth) / 2;
    const renderTop = (canvasHeight - renderHeight) / 2;

    return {
      canvasWidth,
      canvasHeight,
      renderWidth,
      renderHeight,
      renderLeft,
      renderTop
    };
  }
}
