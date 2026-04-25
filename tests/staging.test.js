import { describe, it, expect } from 'vitest';
import { highlightConsumption } from '../src/staging.js';

function pool(loose, words = []) {
  return {
    looseLetters: loose,
    words: words.map((w) => ({ word: w, parents: [] })),
  };
}

describe('highlightConsumption', () => {
  it('returns empty sets for empty input', () => {
    const r = highlightConsumption('', pool(['a', 'b', 'c']));
    expect([...r.loose]).toEqual([]);
    expect([...r.words]).toEqual([]);
  });

  it('highlights a single matching loose tile', () => {
    const r = highlightConsumption('a', pool(['a', 'b', 'c']));
    expect([...r.loose]).toEqual([0]);
    expect([...r.words]).toEqual([]);
  });

  it('highlights leftmost loose tile when duplicates exist', () => {
    const r = highlightConsumption('o', pool(['x', 'o', 'o', 'y']));
    expect([...r.loose]).toEqual([1]);
  });

  it('highlights both occurrences when both letters typed', () => {
    const r = highlightConsumption('oo', pool(['x', 'o', 'o', 'y']));
    expect([...r.loose].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('highlights an existing word when typed input fully covers it', () => {
    const r = highlightConsumption('rook', pool([], ['rook']));
    expect([...r.words]).toEqual([0]);
    expect([...r.loose]).toEqual([]);
  });

  it('does NOT highlight a word when typed input only partially covers it', () => {
    const r = highlightConsumption('roo', pool([], ['rook']));
    expect([...r.words]).toEqual([]);
  });

  it('highlights a word AND a residual loose tile (steal scenario)', () => {
    const r = highlightConsumption('brook', pool(['b'], ['rook']));
    expect([...r.words]).toEqual([0]);
    expect([...r.loose]).toEqual([0]);
  });

  it('skips a word that would over-consume vs typed input', () => {
    // typed "cat" — first word "cat" fits; second word "tac" would also fit
    // but only one of them can be claimed since typed only has c,a,t once each
    const r = highlightConsumption('cat', pool([], ['cat', 'tac']));
    expect(r.words.size).toBe(1);
    expect(r.words.has(0)).toBe(true);
  });

  it('claims all available letters when typed input has unclaimable extras', () => {
    // typed "cats" — only c,a,t available in loose (no s)
    const r = highlightConsumption('cats', pool(['c', 'a', 't']));
    // s is unclaimable; the three loose tiles should still be highlighted
    expect([...r.loose].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it('lowercases input before matching', () => {
    const r = highlightConsumption('CAT', pool(['c', 'a', 't']));
    expect([...r.loose].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it('chooses the word that allows the typed input to be fully claimed', () => {
    // typed='ab', words=['a','ab']: a naive left-to-right greedy claim would
    // pick 'a' first and leave 'b' unclaimable. The correct claim is 'ab'.
    // Highlight must agree with what the submission validator would consume.
    const r = highlightConsumption('ab', pool([], ['a', 'ab']));
    expect([...r.words]).toEqual([1]);
  });
});
