import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import {
  scoreWord,
  hasLoosePoolAnagram,
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
