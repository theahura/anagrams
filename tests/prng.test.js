import { describe, it, expect } from 'vitest';
import { getDailyRng, seededShuffle, seededPick } from '../src/prng.js';

describe('getDailyRng', () => {
  it('produces the same sequence for the same date', () => {
    const a = getDailyRng('2026-04-25');
    const b = getDailyRng('2026-04-25');
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different dates', () => {
    const a = getDailyRng('2026-04-25');
    const b = getDailyRng('2026-04-26');
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns floats in [0, 1)', () => {
    const rng = getDailyRng('2026-04-25');
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('seededShuffle', () => {
  it('preserves the multiset of elements', () => {
    const rng = getDailyRng('seed');
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = seededShuffle([...arr], rng);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(arr);
  });

  it('is deterministic for a fixed seed', () => {
    const r1 = getDailyRng('seed');
    const r2 = getDailyRng('seed');
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7], r1);
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7], r2);
    expect(a).toEqual(b);
  });
});

describe('seededPick', () => {
  it('returns an element from the array', () => {
    const rng = getDailyRng('p');
    const pool = ['a', 'b', 'c', 'd'];
    const v = seededPick(pool, rng);
    expect(pool).toContain(v);
  });
});
