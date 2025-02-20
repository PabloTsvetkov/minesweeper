import React from 'react';
import './App.css';

function Cell({ cell, onClick, boardSize }) {
  let cellSize = 0;
  const renderContent = () => {
    if (!cell.isRevealed) {
      // Если ячейка не открыта, показываем заглушку (можно заменить на картинку)
      return cell.isFlagged ? "🚩" : "";
    }
    if (cell.isBomb) {
      // заглушка для бомбы
      return "💣";
    }
    // если нет соседних бомб, можно вернуть пустую строку
    return cell.neighbor > 0 ? cell.neighbor : "";
  };

  if (window.innerWidth <= 748) {
    cellSize = (window.innerWidth - 50) / boardSize - 2;
  }
  else {
    cellSize = 33;
  }

  return (
    <div
      className={`cell ${cell.isRevealed ? 'revealed' : ''} ${cell.isFlagged ? 'flagged' : ''}`}
      onClick={onClick}
      style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
    >
      {renderContent()}
    </div>
  );
}

export default Cell;
