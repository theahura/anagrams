import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import App from '../src/components/App.vue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');
const dictionaryJson = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
const lemmasJson = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const href = String(url);
      const body = href.endsWith('lemmas.json') ? lemmasJson : dictionaryJson;
      return {
        ok: true,
        status: 200,
        json: async () => body,
      };
    })
  );
  const fakeStorage = (() => {
    const data = new Map();
    return {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
      clear: () => data.clear(),
    };
  })();
  vi.stubGlobal('localStorage', fakeStorage);
});

describe('App smoke', () => {
  it('mounts the home screen and reveals 3 face-up tiles when starting a daily game', async () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Daily Challenge');
    expect(wrapper.text()).toContain('Random Trial');

    const dailyBtn = wrapper.findAll('button').find((b) => b.text().includes('Daily'));
    await dailyBtn.trigger('click');
    await flushPromises();
    await flushPromises();

    const tiles = wrapper.findAll('.tile-rack .tile');
    expect(tiles.length).toBe(3);
  });

  it('appends a letter to the input when a face-up tile is clicked', async () => {
    const wrapper = mount(App);
    await wrapper.findAll('button').find((b) => b.text().includes('Daily')).trigger('click');
    await flushPromises();
    await flushPromises();

    const tiles = wrapper.findAll('.tile-rack .tile');
    expect(tiles.length).toBe(3);
    await tiles[0].trigger('mousedown');

    const input = wrapper.find('input.text-input');
    expect(input.element.value.length).toBe(1);
  });

  it('Clear button empties the typed input from the App boundary', async () => {
    const wrapper = mount(App);
    await wrapper.findAll('button').find((b) => b.text().includes('Daily')).trigger('click');
    await flushPromises();
    await flushPromises();

    const input = wrapper.find('input.text-input');
    await input.setValue('hello');
    expect(input.element.value).toBe('hello');

    const clearBtn = wrapper.findAll('button').find((b) => b.text().toLowerCase() === 'clear');
    expect(clearBtn).toBeDefined();
    await clearBtn.trigger('click');

    expect(input.element.value).toBe('');
  });

  it('shows Streak and Best on the home screen when prior daily records exist', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const seeded = JSON.stringify({
      schemaVersion: 1,
      records: {
        [yesterday]: { score: 247, longestWord: 'redefine', durationMs: 90000 },
        [today]: { score: 80, longestWord: 'cat', durationMs: 30000 },
      },
    });
    localStorage.setItem('anagrams:v1', seeded);

    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.text()).toMatch(/Streak\s*2(?!\d)/);
    expect(wrapper.text()).toMatch(/Best\s*247(?!\d)/);
  });

  it('surfaces a dictError banner when the lemmas asset fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const href = String(url);
        if (href.endsWith('lemmas.json')) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => dictionaryJson };
      })
    );

    const wrapper = mount(App);
    const dailyBtn = wrapper.findAll('button').find((b) => b.text().includes('Daily'));
    await dailyBtn.trigger('click');
    await flushPromises();
    await flushPromises();

    const banner = wrapper.find('.error-banner');
    expect(banner.exists()).toBe(true);
    expect(banner.text().toLowerCase()).toContain('lemmas');
  });

  it('rejects an unknown word with feedback', async () => {
    const wrapper = mount(App);
    await wrapper.findAll('button').find((b) => b.text().includes('Daily')).trigger('click');
    await flushPromises();
    await flushPromises();

    const input = wrapper.find('input.text-input');
    await input.setValue('xqzpw');
    await wrapper.find('form.word-input').trigger('submit.prevent');
    await flushPromises();
    const err = wrapper.find('.feedback.error');
    expect(err.exists()).toBe(true);
    expect(err.text().toLowerCase()).toMatch(/dictionary|letters/);
  });
});
