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
  document
    .querySelectorAll('.instructions-overlay, [role="dialog"]')
    .forEach((n) => n.remove());
});

describe('GameScreen click-to-stage interactions', () => {
  it('appends the clicked face-up tile letter to the input', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[0].trigger('click');

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
    await wordRows[0].trigger('click');

    const input = wrapper.find('input.text-input');
    expect(input.element.value).toBe('rook');
  });

  it('appends letters cumulatively across multiple tile clicks', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[0].trigger('click');
    await tiles[2].trigger('click');

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
    await tiles[1].trigger('click');

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
    await wordRows[0].trigger('click');

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
    await wordRows[0].trigger('click');

    expect(input.element.value).toBe('ba');
  });

  it('removes letters case-insensitively while preserving the case of remaining letters', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('CAT');

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[1].trigger('click');

    expect(input.element.value).toBe('CT');
  });

  it('drops the used class from the clicked tile after click-to-remove', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('a');
    expect(wrapper.findAll('.tile-rack .tile')[1].classes()).toContain('used');

    await wrapper.findAll('.tile-rack .tile')[1].trigger('click');
    expect(wrapper.findAll('.tile-rack .tile')[1].classes()).not.toContain('used');
  });

  it('does not render a Clear button', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const hasClear = wrapper
      .findAll('button')
      .some((b) => b.text().toLowerCase() === 'clear');
    expect(hasClear).toBe(false);
  });
});

describe('GameScreen accessibility', () => {
  it('renders each face-up tile as a button element with type=button', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const tiles = wrapper.findAll('.tile-rack .tile');
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) {
      expect(tile.element.tagName).toBe('BUTTON');
      expect(tile.attributes('type')).toBe('button');
    }
  });

  it('marks a tile as "claimed" in its aria-label when the typed input claims it', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('a');

    const tiles = wrapper.findAll('.tile-rack .tile');
    expect(tiles[1].attributes('aria-label')).toBe('Tile a, claimed');
    expect(tiles[0].attributes('aria-label')).toBe('Tile c');
  });

  it('renders each word row as a button', () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: [], words: ['rook', 'cat'] }),
        dict,
      },
    });

    const wordRows = wrapper.findAll('.word-row');
    expect(wordRows).toHaveLength(2);
    for (const row of wordRows) {
      expect(row.element.tagName).toBe('BUTTON');
      expect(row.attributes('type')).toBe('button');
    }
  });

  it('marks a word row as "claimed" in its aria-label when the typed input fully covers it', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: [], words: ['rook'] }),
        dict,
      },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('rook');

    const row = wrapper.find('.word-row');
    expect(row.attributes('aria-label')).toBe('Word rook, 4 letters, claimed');
  });

  it('typed input has an associated accessible name', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    const inputId = input.attributes('id');
    const ariaLabel = input.attributes('aria-label');
    const ariaLabelledby = input.attributes('aria-labelledby');

    const hasAriaLabel = !!(ariaLabel && ariaLabel.trim().length > 0);
    const hasLabelFor =
      !!inputId && wrapper.find(`label[for="${inputId}"]`).exists();
    const hasLabelledby =
      !!ariaLabelledby && wrapper.find(`#${ariaLabelledby}`).exists();

    expect(hasAriaLabel || hasLabelFor || hasLabelledby).toBe(true);
  });

  it('feedback live region exists before any submission so screen readers can announce it', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const feedback = wrapper.find('.feedback');
    expect(feedback.exists()).toBe(true);
    expect(feedback.attributes('role')).toBe('status');
  });

  it('clicking a face-up tile leaves focus on the typed input', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await dismissInstructions(wrapper);

    const input = wrapper.find('input.text-input');
    input.element.focus();
    expect(document.activeElement).toBe(input.element);

    const tiles = wrapper.findAll('.tile-rack .tile');
    await tiles[0].trigger('click');

    expect(document.activeElement).toBe(input.element);
    wrapper.unmount();
  });
});

