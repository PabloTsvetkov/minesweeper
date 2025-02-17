import React from 'react';
import Cell from './Cell';
import './App.css';

function Board({ board, onCellClick }) {
  return (
    <div className="board">
      {board.map((row, rIndex) => (
        <div key={rIndex} className="board-row">
          {row.map((cell, cIndex) => (
            <Cell
              key={`${rIndex}-${cIndex}`}
              cell={cell}
              onClick={() => onCellClick(rIndex, cIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Board;
