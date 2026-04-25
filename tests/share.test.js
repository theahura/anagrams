import { describe, it, expect } from 'vitest';
import { generateShareText } from '../src/share.js';

describe('generateShareText — daily mode', () => {
  it('includes the date and final score', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 142,
      longestWord: 'redefine',
      totalTimeMs: 5 * 60 * 1000,
    });
    expect(text).toContain('2026-04-25');
    expect(text).toContain('142');
  });

  it('includes the longest word length', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 50,
      longestWord: 'redefine',
      totalTimeMs: 60000,
    });
    expect(text).toContain('8');
  });

  it('produces deterministic output for the same inputs', () => {
    const a = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 12,
      longestWord: 'cat',
      totalTimeMs: 10000,
    });
    const b = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 12,
      longestWord: 'cat',
      totalTimeMs: 10000,
    });
    expect(a).toBe(b);
  });
});

describe('generateShareText — random mode', () => {
  it('does not include a specific date', () => {
    const text = generateShareText({
      mode: 'random',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
    });
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).toContain('Random');
  });
});
