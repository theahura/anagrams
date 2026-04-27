import { describe, it, expect } from 'vitest';
import { intersectCommonWords } from '../scripts/build-common.js';

describe('intersectCommonWords', () => {
  it('keeps only words that exist in the TWL06 dictionary', () => {
    const dict = new Set(['cat', 'dog', 'apple']);
    const out = intersectCommonWords(['the', 'cat', 'banana', 'dog'], dict);
    expect(out).toEqual(['cat', 'dog']);
  });

  it('preserves the order of the input common-list (frequency rank)', () => {
    const dict = new Set(['banana', 'cherry', 'apple']);
    const out = intersectCommonWords(['banana', 'apple', 'cherry'], dict);
    expect(out).toEqual(['banana', 'apple', 'cherry']);
  });

  it('lowercases input entries before comparison', () => {
    const dict = new Set(['cat', 'dog']);
    const out = intersectCommonWords(['CAT', 'Dog'], dict);
    expect(out).toEqual(['cat', 'dog']);
  });

  it('drops entries that are not pure alphabetic letters', () => {
    const dict = new Set(['cat', 'dog']);
    const out = intersectCommonWords(['cat', "don't", 'dog', '123', 'cat-fish'], dict);
    expect(out).toEqual(['cat', 'dog']);
  });

  it('drops profane entries even if they exist in the dictionary set', () => {
    const dict = new Set(['cat', 'shit', 'dog']);
    const out = intersectCommonWords(['cat', 'shit', 'dog'], dict);
    expect(out).toEqual(['cat', 'dog']);
  });

  it('caps the output at maxEntries', () => {
    const dict = new Set(['cat', 'dog', 'pen', 'tap', 'mat']);
    const out = intersectCommonWords(
      ['cat', 'dog', 'pen', 'tap', 'mat'],
      dict,
      { maxEntries: 3 }
    );
    expect(out.length).toBe(3);
    expect(out).toEqual(['cat', 'dog', 'pen']);
  });

  it('drops duplicates so each word appears at most once', () => {
    const dict = new Set(['cat', 'dog']);
    const out = intersectCommonWords(['cat', 'dog', 'cat', 'CAT'], dict);
    expect(out).toEqual(['cat', 'dog']);
  });
});
