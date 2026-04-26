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

describe('highlightConsumption with claim trail', () => {
  it('honours the trail-bound loose tile identity over leftmost-first matching', () => {
    // Rack ['r','r','t','s'], typed='r' came from clicking tile index 1.
    // Without trail: highlight returns {0} (leftmost). With trail: returns {1}.
    const trail = [{ kind: 'loose', sourceIndex: 1, letter: 'r' }];
    const r = highlightConsumption('r', pool(['r', 'r', 't', 's']), trail);
    expect([...r.loose]).toEqual([1]);
  });

  it('keeps two distinct trail-bound tiles highlighted together', () => {
    // Rack ['r','r','t','s'], two clicks: tile 0 then tile 1 → typed='rr'.
    const trail = [
      { kind: 'loose', sourceIndex: 0, letter: 'r' },
      { kind: 'loose', sourceIndex: 1, letter: 'r' },
    ];
    const r = highlightConsumption('rr', pool(['r', 'r', 't', 's']), trail);
    expect([...r.loose].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('uses greedy fallback for typed-only trail entries', () => {
    // Rack ['c','a','t','s']. User typed 'cat' — all-typed trail. Old behaviour
    // (greedy leftmost-of-letter) is preserved.
    const trail = [
      { kind: 'typed', letter: 'c' },
      { kind: 'typed', letter: 'a' },
      { kind: 'typed', letter: 't' },
    ];
    const r = highlightConsumption('cat', pool(['c', 'a', 't', 's']), trail);
    expect([...r.loose].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it('mixes identity-bound and typed entries', () => {
    // Rack ['r','r','a','t']: trail = [click tile 1 (R), then typed "a"].
    // Identity claim → tile 1. Greedy fallback for "a" → tile 2.
    const trail = [
      { kind: 'loose', sourceIndex: 1, letter: 'r' },
      { kind: 'typed', letter: 'a' },
    ];
    const r = highlightConsumption('ra', pool(['r', 'r', 'a', 't']), trail);
    expect([...r.loose].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('greedy fallback skips identity-claimed tiles', () => {
    // Rack ['r','r','t']. trail: identity-click tile 0 (R), then typed 'r'.
    // Identity → tile 0. Greedy 'r' should NOT re-claim tile 0; picks tile 1.
    const trail = [
      { kind: 'loose', sourceIndex: 0, letter: 'r' },
      { kind: 'typed', letter: 'r' },
    ];
    const r = highlightConsumption('rr', pool(['r', 'r', 't']), trail);
    expect([...r.loose].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('honours identity-bound word index when greedy could pick a different one', () => {
    // Pool words=['cat','rat']. Trail: identity-click word 1 (rat).
    // Greedy alone would also accept word 0 ('cat' covers letters c,a,t)?
    // Here typed = 'rat' so word 0 doesn't fit. Use a stricter test:
    // typed='at' — both 'cat' and 'rat' contain 'at' as a multi-char prefix
    // but neither is fully covered. Trail still binds word 1.
    // Actually test with proper full-word identity:
    // typed = 'rat' (full match for word 1). Trail = identity entries for word 1.
    const trail = [
      { kind: 'word', sourceIndex: 1, letter: 'r' },
      { kind: 'word', sourceIndex: 1, letter: 'a' },
      { kind: 'word', sourceIndex: 1, letter: 't' },
    ];
    const r = highlightConsumption('rat', pool([], ['cat', 'rat']), trail);
    expect([...r.words]).toEqual([1]);
  });

  it('falls back to greedy word matching when no identity word claim exists', () => {
    // Pool words=['rook']. Trail = all-typed entries. Greedy still picks word 0.
    const trail = [
      { kind: 'typed', letter: 'r' },
      { kind: 'typed', letter: 'o' },
      { kind: 'typed', letter: 'o' },
      { kind: 'typed', letter: 'k' },
    ];
    const r = highlightConsumption('rook', pool([], ['rook']), trail);
    expect([...r.words]).toEqual([0]);
  });
});
