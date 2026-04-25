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

describe('generateShareText — emoji grid', () => {
  const GREEN = '\u{1F7E9}';
  const YELLOW = '\u{1F7E8}';

  it('produces no emoji rows when history is empty', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 0,
      history: [],
    });
    expect(text).not.toContain(GREEN);
    expect(text).not.toContain(YELLOW);
  });

  it('renders an original word as an all-green row', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 16,
      longestWord: 'fine',
      totalTimeMs: 30000,
      history: [{ word: 'fine', parents: [] }],
    });
    expect(text).toContain(GREEN.repeat(4));
    const yellowCount = (text.match(new RegExp(YELLOW, 'gu')) || []).length;
    expect(yellowCount).toBe(0);
  });

  it('renders a single-parent steal with carried letters as yellow', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 52,
      longestWord: 'refine',
      totalTimeMs: 60000,
      history: [
        { word: 'fine', parents: [] },
        { word: 'refine', parents: ['fine'] },
      ],
    });
    expect(text).toContain(YELLOW.repeat(4) + GREEN.repeat(2));
  });

  it('renders one row per history entry for a long chain', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 116,
      longestWord: 'redefine',
      totalTimeMs: 120000,
      history: [
        { word: 'fine', parents: [] },
        { word: 'refine', parents: ['fine'] },
        { word: 'redefine', parents: ['refine'] },
      ],
    });
    const rowRe = new RegExp(`[${GREEN}${YELLOW}]+`, 'gu');
    const rows = text.match(rowRe) || [];
    expect(rows.length).toBe(3);
    expect(rows[0]).toBe(GREEN.repeat(4));
    expect(rows[1]).toBe(YELLOW.repeat(4) + GREEN.repeat(2));
    expect(rows[2]).toBe(YELLOW.repeat(6) + GREEN.repeat(2));
  });

  it('renders a multi-parent steal as all yellow', () => {
    const text = generateShareText({
      mode: 'random',
      score: 24,
      longestWord: 'redo',
      totalTimeMs: 45000,
      history: [
        { word: 're', parents: [] },
        { word: 'do', parents: [] },
        { word: 'redo', parents: ['re', 'do'] },
      ],
    });
    expect(text).toContain(YELLOW.repeat(4));
    const rowRe = new RegExp(`[${GREEN}${YELLOW}]+`, 'gu');
    const rows = text.match(rowRe) || [];
    const lastRow = rows[rows.length - 1];
    expect(lastRow).toBe(YELLOW.repeat(4));
    const greenInLast = (lastRow.match(new RegExp(GREEN, 'gu')) || []).length;
    expect(greenInLast).toBe(0);
  });

  it('includes longest-word length and formatted time in the footer', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 116,
      longestWord: 'redefine',
      totalTimeMs: 5 * 60 * 1000,
      history: [{ word: 'redefine', parents: [] }],
    });
    expect(text).toMatch(/Longest\s*8\b/);
    expect(text).toMatch(/Time\s*5:00\b/);
  });
});

describe('generateShareText — streak suffix', () => {
  it('appends Streak <N> in daily mode when streak is at least 2', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
      streak: 5,
    });
    expect(text).toMatch(/Streak\s*5\b/);
  });

  it('does not include Streak when streak is 1', () => {
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
      streak: 1,
    });
    expect(text).not.toMatch(/Streak/);
  });

  it('does not include Streak when streak is 0 or omitted', () => {
    const omitted = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
    });
    const zero = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
      streak: 0,
    });
    expect(omitted).not.toMatch(/Streak/);
    expect(zero).not.toMatch(/Streak/);
  });

  it('does not include Streak in random mode regardless of streak value', () => {
    const text = generateShareText({
      mode: 'random',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
      streak: 7,
    });
    expect(text).not.toMatch(/Streak/);
  });
});
