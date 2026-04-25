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

describe('HomeScreen day-detail popover', () => {
  function buildRecentWithRecord({ date, score, longestWord, durationMs, todayDate = '2026-04-25' }) {
    const out = [];
    const [y, m, d] = todayDate.split('-').map(Number);
    const todayMs = Date.UTC(y, m - 1, d);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const played = dateStr === date;
      const entry = { date: dateStr, played };
      if (played) entry.record = { score, longestWord, durationMs };
      out.push(entry);
    }
    return out;
  }

  function defaultProps() {
    return {
      streak: 1,
      best: 142,
      completedToday: false,
      recent: buildRecentWithRecord({
        date: '2026-04-22',
        score: 142,
        longestWord: 'redefine',
        durationMs: 305000,
      }),
    };
  }

  it('does not render any popover on initial mount', () => {
    const wrapper = mount(HomeScreen, { props: defaultProps() });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('clicking an unplayed cell does not open a popover', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[0].trigger('click');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('played cell trigger exposes aria-haspopup and aria-expanded', () => {
    const wrapper = mount(HomeScreen, { props: defaultProps() });
    const playedCell = wrapper.findAll('.home-calendar-cell')[3];
    expect(playedCell.attributes('aria-haspopup')).toBe('dialog');
    expect(playedCell.attributes('aria-expanded')).toBe('false');
    expect(playedCell.attributes('aria-controls')).toBeTruthy();
  });

  it('opens a popover dialog when a played cell is clicked', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    wrapper.unmount();
  });

  it('shows the day score, longest word, and duration in the popover', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog.textContent;
    expect(text).toContain('142');
    expect(text).toContain('redefine');
    expect(text).toMatch(/5:05/);
    wrapper.unmount();
  });

  it('shows the human date heading in the popover', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toMatch(/April/);
    wrapper.unmount();
  });

  it('closes the popover when the close button is clicked', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const closeBtn = document.querySelector('.day-popover-close');
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('closes the popover when Escape is pressed', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('closes the popover on outside mousedown', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    document.body.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, composed: true })
    );
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('returns focus to the trigger cell after Escape close', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    const playedCell = wrapper.findAll('.home-calendar-cell')[3];
    await playedCell.trigger('click');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(playedCell.element);
    wrapper.unmount();
  });

  it('does not pull focus back to the trigger after outside-mousedown close', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    const playedCell = wrapper.findAll('.home-calendar-cell')[3];
    await playedCell.trigger('click');
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    elsewhere.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, composed: true })
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
    wrapper.unmount();
  });

  it('switches popover content when a different played cell is clicked', async () => {
    const recent = [];
    const todayMs = Date.UTC(2026, 3, 25);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const entry = { date: dateStr, played: false };
      if (dateStr === '2026-04-22') {
        entry.played = true;
        entry.record = { score: 50, longestWord: 'apple', durationMs: 120000 };
      }
      if (dateStr === '2026-04-24') {
        entry.played = true;
        entry.record = { score: 99, longestWord: 'banana', durationMs: 60000 };
      }
      recent.push(entry);
    }
    const wrapper = mount(HomeScreen, {
      props: { streak: 2, best: 99, completedToday: false, recent },
      attachTo: document.body,
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    await cells[3].trigger('click');
    expect(document.querySelector('[role="dialog"]').textContent).toContain('apple');

    await cells[5].trigger('click');
    const dialogText = document.querySelector('[role="dialog"]').textContent;
    expect(dialogText).toContain('banana');
    expect(dialogText).not.toContain('apple');
    wrapper.unmount();
  });
});
