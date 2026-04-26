import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateShareText,
  generateShareAltText,
  shareOrCopy,
} from '../src/share.js';

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

describe('generateShareText — truncation', () => {
  const GREEN = '\u{1F7E9}';
  const YELLOW = '\u{1F7E8}';

  function weightedLength(text) {
    let len = 0;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      len += cp <= 0x7F ? 1 : 2;
    }
    return len;
  }

  function makeHistory(count, wordLength) {
    const word = 'a'.repeat(wordLength);
    return Array.from({ length: count }, () => ({ word, parents: [] }));
  }

  it('does not truncate when history fits within the share budget', () => {
    const history = makeHistory(6, 4);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 96,
      longestWord: 'aaaa',
      totalTimeMs: 60000,
      history,
    });
    expect(text).not.toMatch(/more/);
    const rowRe = new RegExp(`[${GREEN}${YELLOW}]+`, 'gu');
    const rows = text.match(rowRe) || [];
    expect(rows.length).toBe(6);
  });

  it('truncates when history overflows the share budget', () => {
    const history = makeHistory(30, 6);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 1080,
      longestWord: 'aaaaaa',
      totalTimeMs: 5 * 60 * 1000,
      history,
    });
    const rowRe = new RegExp(`[${GREEN}${YELLOW}]+`, 'gu');
    const rows = text.match(rowRe) || [];
    expect(rows.length).toBeLessThanOrEqual(6);
    expect(text).toMatch(/\+24 more/);
  });

  it('preserves the header verbatim when truncated', () => {
    const history = makeHistory(30, 6);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 1080,
      longestWord: 'aaaaaa',
      totalTimeMs: 5 * 60 * 1000,
      history,
    });
    expect(text).toContain('Anagrams 2026-04-25 — 1080');
  });

  it('preserves the full footer (Longest, Time, Streak) verbatim when truncated', () => {
    const history = makeHistory(30, 6);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 1080,
      longestWord: 'aaaaaaaa',
      totalTimeMs: 5 * 60 * 1000,
      history,
      streak: 5,
    });
    expect(text).toContain('Longest 8');
    expect(text).toContain('Time 5:00');
    expect(text).toContain('Streak 5');
  });

  it('keeps first 3 rows then elision then last 3 rows in original order when truncated', () => {
    const head = [
      { word: 'aaa', parents: [] },
      { word: 'aabb', parents: ['ab'] },
      { word: 'aabbb', parents: ['abc'] },
    ];
    const middle = makeHistory(20, 6);
    const tail = [
      { word: 'cccc', parents: ['x'] },
      { word: 'ddddd', parents: ['xy'] },
      { word: 'eeeeee', parents: ['xyz'] },
    ];
    const history = [...head, ...middle, ...tail];

    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 999,
      longestWord: 'eeeeee',
      totalTimeMs: 60000,
      history,
    });

    const rowFor = (entry) => {
      const carried = entry.parents.reduce((s, p) => s + p.length, 0);
      const added = Math.max(0, entry.word.length - carried);
      return YELLOW.repeat(carried) + GREEN.repeat(added);
    };

    const lines = text.split('\n');
    const emojiLines = lines.filter((l) => /^[🟩🟨]+$/u.test(l));
    expect(emojiLines).toEqual([
      rowFor(head[0]),
      rowFor(head[1]),
      rowFor(head[2]),
      rowFor(tail[0]),
      rowFor(tail[1]),
      rowFor(tail[2]),
    ]);

    const elisionIdx = lines.findIndex((l) => /\+\d+ more/.test(l));
    expect(elisionIdx).toBeGreaterThan(-1);
    const headLastIdx = lines.indexOf(rowFor(head[2]));
    const tailFirstIdx = lines.indexOf(rowFor(tail[0]));
    expect(headLastIdx).toBeLessThan(elisionIdx);
    expect(elisionIdx).toBeLessThan(tailFirstIdx);
  });

  it('truncated output stays within Twitter weighted-length 280', () => {
    const history = makeHistory(50, 10);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 5000,
      longestWord: 'aaaaaaaaaa',
      totalTimeMs: 10 * 60 * 1000,
      history,
      streak: 7,
    });
    expect(weightedLength(text)).toBeLessThanOrEqual(280);
  });

  it('drops just one row when history has exactly 7 overflowing rows', () => {
    const history = makeHistory(7, 18);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 2268,
      longestWord: 'a'.repeat(18),
      totalTimeMs: 60000,
      history,
    });
    expect(text).toMatch(/\+1 more/);
  });

  it('does not truncate when history has 6 or fewer rows even if oversized', () => {
    const history = makeHistory(6, 15);
    const text = generateShareText({
      mode: 'daily',
      date: '2026-04-25',
      score: 1350,
      longestWord: 'a'.repeat(15),
      totalTimeMs: 60000,
      history,
    });
    expect(text).not.toMatch(/more/);
    const rowRe = new RegExp(`[${GREEN}${YELLOW}]+`, 'gu');
    const rows = text.match(rowRe) || [];
    expect(rows.length).toBe(6);
  });
});