describe('GameScreen sticky-claim trail', () => {
  it('un-highlights the clicked tile (not the leftmost) when duplicate-letter tiles are both claimed', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['r', 'r', 't', 's'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[0].trigger('click');
    await tiles()[1].trigger('click');

    expect(tiles()[0].classes()).toContain('used');
    expect(tiles()[1].classes()).toContain('used');

    await tiles()[0].trigger('click');

    expect(tiles()[0].classes()).not.toContain('used');
    expect(tiles()[1].classes()).toContain('used');
    expect(wrapper.find('input.text-input').element.value).toBe('r');
  });

  it('preserves identity claim across an unrelated typed letter', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['r', 'r', 'a', 't'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[1].trigger('click');
    expect(tiles()[1].classes()).toContain('used');

    const input = wrapper.find('input.text-input');
    await input.setValue('ra');

    expect(tiles()[1].classes()).toContain('used');
  });

  it('a successful submit clears typed input AND clears any identity claims', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't', 's'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[0].trigger('click');
    await tiles()[1].trigger('click');
    await tiles()[2].trigger('click');
    expect(wrapper.find('input.text-input').element.value).toBe('cat');

    await wrapper.find('form.word-input').trigger('submit.prevent');

    expect(wrapper.find('input.text-input').element.value).toBe('');
    for (const t of wrapper.findAll('.tile-rack .tile')) {
      expect(t.classes()).not.toContain('used');
    }
  });

  it('an invalid submit leaves typed and identity claims intact', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['x', 'q', 'z'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[0].trigger('click');
    await tiles()[1].trigger('click');
    await tiles()[2].trigger('click');
    expect(tiles()[0].classes()).toContain('used');

    await wrapper.find('form.word-input').trigger('submit.prevent');

    expect(wrapper.find('input.text-input').element.value).toBe('xqz');
    expect(tiles()[0].classes()).toContain('used');
    expect(tiles()[1].classes()).toContain('used');
    expect(tiles()[2].classes()).toContain('used');
  });

  it('backspacing one character preserves earlier identity claims and removes only the most recent', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['r', 'r', 't'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[0].trigger('click');
    await tiles()[1].trigger('click');
    expect(tiles()[0].classes()).toContain('used');
    expect(tiles()[1].classes()).toContain('used');

    const input = wrapper.find('input.text-input');
    await input.setValue('r');

    expect(tiles()[0].classes()).toContain('used');
    expect(tiles()[1].classes()).not.toContain('used');
  });

  it('mid-string deletion via setValue demotes identity claims to typed (documenting the safety-net behaviour)', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't', 's'] }), dict },
    });

    const tiles = () => wrapper.findAll('.tile-rack .tile');
    await tiles()[0].trigger('click');
    await tiles()[1].trigger('click');
    await tiles()[2].trigger('click');

    const input = wrapper.find('input.text-input');
    await input.setValue('ct');

    expect(input.element.value).toBe('ct');
    expect(tiles()[0].classes()).toContain('used');
    expect(tiles()[1].classes()).not.toContain('used');
    expect(tiles()[2].classes()).toContain('used');
  });

  it('clicking a word row a second time un-highlights it but keeps a separately-clicked tile claim', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const wordRows = () => wrapper.findAll('.word-row');
    const tiles = () => wrapper.findAll('.tile-rack .tile');

    await wordRows()[0].trigger('click');
    await tiles()[0].trigger('click');
    expect(wrapper.find('input.text-input').element.value).toBe('rookb');
    expect(wordRows()[0].classes()).toContain('consumed');
    expect(tiles()[0].classes()).toContain('used');

    await wordRows()[0].trigger('click');

    expect(wrapper.find('input.text-input').element.value).toBe('b');
    expect(wordRows()[0].classes()).not.toContain('consumed');
    expect(tiles()[0].classes()).toContain('used');
  });
});

describe('GameScreen draw — missed-anagram hint', () => {
  it('shows a non-penalising warning hint when the loose pool had a possible word', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('warning');
    expect(feedback.text()).toBe('A word was available.');
  });

  it('clears feedback after a draw when the loose pool had no possible word', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['x', 'y', 'z'] }), dict },
    });

    const input = wrapper.find('input.text-input');
    await input.setValue('xyz');
    await wrapper.find('form.word-input').trigger('submit.prevent');
    expect(wrapper.find('.feedback').text()).not.toBe('');

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('feedback-empty');
    expect(feedback.text()).toBe('');
  });

  it('warning class is mutually exclusive with success and error', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('warning');
    expect(feedback.classes()).not.toContain('success');
    expect(feedback.classes()).not.toContain('error');
  });

  it('hint text contains no penalty or points language', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');

    const text = wrapper.find('.feedback').text();
    expect(text).not.toMatch(/penalty/i);
    expect(text).not.toMatch(/points/i);
  });

  it('flips warning to success when a valid word is submitted after the missed draw', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');
    expect(wrapper.find('.feedback').classes()).toContain('warning');

    const input = wrapper.find('input.text-input');
    await input.setValue('cat');
    await wrapper.find('form.word-input').trigger('submit.prevent');

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('success');
    expect(feedback.classes()).not.toContain('warning');
  });

  it('shows a steal-specific warning text when only a steal was missed', async () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['b'], words: ['rook'] }),
        dict,
      },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('warning');
    expect(feedback.text()).toBe('A steal was available.');
  });
});

