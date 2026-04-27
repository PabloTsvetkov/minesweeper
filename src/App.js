import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Board from './Board';
import './App.css';
import AdSlot from './AdSlot';
import { trackEvent, trackPageView } from './analytics';
import {
  checkWin,
  cloneBoard,
  countFlagged,
  createEmptyBoard,
  difficulties,
  generateBoard,
  getTodaySeed,
  revealBombs,
  revealCells,
} from './gameEngine';
import { loadLeaderboard, submitScore } from './leaderboardApi';
import { getStoredStats, saveGameResult } from './storage';

const navItems = [
  { path: '/', label: 'Игра' },
  { path: '/daily', label: 'Daily' },
  { path: '/rules', label: 'Правила' },
  { path: '/leaderboard', label: 'Рейтинг' },
];

const seoMeta = {
  '/': {
    title: 'Сапёр онлайн - играть бесплатно',
    description: 'Классический сапёр в браузере: три уровня сложности, безопасный первый ход, таймер и личные рекорды.',
  },
  '/daily': {
    title: 'Сапёр на день - один и тот же расклад для всех',
    description: 'Каждый день одно и то же поле для всех игроков. Сравните своё время с другими.',
  },
  '/rules': {
    title: 'Правила сапёра - как играть и не подорваться',
    description: 'Подробные правила сапёра: что значат числа, зачем нужны флаги и почему первый клик безопасный.',
  },
  '/leaderboard': {
    title: 'Рекорды - лучшие прохождения сапёра',
    description: 'Лучшие времена по уровням сложности и daily challenge. Локально и онлайн, если подключён сервер.',
  },
};

function setMetaContent(selector, content) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute('content', content);
  }
}

function setLinkHref(selector, href) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute('href', href);
  }
}

