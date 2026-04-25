import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GameScreen from '../src/components/GameScreen.vue';
import { loadDictionary } from '../src/dictionary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');

let dict;
beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  dict = loadDictionary(raw);
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

describe('GameScreen click-to-stage interactions', () => {
  it('appends the clicked face-up tile letter to the input', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[0].trigger('mousedown');

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('c');
  });

  it('appends the entire word when an existing word row is clicked', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const wordRows = wrapper.findAll('.word-row');
    await wordRows[0].trigger('mousedown');

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('rook');
  });

  it('appends letters cumulatively across multiple tile clicks', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[0].trigger('mousedown');
    await tiles[2].trigger('mousedown');

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('ct');
  });

  it('adds the used class to a face-up tile when the typed input claims it', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('a');

    const tiles = wrapper.findAll('.tile-rack .tile');
    expect(tiles[0].classes()).not.toContain('used');
    expect(tiles[1].classes()).toContain('used');
    expect(tiles[2].classes()).not.toContain('used');
  });

  it('adds the consumed class to a word row when typed input fully covers that word', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('rook');

    const row = wrapper.find('.word-row');
    expect(row.classes()).toContain('consumed');
  });

  it('does NOT add the consumed class for a partially-typed word', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('roo');

    const row = wrapper.find('.word-row');
    expect(row.classes()).not.toContain('consumed');
  });

  it('removes the letter from input when an already-claimed tile is clicked', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('cat');

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[1].trigger('mousedown');

    expect(input.element.value).toBe('ct');
  });

  it('removes the entire word\'s letters from input when an already-consumed word row is clicked', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('brook');

    const wordRows = wrapper.findAll('.word-row');
    await wordRows[0].trigger('mousedown');

    expect(input.element.value).toBe('b');
  });

  it('removes only the letters of the clicked word, leaving extras intact', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b', 'a'], words: ['rook'] }),
        dict,
      },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('barook');

    const wordRows = wrapper.findAll('.word-row');
    await wordRows[0].trigger('mousedown');

    expect(input.element.value).toBe('ba');
  });

  it('removes letters case-insensitively while preserving the case of remaining letters', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('CAT');

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[1].trigger('mousedown');

    expect(input.element.value).toBe('CT');
  });

  it('drops the used class from the clicked tile after click-to-remove', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('a');
    expect(wrapper.findAll('.tile-rack .tile')[1].classes()).toContain('used');

    await wrapper.findAll('.tile-rack .tile')[1].trigger('mousedown');
    expect(wrapper.findAll('.tile-rack .tile')[1].classes()).not.toContain('used');
  });

  it('renders a Clear button that resets typed input when clicked', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('cat');

    const clearBtn = wrapper.findAll('button').find((b) => b.text().toLowerCase() === 'clear');
    expect(clearBtn).toBeDefined();
    await clearBtn.trigger('click');

    expect(input.element.value).toBe('');
  });

  it('Clear button is disabled when typed input is empty', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const clearBtn = wrapper.findAll('button').find((b) => b.text().toLowerCase() === 'clear');
    expect(clearBtn.attributes('disabled')).toBeDefined();
  });

  it('Clear button is enabled when typed input is non-empty', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('c');

    const clearBtn = wrapper.findAll('button').find((b) => b.text().toLowerCase() === 'clear');
    expect(clearBtn.attributes('disabled')).toBeUndefined();
  });
});