describe('generateShareAltText', () => {
  it('daily-mode header includes a humanized date and score, no YYYY-MM-DD', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 142,
      longestWord: 'redefine',
      totalTimeMs: 5 * 60 * 1000,
      history: [],
    });
    expect(text).not.toMatch(/2026-04-25/);
    expect(text).toMatch(/April 25 2026/);
    expect(text).toContain('142');
  });

  it('random-mode header reads "random run" with no date', () => {
    const text = generateShareAltText({
      mode: 'random',
      score: 50,
      longestWord: 'rook',
      totalTimeMs: 60000,
      history: [],
    });
    expect(text).not.toMatch(/\d{4}/);
    expect(text.toLowerCase()).toContain('random run');
    expect(text).toContain('50');
  });

  it('emits "Word 1: 4 new letters." for a single root-word history entry', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 16,
      longestWord: 'rook',
      totalTimeMs: 30000,
      history: [{ word: 'rook', parents: [] }],
    });
    expect(text).toContain('Word 1: 4 new letters.');
  });

  it('emits "Word K: M carried, N new." for a single steal entry', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 25,
      longestWord: 'brook',
      totalTimeMs: 60000,
      history: [
        { word: 'rook', parents: [] },
        { word: 'brook', parents: ['rook'] },
      ],
    });
    expect(text).toContain('Word 1: 4 new letters.');
    expect(text).toContain('Word 2: 4 carried, 1 new.');
  });

  it('numbers words 1..N consecutively for a multi-row history', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'redefine',
      totalTimeMs: 60000,
      history: [
        { word: 'fine', parents: [] },
        { word: 'refine', parents: ['fine'] },
        { word: 'redefine', parents: ['refine'] },
      ],
    });
    expect(text).toContain('Word 1:');
    expect(text).toContain('Word 2:');
    expect(text).toContain('Word 3:');
    expect(text).not.toContain('Word 4:');
  });

  it('footer includes "Longest word N letters." when longestWord is set', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 64,
      longestWord: 'redefine',
      totalTimeMs: 60000,
      history: [],
    });
    expect(text).toContain('Longest word 8 letters.');
  });

  it('footer omits the longest sentence when longestWord is empty', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 60000,
      history: [],
    });
    expect(text).not.toMatch(/Longest/);
  });

  it('time under 60s renders as "Time N seconds." (singular for 1)', () => {
    const t45 = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 45000,
      history: [],
    });
    expect(t45).toContain('Time 45 seconds.');

    const t1 = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 1000,
      history: [],
    });
    expect(t1).toContain('Time 1 second.');
  });

  it('time exactly N minutes (no remainder seconds) renders as "Time M minutes."', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 5 * 60 * 1000,
      history: [],
    });
    expect(text).toContain('Time 5 minutes.');
    expect(text).not.toMatch(/seconds/);
  });

  it('time with minutes and seconds renders as "Time M minutes N seconds."', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 5 * 60 * 1000 + 23 * 1000,
      history: [],
    });
    expect(text).toContain('Time 5 minutes 23 seconds.');
  });

  it('singular minute form when time is exactly 1 minute', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 60000,
      history: [],
    });
    expect(text).toContain('Time 1 minute.');
  });

  it('streak suffix "Streak N." appears in daily mode when streak >= 2', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'rook',
      totalTimeMs: 60000,
      history: [],
      streak: 5,
    });
    expect(text).toContain('Streak 5.');
  });

  it('streak suffix is suppressed when streak is 0 or 1', () => {
    const t0 = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'rook',
      totalTimeMs: 60000,
      history: [],
      streak: 0,
    });
    const t1 = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'rook',
      totalTimeMs: 60000,
      history: [],
      streak: 1,
    });
    expect(t0).not.toMatch(/Streak/);
    expect(t1).not.toMatch(/Streak/);
  });

  it('streak suffix is suppressed in random mode regardless of streak value', () => {
    const text = generateShareAltText({
      mode: 'random',
      score: 100,
      longestWord: 'rook',
      totalTimeMs: 60000,
      history: [],
      streak: 5,
    });
    expect(text).not.toMatch(/Streak/);
  });

  it('truncates with head-3 + elision sentence + tail-3 when history has more than 6 rows', () => {
    const history = [
      { word: 'aaa', parents: [] },
      { word: 'bbbb', parents: [] },
      { word: 'ccccc', parents: [] },
      { word: 'dddddd', parents: [] },
      { word: 'eeeeeee', parents: [] },
      { word: 'ffffffff', parents: [] },
      { word: 'ggggggggg', parents: [] },
      { word: 'hhhhhhhhhh', parents: [] },
      { word: 'iiiiiiiiiii', parents: [] },
      { word: 'jjjjjjjjjjjj', parents: [] },
    ];
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 500,
      longestWord: 'jjjjjjjjjjjj',
      totalTimeMs: 60000,
      history,
    });
    const wordLines = text.split('\n').filter((l) => /^Word \d+:/.test(l));
    expect(wordLines.length).toBe(6);
    expect(wordLines[0]).toContain('Word 1:');
    expect(wordLines[1]).toContain('Word 2:');
    expect(wordLines[2]).toContain('Word 3:');
    expect(wordLines[3]).toContain('Word 8:');
    expect(wordLines[4]).toContain('Word 9:');
    expect(wordLines[5]).toContain('Word 10:');
    expect(text).toMatch(/4 more words/);
  });

  it('truncation elision uses singular "more word" when exactly 1 word is dropped', () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      word: 'x'.repeat(i + 3),
      parents: [],
    }));
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 60000,
      history,
    });
    expect(text).toMatch(/1 more word\b/);
    expect(text).not.toMatch(/1 more words/);
  });

  it('emits all rows verbatim when history has 6 or fewer rows', () => {
    const history = Array.from({ length: 6 }, (_, i) => ({
      word: 'x'.repeat(i + 3),
      parents: [],
    }));
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 60000,
      history,
    });
    const wordLines = text.split('\n').filter((l) => /^Word \d+:/.test(l));
    expect(wordLines.length).toBe(6);
    expect(text).not.toMatch(/more word/);
  });

  it('emits header and footer only when history is empty (no Word lines)', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 0,
      longestWord: '',
      totalTimeMs: 60000,
      history: [],
    });
    expect(text).not.toMatch(/Word \d+:/);
    expect(text).toContain('April 25 2026');
    expect(text).toContain('Time');
  });

  it('output contains zero emoji code points', () => {
    const history = [
      { word: 'rook', parents: [] },
      { word: 'brook', parents: ['rook'] },
      { word: 'redefine', parents: ['refine'] },
    ];
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'redefine',
      totalTimeMs: 60000,
      history,
      streak: 3,
    });
    expect(text).not.toMatch(/[\u{1F7E8}-\u{1F7E9}]/u);
  });

  it('output contains zero em-dash and zero middle-dot characters', () => {
    const text = generateShareAltText({
      mode: 'daily',
      date: '2026-04-25',
      score: 100,
      longestWord: 'redefine',
      totalTimeMs: 60000,
      history: [{ word: 'rook', parents: [] }],
      streak: 3,
    });
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/·/);
  });

});

