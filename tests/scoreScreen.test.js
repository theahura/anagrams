import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ScoreScreen from '../src/components/ScoreScreen.vue';

function installClipboardMock(writeTextImpl) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextImpl },
    configurable: true,
    writable: true,
  });
}

function makeResult(overrides = {}) {
  return {
    score: 100,
    totalTimeMs: 60000,
    words: ['rook'],
    missedDrawCount: 0,
    longestWord: 'rook',
    longestChain: ['rook'],
    history: [{ word: 'rook', parents: [] }],
    ...overrides,
  };
}

describe('ScoreScreen — Copy alt text button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Copy alt text button when result.history is non-empty', () => {
    const wrapper = mount(ScoreScreen, {
      props: { result: makeResult(), mode: 'daily', date: '2026-04-25' },
    });
    const buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    expect(altBtn).toBeDefined();
  });

  it('does not render Copy alt text button when result.history is empty', () => {
    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({ history: [] }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    expect(altBtn).toBeUndefined();
  });

  it('does not render Copy alt text button when result.history is missing', () => {
    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({ history: undefined }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    expect(altBtn).toBeUndefined();
  });

  it('clicking Copy alt text writes a plaintext narrative containing Word 1: and the score, no emoji', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboardMock(writeText);

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({
          score: 142,
          longestWord: 'redefine',
          longestChain: ['fine', 'refine', 'redefine'],
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
            { word: 'redefine', parents: ['refine'] },
          ],
        }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    await altBtn.trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('Word 1:');
    expect(text).toContain('142');
    expect(text).not.toMatch(/[\u{1F7E8}-\u{1F7E9}]/u);
  });

  it('Copy alt text falls back to window.prompt when clipboard rejects', async () => {
    installClipboardMock(vi.fn().mockRejectedValue(new Error('denied')));
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({ score: 75 }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    await altBtn.trigger('click');
    await flushPromises();

    expect(promptSpy).toHaveBeenCalledTimes(1);
    const promptText = promptSpy.mock.calls[0][1];
    expect(promptText).toContain('75');
    expect(promptText).toContain('Word 1:');
  });

  it('Copy alt text button label flips to Copied! after a successful click', async () => {
    installClipboardMock(vi.fn().mockResolvedValue(undefined));

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult(),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    let buttons = wrapper.findAll('button');
    let altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    await altBtn.trigger('click');
    await flushPromises();

    buttons = wrapper.findAll('button');
    altBtn = buttons.find(
      (b) => b.text() === 'Copy alt text' || b.text() === 'Copied!'
    );
    expect(altBtn.text()).toBe('Copied!');
  });

  it('Copy alt text and Share are independent: clicking alt does not flip Share label', async () => {
    installClipboardMock(vi.fn().mockResolvedValue(undefined));

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult(),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    let buttons = wrapper.findAll('button');
    const altBtn = buttons.find((b) => b.text() === 'Copy alt text');
    await altBtn.trigger('click');
    await flushPromises();

    buttons = wrapper.findAll('button');
    const shareBtn = buttons.find((b) => b.text() === 'Share');
    expect(shareBtn).toBeDefined();
    expect(shareBtn.text()).toBe('Share');
  });
});

describe('ScoreScreen — primary Share button (regression)', () => {
  afterEach(() => {
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
    vi.restoreAllMocks();
  });

  it('clicking Share writes the emoji-grid output containing emoji squares', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboardMock(writeText);

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({
          score: 142,
          longestWord: 'redefine',
          longestChain: ['fine', 'refine', 'redefine'],
          history: [
            { word: 'fine', parents: [] },
            { word: 'refine', parents: ['fine'] },
          ],
        }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const shareBtn = wrapper.findAll('button').find((b) => b.text() === 'Share');
    await shareBtn.trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text).toMatch(/[\u{1F7E8}-\u{1F7E9}]/u);
    expect(text).toContain('142');
  });
});

describe('ScoreScreen — Share button native Web Share path', () => {
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
  });

  it('uses navigator.share when available and does NOT flip "Copied!"', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);
    setCanShare(() => true);
    installClipboardMock(writeText);

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({
          score: 142,
          history: [{ word: 'fine', parents: [] }],
        }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const shareBtn = wrapper.findAll('button').find((b) => b.text() === 'Share');
    await shareBtn.trigger('click');
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    const labelAfter = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Share' || b.text() === 'Copied!');
    expect(labelAfter.text()).toBe('Share');
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

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({
          score: 99,
          history: [{ word: 'foo', parents: [] }],
        }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const shareBtn = wrapper.findAll('button').find((b) => b.text() === 'Share');
    await shareBtn.trigger('click');
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    const labelAfter = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Share' || b.text() === 'Copied!');
    expect(labelAfter.text()).toBe('Copied!');
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

    const wrapper = mount(ScoreScreen, {
      props: {
        result: makeResult({
          score: 50,
          history: [{ word: 'bar', parents: [] }],
        }),
        mode: 'daily',
        date: '2026-04-25',
      },
    });
    const shareBtn = wrapper.findAll('button').find((b) => b.text() === 'Share');
    await shareBtn.trigger('click');
    await flushPromises();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    const labelAfter = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Share' || b.text() === 'Copied!');
    expect(labelAfter.text()).toBe('Share');
  });
});
