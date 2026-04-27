import { getPlayerId } from './storage';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const localScoresKey = 'minesweeper-local-scores';

function getLocalScores() {
  try {
    return JSON.parse(localStorage.getItem(localScoresKey)) || [];
  } catch {
    return [];
  }
}

function saveLocalScores(scores) {
  localStorage.setItem(localScoresKey, JSON.stringify(scores.slice(0, 50)));
}

export async function submitScore(score) {
  const payload = {
    ...score,
    player_id: getPlayerId(),
    created_at: new Date().toISOString(),
  };

  if (supabaseUrl && supabaseAnonKey) {
    await fetch(`${supabaseUrl}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    return;
  }

  const scores = [payload, ...getLocalScores()]
    .sort((left, right) => left.seconds - right.seconds);
  saveLocalScores(scores);
}

export async function loadLeaderboard({ difficulty, mode }) {
  if (supabaseUrl && supabaseAnonKey) {
    const params = new URLSearchParams({
      difficulty: `eq.${difficulty}`,
      mode: `eq.${mode}`,
      won: 'eq.true',
      order: 'seconds.asc',
      limit: '10',
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/scores?${params}`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (response.ok) {
      return response.json();
    }
  }

  return getLocalScores()
    .filter(score => score.difficulty === difficulty && score.mode === mode && score.won)
    .sort((left, right) => left.seconds - right.seconds)
    .slice(0, 10);
}
