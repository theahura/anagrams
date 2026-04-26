import { createTileSet, shuffleTiles } from './tiles.js';
import { getDailyRng, getRandomRng } from './prng.js';
import { createPool, drawTile as poolDraw, formWord } from './pool.js';
import { canFormWord } from './anagramRules.js';
import { hasLoosePoolAnagram, finalScore } from './scoring.js';

const INITIAL_REVEAL = 3;

export function createGame({ mode, date }, dict) {
  const rng = mode === 'daily' ? getDailyRng(date) : getRandomRng();
  const tiles = shuffleTiles(createTileSet(), rng);
  let pool = createPool(tiles);
  for (let i = 0; i < INITIAL_REVEAL; i++) {
    pool = poolDraw(pool);
  }
  return {
    mode,
    date: mode === 'daily' ? date : null,
    pool,
    history: [],
    missedDrawCount: 0,
    ended: false,
    startTime: Date.now(),
  };
}

export function drawTile(game, dict) {
  const hadAnagram = hasLoosePoolAnagram(game.pool.looseLetters, dict);
  const next = poolDraw(game.pool);
  if (next === null) {
    return { ...game, ended: true };
  }
  return {
    ...game,
    pool: next,
    missedDrawCount: game.missedDrawCount + (hadAnagram ? 1 : 0),
    ended: false,
  };
}

export function submitWord(game, typed, dict) {
  const result = canFormWord(typed, game.pool, dict);
  if (!result.ok) return { ok: false, reason: result.reason, game };
  const word = typed.toLowerCase();
  const consumedParents = result.consumedWordIndices.map(
    (i) => game.pool.words[i].word
  );
  const newPool = formWord(game.pool, {
    word,
    consumedLoose: result.consumedLoose,
    consumedWordIndices: result.consumedWordIndices,
  });
  return {
    ok: true,
    game: {
      ...game,
      pool: newPool,
      history: [...game.history, { word, parents: consumedParents }],
    },
  };
}

export function endGame(game, nowMs) {
  const history = game.history || [];
  const score = finalScore({
    words: history,
    missedDrawCount: game.missedDrawCount,
  });
  const longest = history.reduce(
    (acc, w) => (w.word.length > acc.length ? w.word : acc),
    ''
  );
  const longestChain = buildChain(longest, history);
  const totalTimeMs = Math.max(0, (nowMs ?? Date.now()) - game.startTime);
  return {
    score,
    longestWord: longest,
    longestChain,
    totalTimeMs,
    missedDrawCount: game.missedDrawCount,
    words: game.pool.words.map((w) => w.word),
    history,
  };
}

function buildChain(target, history) {
  if (!target) return [];
  const byWord = new Map(history.map((w) => [w.word, w]));
  const chain = [target];
  let current = byWord.get(target);
  while (current && current.parents && current.parents.length > 0) {
    const parent = current.parents[0];
    chain.unshift(parent);
    current = byWord.get(parent);
  }
  return chain;
}
