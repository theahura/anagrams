import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GameScreen from '../src/components/GameScreen.vue';
import { loadDictionary } from '../src/dictionary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');

let dict;
beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  dict = loadDictionary(raw, lemmasRaw, {
    schemaVersion: 1,
    words: ['rook', 'brook', 'cat', 'cats', 'acts'],
  });
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document
    .querySelectorAll('.instructions-overlay, [role="dialog"]')
    .forEach((n) => n.remove());
});

async function dismissInstructions(wrapper) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

function makeGameWithGhost({ loose = [], words = [] } = {}) {
  return {
    mode: 'random',
    date: null,
    pool: {
      faceDown: ['x', 'y', 'z'],
      looseLetters: loose,
      words: words.map((w) => ({ word: w, parents: [], owner: 'human' })),
    },
    history: [],
    missedDrawCount: 0,
    ended: false,
    startTime: Date.now(),
    ghostRng: () => 0,
  };
}

describe('GameScreen ghost', () => {
  it('does not render a Ghost section before any ghost-owned words exist', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGameWithGhost({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });
    await dismissInstructions(wrapper);
    expect(wrapper.text()).not.toMatch(/Ghost/i);
    wrapper.unmount();
  });

  it('renders the ghost-stolen word in a Ghost section after the steal delay elapses', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGameWithGhost({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });
    await dismissInstructions(wrapper);
    // The human word "rook" exists; ghost has 'brook' available with random=0.
    vi.advanceTimersByTime(11000);
    await flushPromises();
    expect(wrapper.text()).toMatch(/Ghost/i);
    // The human "Your words" list no longer contains rook.
    const humanWords = wrapper
      .findAll('.words-list .word-row')
      .map((b) => b.text().replace(/\s+/g, ''));
    expect(humanWords).not.toContain('rook');
    // The ghost section contains brook.
    const ghostSection = wrapper.find('[data-testid="ghost-words"]');
    expect(ghostSection.exists()).toBe(true);
    expect(ghostSection.text().toLowerCase()).toContain('brook');
    wrapper.unmount();
  });

  it('does nothing when the game has no ghostRng (legacy fixture)', async () => {
    const game = makeGameWithGhost({ loose: ['b'], words: ['rook'] });
    delete game.ghostRng;
    const wrapper = mount(GameScreen, {
      props: { initialGame: game, dict },
    });
    await dismissInstructions(wrapper);
    vi.advanceTimersByTime(60000);
    await flushPromises();
    const humanWords = wrapper
      .findAll('.words-list .word-row')
      .map((b) => b.text().replace(/\s+/g, ''));
    expect(humanWords).toContain('rook');
    expect(wrapper.find('[data-testid="ghost-words"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('stops ghost timer when component unmounts', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGameWithGhost({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });
    await dismissInstructions(wrapper);
    wrapper.unmount();
    // After unmount, advancing timers should not blow up or schedule new work.
    expect(() => vi.advanceTimersByTime(60000)).not.toThrow();
  });
});
