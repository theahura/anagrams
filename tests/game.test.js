import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import { createGame, drawTile, submitWord, endGame } from '../src/game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');

let dict;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  dict = loadDictionary(raw);
});

describe('createGame', () => {
  it('reveals 3 face-up loose tiles at start', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    expect(game.pool.looseLetters.length).toBe(3);
  });

  it('starts with 144 - 3 = 141 face-down tiles', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    expect(game.pool.faceDown.length).toBe(141);
  });

  it('produces the same starting letters for the same daily date', () => {
    const a = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const b = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    expect(a.pool.looseLetters).toEqual(b.pool.looseLetters);
    expect(a.pool.faceDown).toEqual(b.pool.faceDown);
  });

  it('produces different starting letters for different daily dates', () => {
    const a = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const b = createGame({ mode: 'daily', date: '2026-04-26' }, dict);
    expect(a.pool.looseLetters).not.toEqual(b.pool.looseLetters);
  });

  it('starts with empty words list and zero missed draws', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    expect(game.pool.words).toEqual([]);
    expect(game.missedDrawCount).toBe(0);
  });
});

describe('drawTile', () => {
  it('reveals one new loose tile', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const next = drawTile(game, dict);
    expect(next.pool.looseLetters.length).toBe(game.pool.looseLetters.length + 1);
    expect(next.pool.faceDown.length).toBe(game.pool.faceDown.length - 1);
  });

  it('increments missedDrawCount when an anagram existed in the loose pool', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    // Force loose letters to definitely contain a word "cat"
    const seeded = {
      ...game,
      pool: { ...game.pool, looseLetters: ['c', 'a', 't'] },
    };
    const next = drawTile(seeded, dict);
    expect(next.missedDrawCount).toBe(1);
  });

  it('does not increment missedDrawCount when no anagram existed', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const seeded = {
      ...game,
      pool: { ...game.pool, looseLetters: ['x', 'q', 'z'] },
    };
    const next = drawTile(seeded, dict);
    expect(next.missedDrawCount).toBe(0);
  });

  it('marks game as ended when face-down was empty', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const seeded = {
      ...game,
      pool: { ...game.pool, faceDown: [] },
    };
    const next = drawTile(seeded, dict);
    expect(next.ended).toBe(true);
  });
});

describe('submitWord', () => {
  it('accepts a valid word and updates the pool', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const seeded = {
      ...game,
      pool: { ...game.pool, looseLetters: ['c', 'a', 't', 'd', 'o', 'g'] },
    };
    const result = submitWord(seeded, 'cat', dict);
    expect(result.ok).toBe(true);
    expect(result.game.pool.words.length).toBe(1);
    expect(result.game.pool.words[0].word).toBe('cat');
    expect(result.game.pool.looseLetters.sort()).toEqual(['d', 'g', 'o']);
  });

  it('rejects an invalid word and leaves state unchanged', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const before = JSON.parse(JSON.stringify(game));
    const result = submitWord(game, 'xqzpw', dict);
    expect(result.ok).toBe(false);
    expect(JSON.parse(JSON.stringify(game))).toEqual(before);
  });
});

describe('endGame', () => {
  it('reports total score and the full transformation chain even when intermediate words have been consumed', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const withHistory = {
      ...game,
      pool: {
        ...game.pool,
        words: [{ word: 'redefine', parents: ['refine'] }],
      },
      history: [
        { word: 'fine', parents: [] },
        { word: 'refine', parents: ['fine'] },
        { word: 'redefine', parents: ['refine'] },
      ],
      missedDrawCount: 0,
      startTime: 1000,
    };
    const result = endGame(withHistory, 5000);
    expect(result.score).toBe(16 + 36 + 64);
    expect(result.longestWord).toBe('redefine');
    expect(result.longestChain).toEqual(['fine', 'refine', 'redefine']);
    expect(result.totalTimeMs).toBe(4000);
  });

  it('returns chain of length 1 when longest word has no parents', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const withHistory = {
      ...game,
      history: [{ word: 'cat', parents: [] }],
      missedDrawCount: 0,
      startTime: 0,
    };
    const result = endGame(withHistory, 1000);
    expect(result.longestWord).toBe('cat');
    expect(result.longestChain).toEqual(['cat']);
  });
});

describe('submitWord history tracking', () => {
  it('appends each formed word to history with its parents, even after parents are consumed', () => {
    const game = createGame({ mode: 'daily', date: '2026-04-25' }, dict);
    const seeded = {
      ...game,
      pool: {
        ...game.pool,
        looseLetters: ['c', 'a', 't', 's'],
      },
    };
    const r1 = submitWord(seeded, 'cat', dict);
    expect(r1.ok).toBe(true);
    expect(r1.game.history.map((h) => h.word)).toEqual(['cat']);
    const r2 = submitWord(r1.game, 'cats', dict);
    expect(r2.ok).toBe(false);
    // Try forming a real anagram instead
    const seeded2 = {
      ...r1.game,
      pool: { ...r1.game.pool, looseLetters: ['s'] },
    };
    const r3 = submitWord(seeded2, 'acts', dict);
    expect(r3.ok).toBe(true);
    expect(r3.game.history.map((h) => h.word)).toEqual(['cat', 'acts']);
    expect(r3.game.history[1].parents).toEqual(['cat']);
    expect(r3.game.pool.words.map((w) => w.word)).toEqual(['acts']);
  });
});
