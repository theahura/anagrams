import { describe, it, expect } from 'vitest';
import { createTileSet, LETTER_COUNTS, shuffleTiles } from '../src/tiles.js';
import { getDailyRng } from '../src/prng.js';

describe('createTileSet', () => {
  it('produces 144 tiles total', () => {
    const tiles = createTileSet();
    expect(tiles.length).toBe(144);
  });

  it('produces letters matching the Bananagrams distribution', () => {
    const tiles = createTileSet();
    const counts = {};
    for (const t of tiles) {
      counts[t] = (counts[t] || 0) + 1;
    }
    for (const [letter, count] of Object.entries(LETTER_COUNTS)) {
      expect(counts[letter]).toBe(count);
    }
  });

  it('uses lowercase letters only', () => {
    const tiles = createTileSet();
    for (const t of tiles) {
      expect(t).toMatch(/^[a-z]$/);
    }
  });
});

describe('shuffleTiles', () => {
  it('returns the same multiset as the input', () => {
    const tiles = createTileSet();
    const rng = getDailyRng('shuffle');
    const shuffled = shuffleTiles([...tiles], rng);
    expect([...shuffled].sort()).toEqual([...tiles].sort());
  });

  it('produces the same order for the same seeded rng', () => {
    const a = shuffleTiles(createTileSet(), getDailyRng('seed-x'));
    const b = shuffleTiles(createTileSet(), getDailyRng('seed-x'));
    expect(a).toEqual(b);
  });

  it('produces a different order for different seeds (with high probability)', () => {
    const a = shuffleTiles(createTileSet(), getDailyRng('seed-1'));
    const b = shuffleTiles(createTileSet(), getDailyRng('seed-2'));
    expect(a).not.toEqual(b);
  });
});