describe('GameScreen header', () => {
  it('does not render a Score: label or score number', () => {
    const wrapper = mount(GameScreen, {
      props: {
        initialGame: makeGame({ loose: ['c', 'a', 't'] }),
        dict,
      },
    });
    const info = wrapper.find('.game-info');
    expect(info.exists()).toBe(true);
    expect(info.text()).not.toMatch(/Score/i);
    expect(info.find('.score').exists()).toBe(false);
  });
});

describe('GameScreen draw button gating', () => {
  it('disables the Draw button when the face-down pool is empty', () => {
    const game = {
      ...makeGame({ loose: ['a', 'b', 'c'] }),
      pool: { faceDown: [], looseLetters: ['a', 'b', 'c'], words: [] },
    };
    const wrapper = mount(GameScreen, {
      props: { initialGame: game, dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    expect(drawBtn.attributes('disabled')).toBeDefined();
  });
});

describe('GameScreen keyboard shortcuts', () => {
  it('pressing Space anywhere draws a tile (rack grows by one)', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });
    await dismissInstructions(wrapper);

    const before = wrapper.findAll('.tile-rack .tile').length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await wrapper.vm.$nextTick();

    const after = wrapper.findAll('.tile-rack .tile').length;
    expect(after).toBe(before + 1);
  });

  it('pressing Space while the typed input is focused still draws and does not insert a space character', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await dismissInstructions(wrapper);

    const input = wrapper.find('input.text-input');
    await input.setValue('ca');
    input.element.focus();
    expect(document.activeElement).toBe(input.element);

    const before = wrapper.findAll('.tile-rack .tile').length;
    await input.trigger('keydown', { key: ' ', code: 'Space' });
    await wrapper.vm.$nextTick();

    expect(input.element.value).toBe('ca');
    expect(wrapper.findAll('.tile-rack .tile').length).toBe(before + 1);
    wrapper.unmount();
  });

  it('pressing Space when the bag is empty does not change the rack', async () => {
    const game = {
      ...makeGame({ loose: ['a', 'b', 'c'] }),
      pool: { faceDown: [], looseLetters: ['a', 'b', 'c'], words: [] },
    };
    const wrapper = mount(GameScreen, { props: { initialGame: game, dict } });
    await dismissInstructions(wrapper);

    const before = wrapper.findAll('.tile-rack .tile').length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.tile-rack .tile').length).toBe(before);
  });

  it('typing a letter when no field is focused appends to the typed input', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await dismissInstructions(wrapper);

    document.body.focus();
    const input = wrapper.find('input.text-input');
    expect(document.activeElement).not.toBe(input.element);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(input.element.value).toBe('r');
    wrapper.unmount();
  });

  it('focuses the typed input after the instructions panel is dismissed', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await dismissInstructions(wrapper);

    const input = wrapper.find('input.text-input');
    expect(document.activeElement).toBe(input.element);
    wrapper.unmount();
  });

  it('holding Space (auto-repeat) does not draw repeatedly', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });
    await dismissInstructions(wrapper);

    const before = wrapper.findAll('.tile-rack .tile').length;
    for (let i = 0; i < 5; i++) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', code: 'Space', repeat: true, bubbles: true })
      );
    }
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.tile-rack .tile').length).toBe(before);
  });

  it('routing a letter from a non-focused state clears stale feedback', async () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
      attachTo: document.body,
    });
    await dismissInstructions(wrapper);

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    await drawBtn.trigger('click');
    expect(wrapper.find('.feedback').classes()).toContain('warning');

    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    await wrapper.vm.$nextTick();

    const feedback = wrapper.find('.feedback');
    expect(feedback.classes()).toContain('feedback-empty');
    expect(feedback.text()).toBe('');
    wrapper.unmount();
  });
});

describe('GameScreen shortcut indicators on buttons', () => {
  it('Submit button surfaces an Enter shortcut indicator', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const submitBtn = wrapper.findAll('button').find((b) => /Submit/.test(b.text()));
    expect(submitBtn).toBeDefined();
    const kbd = submitBtn.find('kbd');
    expect(kbd.exists()).toBe(true);
    const indicator = `${kbd.text()} ${kbd.attributes('aria-label') || ''}`;
    expect(indicator).toMatch(/enter|↵/i);
  });

  it('Draw button surfaces a Space shortcut indicator', () => {
    const wrapper = mount(GameScreen, {
      props: { initialGame: makeGame({ loose: ['c', 'a', 't'] }), dict },
    });

    const drawBtn = wrapper.findAll('button').find((b) => /Draw tile/.test(b.text()));
    expect(drawBtn).toBeDefined();
    const kbd = drawBtn.find('kbd');
    expect(kbd.exists()).toBe(true);
    const indicator = `${kbd.text()} ${kbd.attributes('aria-label') || ''}`;
    expect(indicator).toMatch(/space|␣/i);
  });
});
