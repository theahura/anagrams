import { describe, it, expect } from 'vitest';
import { isTrivialInflection } from '../src/trivialInflection.js';

describe('isTrivialInflection', () => {
  it('rejects simple plurals as trivial', () => {
    expect(isTrivialInflection('nubs', 'nub')).toBe(true);
    expect(isTrivialInflection('books', 'book')).toBe(true);
    expect(isTrivialInflection('cats', 'cat')).toBe(true);
  });

  it('rejects -ed and -ing inflections as trivial', () => {
    expect(isTrivialInflection('walked', 'walk')).toBe(true);
    expect(isTrivialInflection('walking', 'walk')).toBe(true);
  });

  it('accepts true anagrams that re-arrange letters', () => {
    expect(isTrivialInflection('snub', 'nub')).toBe(false);
    expect(isTrivialInflection('brook', 'rook')).toBe(false);
    expect(isTrivialInflection('refine', 'fine')).toBe(false);
    expect(isTrivialInflection('redefine', 'refine')).toBe(false);
  });

  it('treats identity as not a trivial inflection', () => {
    expect(isTrivialInflection('cat', 'cat')).toBe(false);
  });

  it('respects the override list (drop-e edge cases)', () => {
    expect(isTrivialInflection('rated', 'rate')).toBe(true);
    expect(isTrivialInflection('rated', 'rat')).toBe(false);
  });
});
