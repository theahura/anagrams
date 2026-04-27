import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
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
      entry.record = { longestWord: 'word', durationMs: 60000 };
    }
    out.push(entry);
  }
  return out;
}

describe('HomeScreen home stats row', () => {
  it('does not render the home stats row when streak is zero', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 0,
        completedToday: false,
        recent: buildRecent({}),
      },
    });
    expect(wrapper.find('.home-stats').exists()).toBe(false);
  });

  it('renders the streak when streak > 0 and does not render any best score', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 3,
        completedToday: true,
        recent: buildRecent({
          playedDates: ['2026-04-23', '2026-04-24', '2026-04-25'],
          todayDate: '2026-04-25',
        }),
      },
    });
    expect(wrapper.find('.home-stats').exists()).toBe(true);
    const text = wrapper.find('.home-stats').text();
    expect(text).toMatch(/Streak/);
    expect(text).toContain('3');
    expect(text).not.toMatch(/Best/i);
  });
});

describe('HomeScreen calendar strip', () => {
  it('does not render the calendar when streak is zero', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 0,
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

  it('gives every cell an aria-label that reflects state and contains no score number', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
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
      expect(label).not.toMatch(/score/i);
    }
    const todayLabel = cells[6].attributes('aria-label');
    expect(todayLabel.startsWith('Today')).toBe(true);
    const playedNonTodayLabel = cells[3].attributes('aria-label');
    expect(playedNonTodayLabel).toMatch(/Played/);
    const unplayedLabel = cells[0].attributes('aria-label');
    expect(unplayedLabel).toMatch(/Not played/);
  });

  it('wraps the calendar in a labeled group landmark', () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
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
  function buildRecentWithRecord({ date, longestWord, durationMs, todayDate = '2026-04-25' }) {
    const out = [];
    const [y, m, d] = todayDate.split('-').map(Number);
    const todayMs = Date.UTC(y, m - 1, d);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const played = dateStr === date;
      const entry = { date: dateStr, played };
      if (played) entry.record = { longestWord, durationMs };
      out.push(entry);
    }
    return out;
  }

  function defaultProps() {
    return {
      streak: 1,
      completedToday: false,
      recent: buildRecentWithRecord({
        date: '2026-04-22',
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

  it('shows the longest word and duration in the popover but no Score row', async () => {
    const wrapper = mount(HomeScreen, { props: defaultProps(), attachTo: document.body });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog.textContent;
    expect(text).toContain('redefine');
    expect(text).toMatch(/5:05/);
    expect(text).not.toMatch(/Score/);
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
        entry.record = { longestWord: 'apple', durationMs: 120000 };
      }
      if (dateStr === '2026-04-24') {
        entry.played = true;
        entry.record = { longestWord: 'banana', durationMs: 60000 };
      }
      recent.push(entry);
    }
    const wrapper = mount(HomeScreen, {
      props: { streak: 2, completedToday: false, recent },
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

describe('HomeScreen day-detail popover — share', () => {
  function buildRecentWithHistory({
    date,
    longestWord,
    durationMs,
    history,
    todayDate = '2026-04-25',
  }) {
    const out = [];
    const [y, m, d] = todayDate.split('-').map(Number);
    const todayMs = Date.UTC(y, m - 1, d);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const played = dateStr === date;
      const entry = { date: dateStr, played };
      if (played) {
        entry.record = { longestWord, durationMs };
        if (history !== undefined) entry.record.history = history;
      }
      out.push(entry);
    }
    return out;
  }

  function installClipboardMock(writeTextImpl) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextImpl },
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove());
  });

  it('renders a Share button when the selected entry has a non-empty history', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'refine',
          durationMs: 60000,
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
          ],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const shareBtn = buttons.find((b) => b.textContent.trim() === 'Share');
    expect(shareBtn).toBeDefined();
    wrapper.unmount();
  });

  it('does not render a Share button when the selected entry has no history field', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'word',
          durationMs: 60000,
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const shareBtn = buttons.find((b) => b.textContent.trim() === 'Share');
    expect(shareBtn).toBeUndefined();
    wrapper.unmount();
  });

  it('does not render a Share button when history is an empty array', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'foo',
          durationMs: 60000,
          history: [],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const shareBtn = buttons.find((b) => b.textContent.trim() === 'Share');
    expect(shareBtn).toBeUndefined();
    wrapper.unmount();
  });

  it('clicking Share copies a Wordle-style share grid containing the date and emoji', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboardMock(writeText);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'refine',
          durationMs: 60000,
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
          ],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Share'
    );
    shareBtn.click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('2026-04-22');
    expect(text).toMatch(/[\u{1F7E9}\u{1F7E8}]/u);
    wrapper.unmount();
  });

  it('resets the share button label when the user switches to a different cell after copying', async () => {
    installClipboardMock(vi.fn().mockResolvedValue(undefined));

    const recent = [];
    const todayMs = Date.UTC(2026, 3, 25);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const entry = { date: dateStr, played: false };
      if (dateStr === '2026-04-22') {
        entry.played = true;
        entry.record = {
          longestWord: 'apple',
          durationMs: 120000,
          history: [{ word: 'apple', parents: [] }],
        };
      }
      if (dateStr === '2026-04-24') {
        entry.played = true;
        entry.record = {
          longestWord: 'banana',
          durationMs: 60000,
          history: [{ word: 'banana', parents: [] }],
        };
      }
      recent.push(entry);
    }
    const wrapper = mount(HomeScreen, {
      props: { streak: 2, completedToday: false, recent },
      attachTo: document.body,
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    await cells[3].trigger('click');
    let dialog = document.querySelector('[role="dialog"]');
    let shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Share' || b.textContent.trim() === 'Copied!'
    );
    shareBtn.click();
    await flushPromises();
    expect(shareBtn.textContent.trim()).toBe('Copied!');

    await cells[5].trigger('click');
    dialog = document.querySelector('[role="dialog"]');
    const switchedShareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Share' || b.textContent.trim() === 'Copied!'
    );
    expect(switchedShareBtn.textContent.trim()).toBe('Share');
    wrapper.unmount();
  });

  it('falls back to window.prompt when the clipboard write rejects', async () => {
    installClipboardMock(vi.fn().mockRejectedValue(new Error('denied')));
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'banana',
          durationMs: 60000,
          history: [{ word: 'banana', parents: [] }],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Share'
    );
    shareBtn.click();
    await flushPromises();

    expect(promptSpy).toHaveBeenCalledTimes(1);
    const promptText = promptSpy.mock.calls[0][1];
    expect(promptText).toContain('2026-04-22');
    wrapper.unmount();
  });

  it('renders a Copy alt text button when the selected entry has a non-empty history', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'refine',
          durationMs: 60000,
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
          ],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const altBtn = buttons.find((b) => b.textContent.trim() === 'Copy alt text');
    expect(altBtn).toBeDefined();
    wrapper.unmount();
  });

  it('does not render Copy alt text when the selected entry has no history', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'word',
          durationMs: 60000,
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const altBtn = buttons.find((b) => b.textContent.trim() === 'Copy alt text');
    expect(altBtn).toBeUndefined();
    wrapper.unmount();
  });

  it('does not render Copy alt text when history is empty', async () => {
    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'foo',
          durationMs: 60000,
          history: [],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const altBtn = buttons.find((b) => b.textContent.trim() === 'Copy alt text');
    expect(altBtn).toBeUndefined();
    wrapper.unmount();
  });

  it('clicking Copy alt text copies a plaintext narrative containing the date words and Word 1, no emoji', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboardMock(writeText);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'refine',
          durationMs: 60000,
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
          ],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const altBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Copy alt text'
    );
    altBtn.click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('April 22 2026');
    expect(text).toContain('Word 1:');
    expect(text).not.toMatch(/[\u{1F7E8}-\u{1F7E9}]/u);
    wrapper.unmount();
  });

  it('Copy alt text falls back to window.prompt when the clipboard write rejects', async () => {
    installClipboardMock(vi.fn().mockRejectedValue(new Error('denied')));
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'banana',
          durationMs: 60000,
          history: [{ word: 'banana', parents: [] }],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const altBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Copy alt text'
    );
    altBtn.click();
    await flushPromises();

    expect(promptSpy).toHaveBeenCalledTimes(1);
    const promptText = promptSpy.mock.calls[0][1];
    expect(promptText).toContain('Word 1:');
    wrapper.unmount();
  });

  it('switching to a different cell after clicking Copy alt text resets the button label', async () => {
    installClipboardMock(vi.fn().mockResolvedValue(undefined));

    const recent = [];
    const todayMs = Date.UTC(2026, 3, 25);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const entry = { date: dateStr, played: false };
      if (dateStr === '2026-04-22') {
        entry.played = true;
        entry.record = {
          longestWord: 'apple',
          durationMs: 120000,
          history: [{ word: 'apple', parents: [] }],
        };
      }
      if (dateStr === '2026-04-24') {
        entry.played = true;
        entry.record = {
          longestWord: 'banana',
          durationMs: 60000,
          history: [{ word: 'banana', parents: [] }],
        };
      }
      recent.push(entry);
    }
    const wrapper = mount(HomeScreen, {
      props: { streak: 2, completedToday: false, recent },
      attachTo: document.body,
    });
    const cells = wrapper.findAll('.home-calendar-cell');
    await cells[3].trigger('click');
    let dialog = document.querySelector('[role="dialog"]');
    let altBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) =>
        b.textContent.trim() === 'Copy alt text' ||
        b.textContent.trim() === 'Copied!'
    );
    altBtn.click();
    await flushPromises();
    expect(altBtn.textContent.trim()).toBe('Copied!');

    await cells[5].trigger('click');
    dialog = document.querySelector('[role="dialog"]');
    const switchedAlt = Array.from(dialog.querySelectorAll('button')).find(
      (b) =>
        b.textContent.trim() === 'Copy alt text' ||
        b.textContent.trim() === 'Copied!'
    );
    expect(switchedAlt.textContent.trim()).toBe('Copy alt text');
    wrapper.unmount();
  });
});

