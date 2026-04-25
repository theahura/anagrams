import { describe, it, expect } from 'vitest';
import {
  loadStore,
  recordDailyResult,
  currentStreak,
  bestScore,
  hasCompletedDate,
  recentDays,
} from '../src/storage.js';

function makeFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      data.set(k, String(v));
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

function makeQuotaExceededStorage() {
  return {
    getItem: () => null,
    setItem: () => {
      const err = new Error('QuotaExceeded');
      err.name = 'QuotaExceededError';
      throw err;
    },
    removeItem: () => {},
  };
}

describe('loadStore', () => {
  it('returns an empty records map for fresh storage', () => {
    const store = loadStore(makeFakeStorage());
    expect(store.records).toEqual({});
  });

  it('returns empty when stored JSON is malformed', () => {
    const fake = makeFakeStorage({ 'anagrams:v1': 'not-json{{{' });
    const store = loadStore(fake);
    expect(store.records).toEqual({});
  });

  it('returns empty when stored schemaVersion is unrecognized', () => {
    const fake = makeFakeStorage({
      'anagrams:v1': JSON.stringify({ schemaVersion: 999, records: { '2026-04-25': { score: 100 } } }),
    });
    const store = loadStore(fake);
    expect(store.records).toEqual({});
  });
});

describe('recordDailyResult', () => {
  it('persists a date+score that becomes visible via the public API', () => {
    const fake = makeFakeStorage();
    recordDailyResult(fake, {
      date: '2026-04-25',
      score: 142,
      longestWord: 'redefine',
      durationMs: 300000,
    });
    const { records } = loadStore(fake);
    expect(hasCompletedDate(records, '2026-04-25')).toBe(true);
    expect(bestScore(records)).toBe(142);
  });

  it('keeps the first record on a same-date re-call', () => {
    const fake = makeFakeStorage();
    recordDailyResult(fake, {
      date: '2026-04-25',
      score: 100,
      longestWord: 'first',
      durationMs: 10000,
    });
    const second = recordDailyResult(fake, {
      date: '2026-04-25',
      score: 200,
      longestWord: 'second',
      durationMs: 20000,
    });
    expect(bestScore(loadStore(fake).records)).toBe(100);
    expect(second.wasNewRecord).toBe(false);
  });

  it('reports wasNewRecord:true on first write for a date', () => {
    const fake = makeFakeStorage();
    const result = recordDailyResult(fake, {
      date: '2026-04-25',
      score: 100,
      longestWord: 'word',
      durationMs: 10000,
    });
    expect(result.wasNewRecord).toBe(true);
  });

  it('returns wasNewRecord:false and does not throw when storage write fails', () => {
    const broken = makeQuotaExceededStorage();
    let result;
    expect(() => {
      result = recordDailyResult(broken, {
        date: '2026-04-25',
        score: 50,
        longestWord: 'fail',
        durationMs: 1000,
      });
    }).not.toThrow();
    expect(result.wasNewRecord).toBe(false);
  });
});

describe('currentStreak', () => {
  it('returns 0 for an empty records map', () => {
    expect(currentStreak({}, '2026-04-25')).toBe(0);
  });

  it('returns 1 when only today is recorded', () => {
    const records = { '2026-04-25': { score: 10 } };
    expect(currentStreak(records, '2026-04-25')).toBe(1);
  });

  it('returns N for N consecutive days ending today', () => {
    const records = {
      '2026-04-21': { score: 1 },
      '2026-04-22': { score: 1 },
      '2026-04-23': { score: 1 },
      '2026-04-24': { score: 1 },
      '2026-04-25': { score: 1 },
    };
    expect(currentStreak(records, '2026-04-25')).toBe(5);
  });

  it('preserves the streak when today is missing but yesterday is present', () => {
    const records = {
      '2026-04-21': { score: 1 },
      '2026-04-22': { score: 1 },
      '2026-04-23': { score: 1 },
      '2026-04-24': { score: 1 },
    };
    expect(currentStreak(records, '2026-04-25')).toBe(4);
  });

  it('returns 0 when most recent record is at least two days before today', () => {
    const records = {
      '2026-04-22': { score: 1 },
      '2026-04-23': { score: 1 },
    };
    expect(currentStreak(records, '2026-04-25')).toBe(0);
  });

  it('counts only the trailing consecutive run', () => {
    const records = {
      '2026-04-20': { score: 1 },
      '2026-04-21': { score: 1 },
      '2026-04-23': { score: 1 },
      '2026-04-24': { score: 1 },
      '2026-04-25': { score: 1 },
    };
    expect(currentStreak(records, '2026-04-25')).toBe(3);
  });

  it('handles month and year boundaries correctly', () => {
    const records = {
      '2026-12-30': { score: 1 },
      '2026-12-31': { score: 1 },
      '2027-01-01': { score: 1 },
    };
    expect(currentStreak(records, '2027-01-01')).toBe(3);
  });
});

