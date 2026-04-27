import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import { startGhost } from '../src/ghost.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');

let dict;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  dict = loadDictionary(raw, lemmasRaw, {
    schemaVersion: 1,
    words: ['rook', 'brook', 'cat', 'cats', 'acts'],
  });
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function makeGameWithSteal() {
  return {
    pool: {
      faceDown: ['x'],
      looseLetters: ['b'],
      words: [{ word: 'rook', parents: [], owner: 'human' }],
    },
    ended: false,
  };
}

function makeGameWithoutSteal() {
  return {
    pool: {
      faceDown: ['x'],
      looseLetters: [],
      words: [{ word: 'rook', parents: [], owner: 'human' }],
    },
    ended: false,
  };
}

describe('startGhost', () => {
  it('does not steal before the first delay window has elapsed', () => {
    let game = makeGameWithSteal();
    const onSteal = vi.fn((newPool) => { game = { ...game, pool: newPool }; });
    const handle = startGhost({
      getGame: () => game,
      dict,
      random: () => 0,
      onSteal,
    });
    vi.advanceTimersByTime(9999);
    expect(onSteal).not.toHaveBeenCalled();
    handle.stop();
  });

  it('performs a steal once the scheduled delay elapses, replacing the human-owned word with a ghost-owned one', () => {
    let game = makeGameWithSteal();
    const onSteal = vi.fn((newPool) => { game = { ...game, pool: newPool }; });
    const handle = startGhost({
      getGame: () => game,
      dict,
      random: () => 0,
      onSteal,
    });
    vi.advanceTimersByTime(10000);
    expect(onSteal).toHaveBeenCalledTimes(1);
    expect(game.pool.words.map((w) => w.word)).toEqual(['brook']);
    expect(game.pool.words[0].owner).toBe('ghost');
    handle.stop();
  });

  it('reschedules and tries again later when no steal is currently legal', () => {
    let game = makeGameWithoutSteal();
    const onSteal = vi.fn((newPool) => { game = { ...game, pool: newPool }; });
    const handle = startGhost({
      getGame: () => game,
      dict,
      random: () => 0,
      onSteal,
    });
    vi.advanceTimersByTime(10000);
    expect(onSteal).not.toHaveBeenCalled();
    // Make a steal possible: add a loose 'b'
    game = {
      ...game,
      pool: { ...game.pool, looseLetters: ['b'] },
    };
    vi.advanceTimersByTime(10000);
    expect(onSteal).toHaveBeenCalledTimes(1);
    expect(game.pool.words.map((w) => w.word)).toEqual(['brook']);
    handle.stop();
  });

  it('cancels pending timeouts when stop() is called', () => {
    let game = makeGameWithSteal();
    const onSteal = vi.fn((newPool) => { game = { ...game, pool: newPool }; });
    const handle = startGhost({
      getGame: () => game,
      dict,
      random: () => 0,
      onSteal,
    });
    handle.stop();
    vi.advanceTimersByTime(60000);
    expect(onSteal).not.toHaveBeenCalled();
  });

  it('does not act after the game has ended', () => {
    let game = { ...makeGameWithSteal(), ended: true };
    const onSteal = vi.fn();
    const handle = startGhost({
      getGame: () => game,
      dict,
      random: () => 0,
      onSteal,
    });
    vi.advanceTimersByTime(60000);
    expect(onSteal).not.toHaveBeenCalled();
    handle.stop();
  });
});
