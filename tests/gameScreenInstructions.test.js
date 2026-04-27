import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
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
  dict = loadDictionary(raw, lemmasRaw);
});

function makeGame({ loose = [], words = [] }) {
  return {
    mode: 'random',
    date: null,
    pool: {
      faceDown: ['x', 'y', 'z'],
      looseLetters: loose,
      words: words.map((w) => ({ word: w, parents: [] })),
    },
    history: [],
    missedDrawCount: 0,
    ended: false,
    startTime: Date.now(),
  };
}

async function dismissInstructions(wrapper) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

afterEach(() => {
  document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove());
});

describe('GameScreen — instructions panel auto-show', () => {
  it('auto-shows the instructions dialog when the screen mounts', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent.toLowerCase()).toContain('how to play');
    wrapper.unmount();
  });

  it('removes the dialog from the DOM after Escape dismissal', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await dismissInstructions(wrapper);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('still re-shows the panel on a fresh game-start mount (every game)', async () => {
    const w1 = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await w1.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await dismissInstructions(w1);
    w1.unmount();

    const w2 = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['d', 'o', 'g'] }), dict },
      attachTo: document.body,
    });
    await w2.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    w2.unmount();
  });
});

describe('GameScreen — help button', () => {
  it('clicking the help button after dismissal re-opens the dialog', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    await dismissInstructions(wrapper);
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await wrapper.find('[data-testid="open-instructions"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('returns focus to the help button after dismissing a help-triggered dialog', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    await dismissInstructions(wrapper);

    const helpBtn = wrapper.find('[data-testid="open-instructions"]');
    await helpBtn.trigger('click');
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(helpBtn.element);
    wrapper.unmount();
  });
});

describe('GameScreen — keyboard suppression while panel is open', () => {
  it('does NOT add to the typed input when a letter is pressed while the panel is open', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    document.body.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'r', bubbles: true })
    );
    await wrapper.vm.$nextTick();

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('');
    wrapper.unmount();
  });

  it('does NOT draw a tile when Space is pressed while the panel is open', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const before = wrapper.findAll('.tile-rack .tile').length;
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
    );
    await wrapper.vm.$nextTick();

    const after = wrapper.findAll('.tile-rack .tile').length;
    expect(after).toBe(before);
    wrapper.unmount();
  });

  it('resumes adding letters to the typed input after the panel is dismissed', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    await dismissInstructions(wrapper);

    document.body.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'r', bubbles: true })
    );
    await wrapper.vm.$nextTick();

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('r');
    wrapper.unmount();
  });

  it('resumes drawing on Space after the panel is dismissed', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    await dismissInstructions(wrapper);

    const before = wrapper.findAll('.tile-rack .tile').length;
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
    );
    await wrapper.vm.$nextTick();

    const after = wrapper.findAll('.tile-rack .tile').length;
    expect(after).toBe(before + 1);
    wrapper.unmount();
  });

  it('focuses the typed input after the auto-show panel is dismissed', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    await dismissInstructions(wrapper);

    const input = wrapper.find('input.text-input');
    expect(document.activeElement).toBe(input.element);
    wrapper.unmount();
  });
});
