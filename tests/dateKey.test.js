import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatLocalDate, todayLocal } from '../src/dateKey.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatLocalDate', () => {
  it('zero-pads single-digit months and days', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });

  it('formats the last day of the year', () => {
    expect(formatLocalDate(new Date(2026, 11, 31, 12, 0, 0))).toBe('2026-12-31');
  });
});

describe('todayLocal', () => {
  it('returns the local-calendar date for the current system time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 25, 12, 0, 0));
    expect(todayLocal()).toBe('2026-04-25');
  });
});