function updateMeta(path) {
  const meta = seoMeta[path] || seoMeta['/'];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}${path === '/' ? '' : path}` || path;

  document.title = meta.title;
  document.documentElement.lang = 'ru';

  setMetaContent('meta[name="description"]', meta.description);
  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:description"]', meta.description);
  setMetaContent('meta[property="og:url"]', `${origin}${path}`);
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:description"]', meta.description);
  setLinkHref('link[rel="canonical"]', canonical);
}

function ShovelIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="icon">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 3.5 28.5 9.5" />
        <path d="M19 7 25 13" />
        <path d="M17.5 9 11 15.5l5.5 5.5L23 14.5" />
        <path d="M11 15.5 4.5 22a3 3 0 0 0 0 4.2L5.8 27.5a3 3 0 0 0 4.2 0l6.5-6.5" />
      </g>
      <path d="M11 15.5 16.5 21" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="icon">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4v25" />
        <path d="M28 27H6" />
      </g>
      <path
        d="M8 5h15.5l-3.2 5 3.2 5H8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavLink({ path, label, currentPath, onNavigate }) {
  const isActive = currentPath === path;

  return (
    <a
      href={path}
      className={`nav-link ${isActive ? 'is-active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        onNavigate(path);
      }}
    >
      {label}
    </a>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [difficulty, setDifficulty] = useState(null);
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [tool, setTool] = useState('dig');
  const [firstMove, setFirstMove] = useState(true);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const [stats, setStats] = useState(() => getStoredStats());
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState('beginner');
  const [leaderboardMode, setLeaderboardMode] = useState('classic');
  const [lastShareText, setLastShareText] = useState('');
  const [toolToast, setToolToast] = useState('');
  const [toolHintVisible, setToolHintVisible] = useState(false);
  const leaderboardRef = useRef([]);

  const isGamePage = path === '/' || path === '/daily';
  const gameMode = path === '/daily' ? 'daily' : 'classic';
  const settings = difficulty ? difficulties[difficulty] : null;
  const dailySeed = useMemo(() => `${getTodaySeed()}-${difficulty || 'beginner'}`, [difficulty]);

  const remainingBombs = () => {
    if (!difficulty) return 0;
    return Math.max(difficulties[difficulty].bombs - countFlagged(board), 0);
  };

  const navigate = useCallback((nextPath) => {
    if (nextPath === window.location.pathname) return;
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
    if (typeof window.scrollTo === 'function' && process.env.NODE_ENV !== 'test') {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch {
        // older browsers ignore options; safe to skip
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    updateMeta(path);
    trackPageView(path);
  }, [path]);

  useEffect(() => {
    if (!isGamePage) {
      setDifficulty(null);
      setBoard([]);
      setGameOver(false);
      setWin(false);
      setStarted(false);
      setFirstMove(true);
      setSeconds(0);
      setMoves(0);
      setLastShareText('');
    }
  }, [isGamePage, path]);

  useEffect(() => {
    if (!started || gameOver || win) return undefined;

    const timerId = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameOver, started, win]);

  useEffect(() => {
    if (!toolToast) return undefined;
    const timeoutId = setTimeout(() => setToolToast(''), 1300);
    return () => clearTimeout(timeoutId);
  }, [toolToast]);

  const selectTool = useCallback((nextTool, source = 'click') => {
    setTool(nextTool);

    if (source === 'space') {
      const label = nextTool === 'dig' ? 'Лопата' : 'Флаг';
      setToolToast(`${label}: переключено пробелом`);
    }
  }, []);

  const toggleTool = useCallback(() => {
    selectTool(tool === 'dig' ? 'flag' : 'dig', 'space');
  }, [selectTool, tool]);

  useEffect(() => {
    if (!isGamePage) return undefined;

    const handleKeyDown = (event) => {
      if (event.code !== 'Space' || !difficulty) return;

      const target = event.target;
      const isFormControl =
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (isFormControl) return;

      event.preventDefault();
      toggleTool();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [difficulty, isGamePage, toggleTool]);

  useEffect(() => {
    let cancelled = false;

    loadLeaderboard({ difficulty: leaderboardDifficulty, mode: leaderboardMode })
      .then((scores) => {
        if (cancelled) return;

        const previous = leaderboardRef.current;
        const isSame =
          previous.length === scores.length &&
          previous.every((entry, index) => entry === scores[index]);

        if (isSame) return;

        leaderboardRef.current = scores;
        setLeaderboard(scores);
      })
      .catch(() => {
        if (cancelled || leaderboardRef.current.length === 0) return;

        leaderboardRef.current = [];
        setLeaderboard([]);
      });

    return () => {
      cancelled = true;
    };
  }, [leaderboardDifficulty, leaderboardMode, win]);

  const startGame = (nextDifficulty) => {
    const nextSettings = difficulties[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createEmptyBoard(nextSettings.rows, nextSettings.cols));
    setGameOver(false);
    setWin(false);
    selectTool('dig');
    setFirstMove(true);
    setStarted(false);
    setSeconds(0);
    setMoves(0);
    setLastShareText('');
    trackEvent('difficulty_selected', { difficulty: nextDifficulty, mode: gameMode });
  };

  const finishGame = (newBoard, won, nextSeconds, nextMoves) => {
    if (won) {
      setWin(true);
      trackEvent('game_win', { difficulty, mode: gameMode, seconds: nextSeconds, moves: nextMoves });
    } else {
      setGameOver(true);
      trackEvent('game_loss', { difficulty, mode: gameMode, seconds: nextSeconds, moves: nextMoves });
    }

    const nextStats = saveGameResult({
      difficulty,
      won,
      seconds: nextSeconds,
      moves: nextMoves,
      mode: gameMode,
    });

    setStats(nextStats);

    if (won) {
      submitScore({
        difficulty,
        mode: gameMode,
        seconds: nextSeconds,
        moves: nextMoves,
        won,
        seed: gameMode === 'daily' ? dailySeed : null,
      }).catch(() => {});
      setLastShareText(
        `Прошёл сапёра (${difficulties[difficulty].label}) за ${nextSeconds} с. Попробуешь быстрее?`
      );
    }

    setBoard(newBoard);
  };

  const handleCellFlag = (row, col) => {
    if (gameOver || win || !board.length) return;

    const newBoard = cloneBoard(board);
    const cell = newBoard[row][col];

    if (cell.isRevealed) return;
    if (!cell.isFlagged && remainingBombs() <= 0) return;

    cell.isFlagged = !cell.isFlagged;
    setBoard(newBoard);
    trackEvent('flag_used', { difficulty, mode: gameMode });
  };

  const handleCellClick = (row, col) => {
    if (gameOver || win || !settings) return;

    if (tool === 'flag') {
      handleCellFlag(row, col);
      return;
    }

    let newBoard = cloneBoard(board);

    if (firstMove) {
      newBoard = generateBoard({
        ...settings,
        safeCell: { row, col },
        seed: gameMode === 'daily' ? dailySeed : null,
      });
      setFirstMove(false);
      setStarted(true);
      trackEvent('game_start', { difficulty, mode: gameMode });
      trackEvent('first_click', { difficulty, mode: gameMode });
    }

    const cell = newBoard[row][col];

    if (cell.isFlagged || cell.isRevealed) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);

    if (cell.isBomb) {
      cell.isRevealed = true;
      revealBombs(newBoard);
      finishGame(newBoard, false, seconds, nextMoves);
      return;
    }

    revealCells(newBoard, row, col);

    if (checkWin(newBoard)) {
      finishGame(newBoard, true, seconds, nextMoves);
      return;
    }

    setBoard(newBoard);
  };

  const handleToolHover = () => {
    const stored = Number(localStorage.getItem('minesweeper-tool-hint-views') || '0');
    if (stored < 4) {
      setToolHintVisible(true);
      localStorage.setItem('minesweeper-tool-hint-views', String(stored + 1));
    }
  };

  const resetDifficulty = () => {
    setDifficulty(null);
    setBoard([]);
    setGameOver(false);
    setWin(false);
    setStarted(false);
    setFirstMove(true);
    setSeconds(0);
    setMoves(0);
    trackEvent('restart', { mode: gameMode });
  };

  const shareResult = async () => {
    if (!lastShareText) return;

    if (navigator.share) {
      await navigator.share({ text: lastShareText, url: window.location.href });
      return;
    }

    await navigator.clipboard.writeText(`${lastShareText} ${window.location.href}`);
  };

  const renderGamePage = () => (
    <section className="page page-game" aria-labelledby="game-title">
      <header className="page-header">
        <h1 id="game-title">
          {gameMode === 'daily' ? 'Сапёр на сегодня' : 'Сапёр'}
        </h1>
        <p className="page-lead">
          {gameMode === 'daily'
            ? 'Один расклад на день для всех. Проходи и сравнивай время.'
            : 'Открывай клетки, помечай мины. Чем меньше времени, тем лучше.'}
        </p>
      </header>

      {!difficulty && (
        <div className="difficulty-card">
          <p className="difficulty-card__title">Выбери поле</p>
          <div className="difficulty-card__grid">
            {Object.entries(difficulties).map(([level, config]) => {
              const personalBest = stats[level]?.bestTime;
              return (
                <button
                  key={level}
                  type="button"
                  className="difficulty-option"
                  onClick={() => startGame(level)}
                >
                  <span className="difficulty-option__title">{config.label}</span>
                  <span className="difficulty-option__meta">
                    {config.rows}×{config.cols}, {config.bombs} мин
                  </span>
                  <span className="difficulty-option__record">
                    {personalBest ? `Рекорд: ${personalBest} с` : 'Рекорда пока нет'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {difficulty && (
        <>
          <div className="game-dashboard" aria-live="polite">
            <span><strong>{remainingBombs()}</strong>мин осталось</span>
            <span><strong>{seconds}</strong>секунд</span>
            <span><strong>{moves}</strong>ходов</span>
            <span>
              <strong>{stats[difficulty]?.bestTime ? `${stats[difficulty].bestTime} с` : '—'}</strong>
              ваш рекорд
            </span>
          </div>

          <div className="tool-panel">
            <p className="tool-panel__label">Инструмент</p>
            <div className="tool-panel__buttons" onMouseLeave={() => setToolHintVisible(false)}>
              <button
                className={`tool-button ${tool === 'dig' ? 'is-active' : ''}`}
                onClick={() => selectTool('dig')}
                onMouseEnter={handleToolHover}
                onFocus={handleToolHover}
                type="button"
                aria-label="Выбрать лопату"
                aria-pressed={tool === 'dig'}
              >
                <ShovelIcon />
                <span>Лопата</span>
              </button>
              <button
                className={`tool-button ${tool === 'flag' ? 'is-active' : ''}`}
                onClick={() => selectTool('flag')}
                onMouseEnter={handleToolHover}
                onFocus={handleToolHover}
                type="button"
                aria-label="Выбрать флаг"
                aria-pressed={tool === 'flag'}
              >
                <FlagIcon />
                <span>Флаг</span>
              </button>
            </div>
            {toolHintVisible && (
              <div className="tool-hint" role="status">
                Нажми пробел, чтобы быстро сменить инструмент.
              </div>
            )}
            {toolToast && (
              <div className="tool-toast" role="status">
                {toolToast}
              </div>
            )}
          </div>

          <Board board={board} onCellClick={handleCellClick} onCellFlag={handleCellFlag} />

          <div className="game-info">
            {gameOver && <p className="game-message">Мина. Не повезло, давай ещё раз.</p>}
            {win && <p className="game-message is-success">Чисто! Время записано.</p>}
            {firstMove && (
              <p className="hint">Первый клик не подорвёт — поле построится вокруг твоего хода.</p>
            )}
          </div>

          <div className="actions">
            <button
              className="primary-button"
              onClick={() => startGame(difficulty)}
              type="button"
            >
              Новая партия
            </button>
            <button className="ghost-button" onClick={resetDifficulty} type="button">
              Сменить уровень
            </button>
            {lastShareText && (
              <button className="ghost-button" onClick={shareResult} type="button">
                Поделиться
              </button>
            )}
          </div>

          <AdSlot placement="result" className="result-ad" />
        </>
      )}
    </section>
  );

  const renderRulesPage = () => (
    <section className="page page-rules" aria-labelledby="rules-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'Как играть в сапёра',
            description:
              'Подробные правила сапёра: открытие клеток, числа, флаги и условия победы.',
            inLanguage: 'ru',
            step: [
              { '@type': 'HowToStep', name: 'Сделай первый ход', text: 'Открой любую клетку. Первый клик гарантированно безопасный.' },
              { '@type': 'HowToStep', name: 'Читай числа', text: 'Число показывает, сколько мин в восьми соседних клетках вокруг.' },
              { '@type': 'HowToStep', name: 'Ставь флаги', text: 'Помечай флагами клетки, где ты уверен в мине, чтобы не запутаться.' },
              { '@type': 'HowToStep', name: 'Открой все безопасные клетки', text: 'Победа фиксируется, когда открыты все клетки без мин.' },
            ],
          }),
        }}
      />
      <header className="page-header">
        <h1 id="rules-title">Правила сапёра</h1>
        <p className="page-lead">
          Сапёр не про удачу. Это про чтение поля: одна цифра почти всегда подсказывает следующий ход.
          Ниже — короткое и честное объяснение, без воды.
        </p>
      </header>

      <article className="prose">
        <h2>Что вообще на поле</h2>
        <p>
          Поле — это сетка квадратов. Где-то под ними прячутся мины, всё остальное — пустые клетки.
          Задача простая: открыть все безопасные клетки и не наступить на мину.
        </p>

        <h2>Как ходить</h2>
        <ul>
          <li>Левый клик — открыть клетку.</li>
          <li>Правый клик или режим «Флаг» — поставить флаг туда, где, по твоей версии, спрятана мина.</li>
          <li>Пробел — быстро переключить инструмент между лопатой и флагом.</li>
        </ul>

        <h2>Что значат числа</h2>
        <p>
          Число в открытой клетке — это количество мин в восьми соседних клетках вокруг неё.
          Если стоит «1», значит ровно одна из соседок — мина. Если «3» — три соседки опасные.
          Пустая открытая клетка означает, что мин рядом нет, и игра автоматически открывает соседей,
          пока не дойдёт до клеток с числами.
        </p>

        <h2>Почему первый клик безопасный</h2>
        <p>
          В этой версии мины расставляются после первого хода, а не до него. Это не упрощение —
          это стандарт современных сапёров: тебе не нужно гадать на старте, игра гарантирует,
          что первая открытая клетка и её ближайшие соседи будут пустыми.
        </p>

        <h2>Когда ты выиграл</h2>
        <p>
          Победа фиксируется, когда открыты все клетки без мин. Флаги для победы не обязательны —
          они нужны только тебе, чтобы не путаться. Время и количество ходов записываются,
          лучший результат сохраняется в твоём браузере.
        </p>

        <h2>Когда ты проиграл</h2>
        <p>
          Любое попадание на мину завершает партию: поле раскрывается, и видно, где ты ошибся.
          Это нормально — сапёр иногда требует риска, но на хорошем уровне такие ситуации
          встречаются редко.
        </p>

        <h2>Сложности</h2>
        <p>
          Уровни отличаются размером поля и плотностью мин:
        </p>
        <ul>
          <li>Новичок — 9×9, 10 мин. Подходит, чтобы привыкнуть к интерфейсу.</li>
          <li>Любитель — 13×13, 22 мины. Уже нужно думать, а не просто кликать.</li>
          <li>Эксперт — 16×16, 40 мин. Тут считается каждое движение.</li>
        </ul>

        <h2>Daily-режим</h2>
        <p>
          В разделе Daily у всех игроков одно и то же поле на день. Это удобно, чтобы сравнивать
          время с собой вчерашним и с другими.
        </p>
      </article>
    </section>
  );

  const renderLeaderboardPage = () => (
    <section className="page page-leaderboard" aria-labelledby="leaderboard-title">
      <header className="page-header">
        <h1 id="leaderboard-title">Рекорды</h1>
        <p className="page-lead">
          Лучшие прохождения по уровням и режимам. Если сервер рекордов не подключён,
          здесь видны только твои локальные результаты.
        </p>
      </header>

      <div className="leaderboard-filters" role="group" aria-label="Фильтры рейтинга">
        <div className="leaderboard-filters__group">
          {Object.entries(difficulties).map(([level, config]) => (
            <button
              key={level}
              type="button"
              className={`chip ${leaderboardDifficulty === level ? 'is-active' : ''}`}
              onClick={() => setLeaderboardDifficulty(level)}
            >
              {config.label}
            </button>
          ))}
        </div>
        <div className="leaderboard-filters__group">
          <button
            type="button"
            className={`chip ${leaderboardMode === 'classic' ? 'is-active' : ''}`}
            onClick={() => setLeaderboardMode('classic')}
          >
            Классика
          </button>
          <button
            type="button"
            className={`chip ${leaderboardMode === 'daily' ? 'is-active' : ''}`}
            onClick={() => setLeaderboardMode('daily')}
          >
            Daily
          </button>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="empty-state">
          <p>Пока пусто. Сыграй партию — твой результат появится здесь.</p>
        </div>
      ) : (
        <ol className="leaderboard-list">
          {leaderboard.map((score, index) => (
            <li key={`${score.player_id || 'local'}-${score.created_at || index}`}>
              <span className="leaderboard-list__rank">#{index + 1}</span>
              <span className="leaderboard-list__time">{score.seconds} с</span>
              <span className="leaderboard-list__meta">{score.moves} ходов</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  const renderPage = () => {
    if (path === '/rules') return renderRulesPage();
    if (path === '/leaderboard') return renderLeaderboardPage();
    return renderGamePage();
  };

  return (
    <div className="layout">
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>

      <header className="site-header">
        <div className="site-header__inner">
          <button
            type="button"
            className="brand"
            onClick={() => navigate('/')}
            aria-label="На главную"
          >
            <span className="brand__mark" aria-hidden="true">●</span>
            <span className="brand__name">Сапёр</span>
          </button>

          <nav className="primary-nav" aria-label="Основная навигация">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                path={item.path}
                label={item.label}
                currentPath={path}
                onNavigate={navigate}
              />
            ))}
          </nav>
        </div>
      </header>

      <div className="app-shell">
        <AdSlot placement="left" className="desktop-ad" />

        <main id="main-content" className="content panel">
          {renderPage()}
        </main>

        <AdSlot placement="right" className="desktop-ad" />
      </div>
    </div>
  );
}

export default App;
