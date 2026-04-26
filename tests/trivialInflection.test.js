import { describe, it, expect } from 'vitest';
import { isTrivialInflection } from '../src/trivialInflection.js';

const fixtureIndex = new Map(
  Object.entries({
    nubs: ['nub'],
    books: ['book'],
    cats: ['cat'],
    walked: ['walk'],
    walking: ['walk'],
    rated: ['rat'],
  })
);

describe('isTrivialInflection', () => {
  it('rejects simple plurals as trivial', () => {
    expect(isTrivialInflection('nubs', 'nub', fixtureIndex)).toBe(true);
    expect(isTrivialInflection('books', 'book', fixtureIndex)).toBe(true);
    expect(isTrivialInflection('cats', 'cat', fixtureIndex)).toBe(true);
  });

  it('rejects -ed and -ing inflections as trivial', () => {
    expect(isTrivialInflection('walked', 'walk', fixtureIndex)).toBe(true);
    expect(isTrivialInflection('walking', 'walk', fixtureIndex)).toBe(true);
  });

  it('accepts true anagrams that re-arrange letters', () => {
    expect(isTrivialInflection('snub', 'nub', fixtureIndex)).toBe(false);
    expect(isTrivialInflection('brook', 'rook', fixtureIndex)).toBe(false);
    expect(isTrivialInflection('refine', 'fine', fixtureIndex)).toBe(false);
    expect(isTrivialInflection('redefine', 'refine', fixtureIndex)).toBe(false);
  });

  it('treats identity as not a trivial inflection', () => {
    expect(isTrivialInflection('cat', 'cat', fixtureIndex)).toBe(false);
  });

  it('respects the override list (drop-e edge cases)', () => {
    expect(isTrivialInflection('rated', 'rate', fixtureIndex)).toBe(true);
    expect(isTrivialInflection('rated', 'rat', fixtureIndex)).toBe(false);
  });
});
