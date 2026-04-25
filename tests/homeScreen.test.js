import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeScreen from '../src/components/HomeScreen.vue';

function buildRecent({ playedDates = [], todayDate = '2026-04-25', count = 7 }) {
  const out = [];
  const [y, m, d] = todayDate.split('-').map(Number);
  const todayMs = Date.UTC(y, m - 1, d);
  for (let i = count - 1; i >= 0; i--) {
    const t = todayMs - i * 86400000;
    const date = new Date(t).toISOString().slice(0, 10);
    const played = playedDates.includes(date);
    const entry = { date, played };
    if (played) {
      entry.record = { score: 100 + i, longestWord: 'word', durationMs: 60000 };
    }
    out.push(entry);
  }
  return out;
}

describe('HomeScreen calendar strip', () => {
  it('does not render the calendar when streak and best are both zero', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 0,
        best: 0,
        completedToday: false,
        recent: buildRecent({}),
      },
    });
    expect(wrapper.find('.home-calendar').exists()).toBe(false);
  });

  it('renders exactly 7 cells when there is non-zero history', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 2,
        best: 120,
        completedToday: true,
        recent: buildRecent({
          playedDates: ['2026-04-24', '2026-04-25'],
          todayDate: '2026-04-25',
        }),
      },
    });
    expect(wrapper.find('.home-calendar').exists()).toBe(true);
    expect(wrapper.findAll('.home-calendar-cell')).toHaveLength(7);
  });

  it('marks only the rightmost cell with the today class', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        best: 50,
        completedToday: false,
        recent: buildRecent({
          playedDates: ['2026-04-24'],
          todayDate: '2026-04-25',
        }),
      },
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    expect(cells[6].classes()).toContain('today');
    for (let i = 0; i < 6; i++) {
      expect(cells[i].classes()).not.toContain('today');
    }
  });

  it('applies the played class to cells whose entry is played', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 2,
        best: 120,
        completedToday: false,
        recent: buildRecent({
          playedDates: ['2026-04-22', '2026-04-24'],
          todayDate: '2026-04-25',
        }),
      },
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    expect(cells[3].classes()).toContain('played');
    expect(cells[5].classes()).toContain('played');
    expect(cells[0].classes()).not.toContain('played');
    expect(cells[6].classes()).not.toContain('played');
  });

  it('gives every cell an aria-label that reflects state', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        best: 142,
        completedToday: true,
        recent: buildRecent({
          playedDates: ['2026-04-22', '2026-04-25'],
          todayDate: '2026-04-25',
        }),
      },
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    for (const cell of cells) {
      const label = cell.attributes('aria-label');
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    }
    const todayLabel = cells[6].attributes('aria-label');
    expect(todayLabel.startsWith('Today')).toBe(true);
    const playedNonTodayLabel = cells[3].attributes('aria-label');
    expect(playedNonTodayLabel).toMatch(/Score/);
    const unplayedLabel = cells[0].attributes('aria-label');
    expect(unplayedLabel).toMatch(/Not played/);
  });

  it('wraps the calendar in a labeled group landmark', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        best: 50,
        completedToday: true,
        recent: buildRecent({
          playedDates: ['2026-04-25'],
          todayDate: '2026-04-25',
        }),
      },
    });
    const calendar = wrapper.find('.home-calendar');
    expect(calendar.attributes('role')).toBe('group');
    expect(calendar.attributes('aria-label')).toBeTruthy();
    expect(calendar.attributes('aria-label').length).toBeGreaterThan(0);
  });
});
