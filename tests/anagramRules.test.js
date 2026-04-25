import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import { canFormWord } from '../src/anagramRules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');

let dict;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  dict = loadDictionary(raw, lemmasRaw);
});

function board(loose, words = []) {
  return {
    looseLetters: loose,
    words: words.map((w) => ({ word: w, parents: [] })),
  };
}

describe('canFormWord — basic dictionary checks', () => {
  it('accepts a 3-letter word from loose tiles', () => {
    const result = canFormWord('cat', board(['c', 'a', 't']), dict);
    expect(result.ok).toBe(true);
    expect(result.consumedLoose.sort()).toEqual(['a', 'c', 't']);
    expect(result.consumedWordIndices).toEqual([]);
  });

  it('rejects words shorter than 3 letters', () => {
    const result = canFormWord('hi', board(['h', 'i']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too-short');
  });

  it('rejects words not in the dictionary', () => {
    const result = canFormWord('xqz', board(['x', 'q', 'z']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-a-word');
  });

  it('rejects when loose letters are missing required tiles', () => {
    const result = canFormWord('cat', board(['c', 'a']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('letters-unavailable');
  });

  it('rejects profane words', () => {
    const result = canFormWord('shit', board(['s', 'h', 'i', 't']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('profane');
  });
});

describe('canFormWord — using preexisting words', () => {
  it('accepts brook formed from rook + b', () => {
    const result = canFormWord('brook', board(['b'], ['rook']), dict);
    expect(result.ok).toBe(true);
    expect(result.consumedWordIndices).toEqual([0]);
    expect(result.consumedLoose).toEqual(['b']);
  });

  it('rejects book from rook + b (must use ALL letters of rook)', () => {
    const result = canFormWord('book', board(['b'], ['rook']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('letters-unavailable');
  });

  it('accepts snub formed from nub + s', () => {
    const result = canFormWord('snub', board(['s'], ['nub']), dict);
    expect(result.ok).toBe(true);
    expect(result.consumedWordIndices).toEqual([0]);
  });

  it('rejects nubs from nub + s as a trivial inflection', () => {
    const result = canFormWord('nubs', board(['s'], ['nub']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('trivial-inflection');
  });

  it('rejects when a word is used but additional unrelated letters are not in loose pool', () => {
    const result = canFormWord('books', board(['s'], ['rook']), dict);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('letters-unavailable');
  });

  it('accepts redefine formed from refine + d + e', () => {
    const result = canFormWord('redefine', board(['d', 'e'], ['refine']), dict);
    expect(result.ok).toBe(true);
    expect(result.consumedWordIndices).toEqual([0]);
    expect(result.consumedLoose.sort()).toEqual(['d', 'e']);
  });

  it('rejects forming a word identical to a single consumed word with no new letters', () => {
    // 'rook' from rook with no new loose letters — no actual play
    const result = canFormWord('rook', board([], ['rook']), dict);
    expect(result.ok).toBe(false);
  });
});
