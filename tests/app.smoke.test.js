import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import App from '../src/components/App.vue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const dictionaryJson = JSON.parse(readFileSync(DICT_PATH, 'utf8'));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => dictionaryJson,
    }))
  );
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
