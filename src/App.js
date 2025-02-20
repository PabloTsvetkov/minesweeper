import React, { useState, useEffect } from 'react';
import Board from './Board';
import './App.css';
import ShovelIcon from './images/shovel.png';
import FlagIcon from './images/red-flag.png';
import RetryIcon from './images/retry.png';

const difficulties = {
  easy: { rows: 9, cols: 9, bombs: 10 },
  medium: { rows: 13, cols: 13, bombs: 22 },
  hard: { rows: 16, cols: 16, bombs: 40 },
};

const directions = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function generateBoard(rows, cols, bombs) {
  // создаем пустое поле
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isBomb: false,
      isRevealed: false,
      isFlagged: false,
      neighbor: 0,
    }))
  );

  // расставляем бомбы случайным образом
  let bombsPlaced = 0;
  while (bombsPlaced < bombs) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].isBomb) {
      board[r][c].isBomb = true;
      bombsPlaced++;
    }
  }

  // вычисляем количество соседних бомб для каждой ячейки
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isBomb) continue;
      let count = 0;
      for (let [dr, dc] of directions) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isBomb) {
          count++;
        }
      }
      board[r][c].neighbor = count;
    }
  }
  return board;
}

function App() {
  const [difficulty, setDifficulty] = useState(null);
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [mode, setMode] = useState('dig'); // "dig" или "flag"
  const [boardSize, setBoardSize] = useState(0);

  // пересоздаем игровое поле при выборе сложности или рестарте
  useEffect(() => {
    if (difficulty) {
      const { rows, cols, bombs } = difficulties[difficulty];
      const newBoard = generateBoard(rows, cols, bombs);
      setBoard(newBoard);
      setGameOver(false);
      setWin(false);
      setBoardSize(rows);
    }
  }, [difficulty]);

  // функция для проверки победы – если все ячейки без бомбы открыты
  const checkWin = (newBoard) => {
    for (let row of newBoard) {
      for (let cell of row) {
        if (!cell.isBomb && !cell.isRevealed) return false;
      }
    }
    return true;
  };

  // функция для рекурсивного открытия ячеек при клике на пустую ячейку
  const revealEmpty = (newBoard, r, c, rows, cols) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = newBoard[r][c];
    if (cell.isRevealed || cell.isFlagged) return;
    cell.isRevealed = true;
    if (cell.neighbor === 0) {
      for (let [dr, dc] of directions) {
        revealEmpty(newBoard, r + dr, c + dc, rows, cols);
      }
    }
  };

  // обработчик клика по ячейке
  const handleCellClick = (r, c) => {
    if (gameOver || win) return;
    const rows = board.length;
    const cols = board[0].length;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[r][c];

    // если режим "flag" – меняем состояние флага
    if (mode === 'flag') {
      if (!cell.isRevealed) {
        if (remainingBombs() > 0 && cell.isFlagged === false) {
          cell.isFlagged = true
        }
        else if (cell.isFlagged === true){
          cell.isFlagged = !cell.isFlagged;
        }
      }
    } else {
      // режим "dig"
      if (cell.isFlagged || cell.isRevealed) return;
      if (cell.isBomb) {
        cell.isRevealed = true;
        setGameOver(true);
        // раскрываем все бомбы
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (newBoard[i][j].isBomb) {
              newBoard[i][j].isRevealed = true;
            }
          }
        }
      } else {
        revealEmpty(newBoard, r, c, rows, cols);
      }
    }
    setBoard(newBoard);
    if (checkWin(newBoard)) {
      setWin(true);
    }
  };

  // считаем оставшиеся мины (бомбы - количество установленных флагов)
  const remainingBombs = () => {
    if (!difficulty) return 0;
    const totalBombs = difficulties[difficulty].bombs;
    let flagged = 0;
    for (let row of board) {
      for (let cell of row) {
        if (cell.isFlagged) flagged++;
      }
    }
    return totalBombs - flagged;
  };

  // сброс игры и выбор уровня заново
  const resetGame = () => {
    setDifficulty(null);
    setBoard([]);
    setGameOver(false);
    setWin(false);
  };

  return (
    <div className="app-container">
      {!difficulty && (
        <>
          <h1>Сапёр</h1>
          <div className="difficulty-select">
            <p>Выберите уровень сложности:</p>
            <div className="button-group">
              {Object.keys(difficulties).map(level => (
                <button key={level} onClick={() => setDifficulty(level)}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {difficulty && (
        <>
          <Board board={board} onCellClick={handleCellClick} boardSize={boardSize} />
          <div className="game-info">
            {gameOver && <p className="game-message">Вы проиграли!</p>}
            {win && <p className="game-message">Поздравляем, вы выиграли!</p>}
            <p className="bomb-counter">Осталось мин: {remainingBombs()}</p>
          </div>
          <div className="controls">
            <button className={mode === 'dig' ? 'active' : 'non-active'} onClick={() => setMode('dig')}>
              <img src={ShovelIcon} />
            </button>
            <button className={mode === 'flag' ? 'active' : 'non-active'} onClick={() => setMode('flag')}>
              <img src={FlagIcon} />
            </button>
          </div>
          <button className="reset-button" onClick={resetGame}>НАЧАТЬ ЗАНОВО<img src={RetryIcon} /></button>
        </>
      )}
    </div>
  );
}

export default App;