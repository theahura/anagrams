import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import {
  scoreWord,
  hasLoosePoolAnagram,
  hasMissedAnagram,
  finalScore,
} from '../src/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');

let dict;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  dict = loadDictionary(raw, lemmasRaw);
});

describe('scoreWord', () => {
  it('returns the square of the word length', () => {
    expect(scoreWord('cat')).toBe(9);
    expect(scoreWord('brook')).toBe(25);
    expect(scoreWord('redefine')).toBe(64);
  });
});

describe('hasLoosePoolAnagram', () => {
  it('returns true when a 3+ letter word exists in the loose pool', () => {
    expect(hasLoosePoolAnagram(['c', 'a', 't'], dict)).toBe(true);
  });

  it('returns true when a 3+ letter word exists as a subset of the loose pool', () => {
    expect(hasLoosePoolAnagram(['c', 'a', 't', 'q', 'z'], dict)).toBe(true);
  });

  it('returns false when no 3+ letter word can be formed', () => {
    expect(hasLoosePoolAnagram(['x', 'q', 'z'], dict)).toBe(false);
  });

  it('returns false when fewer than 3 letters are available', () => {
    expect(hasLoosePoolAnagram(['c', 'a'], dict)).toBe(false);
    expect(hasLoosePoolAnagram([], dict)).toBe(false);
  });
});

describe('hasMissedAnagram', () => {
  function pool({ loose = [], words = [] }) {
    return {
      faceDown: [],
      looseLetters: loose,
      words: words.map((w) => ({ word: w, parents: [] })),
    };
  }

  it('returns "loose" when a 3+ letter word exists in the loose pool only', () => {
    expect(hasMissedAnagram(pool({ loose: ['c', 'a', 't'] }), dict)).toBe('loose');
  });

  it('returns "steal" when a single-parent steal is available (rook + b -> brook)', () => {
    expect(
      hasMissedAnagram(pool({ loose: ['b'], words: ['rook'] }), dict),
    ).toBe('steal');
  });

  it('returns null when no play exists', () => {
    expect(
      hasMissedAnagram(pool({ loose: ['x', 'q', 'z'], words: [] }), dict),
    ).toBeNull();
  });

  it('does not flag a trivial-inflection-only steal (pod + s -> pods)', () => {
    expect(
      hasMissedAnagram(pool({ loose: ['s'], words: ['pod'] }), dict),
    ).toBeNull();
  });

  it('returns "loose" when both a loose-pool word and a steal are available', () => {
    expect(
      hasMissedAnagram(
        pool({ loose: ['c', 'a', 't', 'b'], words: ['rook'] }),
        dict,
      ),
    ).toBe('loose');
  });

  it('detects a steal that uses more than one loose tile (fin + e + d -> fined)', () => {
    expect(
      hasMissedAnagram(pool({ loose: ['e', 'd'], words: ['fin'] }), dict),
    ).toBe('steal');
  });
});

describe('finalScore', () => {
  it('sums word scores minus 10 per missed-anagram draw', () => {
    const state = {
      words: [{ word: 'cat' }, { word: 'brook' }],
      missedDrawCount: 2,
    };
    expect(finalScore(state)).toBe(9 + 25 - 20);
  });

  it('returns zero for an empty game', () => {
    expect(finalScore({ words: [], missedDrawCount: 0 })).toBe(0);
  });
});
