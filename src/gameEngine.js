export const difficulties = {
  beginner: {
    label: 'Новичок',
    rows: 9,
    cols: 9,
    bombs: 10,
  },
  intermediate: {
    label: 'Любитель',
    rows: 13,
    cols: 13,
    bombs: 22,
  },
  expert: {
    label: 'Эксперт',
    rows: 16,
    cols: 16,
    bombs: 40,
  },
};

export const directions = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

export function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isBomb: false,
      isRevealed: false,
      isFlagged: false,
      neighbor: 0,
    }))
  );
}

export function cloneBoard(board) {
  return board.map(row => row.map(cell => ({ ...cell })));
}

export function createSeededRandom(seed) {
  let value = 0;

  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function isProtectedCell(row, col, safeCell, protectRadius) {
  if (!safeCell) return false;

  return (
    Math.abs(row - safeCell.row) <= protectRadius &&
    Math.abs(col - safeCell.col) <= protectRadius
  );
}

export function generateBoard({ rows, cols, bombs, safeCell = null, seed = null, protectRadius = 1 }) {
  const board = createEmptyBoard(rows, cols);
  const random = seed ? createSeededRandom(seed) : Math.random;
  const availableCells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isProtectedCell(row, col, safeCell, protectRadius)) {
        availableCells.push([row, col]);
      }
    }
  }

  for (let index = availableCells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [availableCells[index], availableCells[swapIndex]] = [availableCells[swapIndex], availableCells[index]];
  }

  availableCells.slice(0, bombs).forEach(([row, col]) => {
    board[row][col].isBomb = true;
  });

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (board[row][col].isBomb) continue;

      board[row][col].neighbor = directions.reduce((count, [rowOffset, colOffset]) => {
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        const hasBomb = (
          nextRow >= 0 &&
          nextRow < rows &&
          nextCol >= 0 &&
          nextCol < cols &&
          board[nextRow][nextCol].isBomb
        );

        return hasBomb ? count + 1 : count;
      }, 0);
    }
  }

  return board;
}

export function revealCells(board, row, col) {
  const rows = board.length;
  const cols = board[0]?.length || 0;
  const stack = [[row, col]];

  while (stack.length > 0) {
    const [currentRow, currentCol] = stack.pop();

    if (currentRow < 0 || currentRow >= rows || currentCol < 0 || currentCol >= cols) {
      continue;
    }

    const cell = board[currentRow][currentCol];

    if (cell.isRevealed || cell.isFlagged) {
      continue;
    }

    cell.isRevealed = true;

    if (cell.neighbor === 0 && !cell.isBomb) {
      directions.forEach(([rowOffset, colOffset]) => {
        stack.push([currentRow + rowOffset, currentCol + colOffset]);
      });
    }
  }
}

export function revealBombs(board) {
  board.forEach(row => {
    row.forEach(cell => {
      if (cell.isBomb) {
        cell.isRevealed = true;
      }
    });
  });
}

export function checkWin(board) {
  return board.every(row => row.every(cell => cell.isBomb || cell.isRevealed));
}

export function countFlagged(board) {
  return board.reduce(
    (total, row) => total + row.filter(cell => cell.isFlagged).length,
    0
  );
}

export function getTodaySeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
