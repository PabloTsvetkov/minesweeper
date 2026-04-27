const playerKey = 'minesweeper-player-id';
const statsKey = 'minesweeper-stats';

export function getPlayerId() {
  const existingId = localStorage.getItem(playerKey);

  if (existingId) {
    return existingId;
  }

  const nextId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(playerKey, nextId);
  return nextId;
}

export function getStoredStats() {
  try {
    return JSON.parse(localStorage.getItem(statsKey)) || {};
  } catch {
    return {};
  }
}

export function saveGameResult({ difficulty, won, seconds, moves, mode }) {
  const stats = getStoredStats();
  const current = stats[difficulty] || {
    played: 0,
    wins: 0,
    bestTime: null,
    dailyWins: 0,
  };

  const nextStats = {
    ...stats,
    [difficulty]: {
      played: current.played + 1,
      wins: current.wins + (won ? 1 : 0),
      dailyWins: current.dailyWins + (won && mode === 'daily' ? 1 : 0),
      bestTime: won && (current.bestTime === null || seconds < current.bestTime)
        ? seconds
        : current.bestTime,
      lastResult: {
        won,
        seconds,
        moves,
        mode,
        finishedAt: new Date().toISOString(),
      },
    },
  };

  localStorage.setItem(statsKey, JSON.stringify(nextStats));
  return nextStats;
}
