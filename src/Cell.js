import React from 'react';
import './App.css';

function Cell({ cell, onClick }) {
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

  return (
    <div
      className={`cell ${cell.isRevealed ? 'revealed' : ''} ${cell.isFlagged ? 'flagged' : ''}`}
      onClick={onClick}
    >
      {renderContent()}
    </div>
  );
}

export default Cell;
