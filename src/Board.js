import React from 'react';
import Cell from './Cell';
import './App.css';

function Board({ board, onCellClick, onCellFlag }) {
  return (
    <div className="board" role="grid" aria-label="Игровое поле">
      {board.map((row, rIndex) => (
        <div key={rIndex} className="board-row" role="row">
          {row.map((cell, cIndex) => (
            <Cell
              key={`${rIndex}-${cIndex}`}
              cell={cell}
              onClick={() => onCellClick(rIndex, cIndex)}
              onFlag={() => onCellFlag(rIndex, cIndex)}
              row={rIndex}
              col={cIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Board;
