import React from 'react';
import './App.css';

function Cell({ cell, onClick, onFlag, row, col }) {
  const renderContent = () => {
    if (!cell.isRevealed) {
      return cell.isFlagged ? '🚩' : '';
    }
    if (cell.isBomb) {
      return '💣';
    }
    return cell.neighbor > 0 ? cell.neighbor : '';
  };

  return (
    <button
      type="button"
      className={`cell neighbor-${cell.neighbor} ${cell.isRevealed ? 'revealed' : ''} ${cell.isFlagged ? 'flagged' : ''}`}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onFlag();
      }}
      aria-label={`Строка ${row + 1}, колонка ${col + 1}${cell.isFlagged ? ', флаг' : ''}${cell.isRevealed ? ', открыта' : ', закрыта'}`}
      disabled={cell.isRevealed && !cell.isBomb}
    >
      {renderContent()}
    </button>
  );
}

export default Cell;