describe('HomeScreen day-detail popover — Share button native Web Share path', () => {
  function buildRecentWithHistory({
    date,
    longestWord,
    durationMs,
    history,
    todayDate = '2026-04-25',
  }) {
    const out = [];
    const [y, m, d] = todayDate.split('-').map(Number);
    const todayMs = Date.UTC(y, m - 1, d);
    for (let i = 6; i >= 0; i--) {
      const t = todayMs - i * 86400000;
      const dateStr = new Date(t).toISOString().slice(0, 10);
      const played = dateStr === date;
      const entry = { date: dateStr, played };
      if (played) {
        entry.record = { longestWord, durationMs };
        if (history !== undefined) entry.record.history = history;
      }
      out.push(entry);
    }
    return out;
  }

  function installClipboardMock(writeTextImpl) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextImpl },
      configurable: true,
      writable: true,
    });
  }

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
    vi.restoreAllMocks();
    document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove());
  });

  it('uses navigator.share when available and does NOT flip "Copied!"', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    installClipboardMock(writeText);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'refine',
          durationMs: 60000,
          history: [{ word: 'fine', parents: [] }],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) =>
        b.textContent.trim() === 'Share' || b.textContent.trim() === 'Copied!'
    );
    shareBtn.click();
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(shareBtn.textContent.trim()).toBe('Share');
    wrapper.unmount();
  });

  it('falls back to clipboard and flips "Copied!" when share rejects with non-Abort error', async () => {
    const err = Object.assign(new Error('not allowed'), {
      name: 'NotAllowedError',
    });
    const shareSpy = vi.fn().mockRejectedValue(err);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    installClipboardMock(writeText);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'banana',
          durationMs: 60000,
          history: [{ word: 'banana', parents: [] }],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) =>
        b.textContent.trim() === 'Share' || b.textContent.trim() === 'Copied!'
    );
    shareBtn.click();
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(shareBtn.textContent.trim()).toBe('Copied!');
    wrapper.unmount();
  });

  it('does NOT flip "Copied!" when user cancels the share sheet (AbortError)', async () => {
    const abortErr = Object.assign(new Error('aborted'), {
      name: 'AbortError',
    });
    const shareSpy = vi.fn().mockRejectedValue(abortErr);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    installClipboardMock(writeText);

    const wrapper = mount(HomeScreen, {
      props: {
        streak: 1,
        completedToday: false,
        recent: buildRecentWithHistory({
          date: '2026-04-22',
          longestWord: 'apple',
          durationMs: 60000,
          history: [{ word: 'apple', parents: [] }],
        }),
      },
      attachTo: document.body,
    });
    await wrapper.findAll('.home-calendar-cell')[3].trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    const shareBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) =>
        b.textContent.trim() === 'Share' || b.textContent.trim() === 'Copied!'
    );
    shareBtn.click();
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(shareBtn.textContent.trim()).toBe('Share');
    wrapper.unmount();
  });
});