describe('shareOrCopy', () => {
  function setShare(impl) {
    Object.defineProperty(navigator, 'share', {
      value: impl,
      configurable: true,
      writable: true,
    });
  }

  function setCanShare(impl) {
    Object.defineProperty(navigator, 'canShare', {
      value: impl,
      configurable: true,
      writable: true,
    });
  }

  function setClipboard(writeText) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  }

  function clearShareApi() {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    clearShareApi();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns "shared" and does not call clipboard when navigator.share resolves', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    setClipboard(writeText);

    const result = await shareOrCopy('hello world');

    expect(result).toBe('shared');
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('returns "cancelled" without falling through to clipboard when share rejects with AbortError', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const shareSpy = vi.fn().mockRejectedValue(abortErr);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    setClipboard(writeText);

    const result = await shareOrCopy('hello world');

    expect(result).toBe('cancelled');
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard on a non-Abort share rejection', async () => {
    const otherErr = Object.assign(new Error('not allowed'), {
      name: 'NotAllowedError',
    });
    const shareSpy = vi.fn().mockRejectedValue(otherErr);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    setClipboard(writeText);

    const result = await shareOrCopy('hello world');

    expect(result).toBe('copied');
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('uses clipboard directly when navigator.share is undefined', async () => {
    clearShareApi();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    const result = await shareOrCopy('foo bar');

    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('foo bar');
  });

  it('uses navigator.share when it is defined and canShare is undefined', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    const result = await shareOrCopy('text');

    expect(result).toBe('shared');
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('skips share path and uses clipboard when canShare returns false', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => false);
    setClipboard(writeText);

    const result = await shareOrCopy('text');

    expect(result).toBe('copied');
    expect(shareSpy).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('falls back to window.prompt when share is absent and clipboard rejects', async () => {
    clearShareApi();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard(writeText);
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);

    const result = await shareOrCopy('payload');

    expect(result).toBe('prompted');
    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(promptSpy.mock.calls[0][1]).toBe('payload');
  });
});