describe('bestScore', () => {
  it('returns 0 for empty records', () => {
    expect(bestScore({})).toBe(0);
  });

  it('returns the maximum score across records', () => {
    const records = {
      '2026-04-21': { score: 50 },
      '2026-04-22': { score: 200 },
      '2026-04-23': { score: 75 },
    };
    expect(bestScore(records)).toBe(200);
  });
});

describe('hasCompletedDate', () => {
  it('returns false when the date is not present', () => {
    expect(hasCompletedDate({}, '2026-04-25')).toBe(false);
  });

  it('returns true when the date has a record', () => {
    const records = { '2026-04-25': { score: 10 } };
    expect(hasCompletedDate(records, '2026-04-25')).toBe(true);
  });
});

describe('recordDailyResult — history field', () => {
  it('persists a history array round-trip when provided', () => {
    const fake = makeFakeStorage();
    const history = [
      { word: 'fine', parents: [] },
      { word: 'refine', parents: ['fine'] },
    ];
    recordDailyResult(fake, {
      date: '2026-04-25',
      score: 52,
      longestWord: 'refine',
      durationMs: 60000,
      history,
    });
    const { records } = loadStore(fake);
    expect(records['2026-04-25'].history).toEqual(history);
  });

  it('loads a v1 record without a history field and returns history as undefined', () => {
    const fake = makeFakeStorage({
      'anagrams:v1': JSON.stringify({
        schemaVersion: 1,
        records: {
          '2026-04-25': {
            score: 100,
            longestWord: 'word',
            durationMs: 60000,
            completedAt: 12345,
          },
        },
      }),
    });
    const { records } = loadStore(fake);
    expect(records['2026-04-25']).toBeDefined();
    expect(records['2026-04-25'].history).toBeUndefined();
  });
});

describe('recentDays', () => {
  it('returns 7 unplayed entries when records is empty', () => {
    const out = recentDays({}, '2026-04-25');
    expect(out).toHaveLength(7);
    for (const entry of out) {
      expect(entry.played).toBe(false);
    }
    expect(out[6].date).toBe('2026-04-25');
    expect(out[0].date).toBe('2026-04-19');
  });

  it('marks today as played and attaches the record when only today is recorded', () => {
    const records = {
      '2026-04-25': { score: 142, longestWord: 'redefine', durationMs: 300000 },
    };
    const out = recentDays(records, '2026-04-25');
    expect(out[6].played).toBe(true);
    expect(out[6].record).toEqual(records['2026-04-25']);
    for (let i = 0; i < 6; i++) {
      expect(out[i].played).toBe(false);
    }
  });

  it('marks the right indices as played for a mixed history', () => {
    const records = {
      '2026-04-22': { score: 100 },
      '2026-04-24': { score: 50 },
    };
    const out = recentDays(records, '2026-04-25');
    expect(out[3].date).toBe('2026-04-22');
    expect(out[3].played).toBe(true);
    expect(out[5].date).toBe('2026-04-24');
    expect(out[5].played).toBe(true);
    expect(out[0].played).toBe(false);
    expect(out[1].played).toBe(false);
    expect(out[2].played).toBe(false);
    expect(out[4].played).toBe(false);
    expect(out[6].played).toBe(false);
  });

  it('crosses month boundaries correctly', () => {
    const records = {
      '2026-04-30': { score: 10 },
      '2026-05-01': { score: 20 },
    };
    const out = recentDays(records, '2026-05-02');
    const datesInOrder = out.map((e) => e.date);
    expect(datesInOrder).toEqual([
      '2026-04-26', '2026-04-27', '2026-04-28', '2026-04-29',
      '2026-04-30', '2026-05-01', '2026-05-02',
    ]);
    expect(out[4].played).toBe(true);
    expect(out[5].played).toBe(true);
    expect(out[6].played).toBe(false);
  });

});
