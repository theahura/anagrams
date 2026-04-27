import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from '../src/dictionary.js';
import {
  findGhostSteal,
  applyGhostSteal,
  pickGhostDelay,
} from '../src/ghost.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(__dirname, '..', 'data', 'dictionary.json');
const LEMMAS_PATH = path.resolve(__dirname, '..', 'data', 'lemmas.json');

let baseDict;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  baseDict = loadDictionary(raw, lemmasRaw);
});

function dictWithCommon(commonList) {
  const raw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const lemmasRaw = JSON.parse(readFileSync(LEMMAS_PATH, 'utf8'));
  return loadDictionary(raw, lemmasRaw, {
    schemaVersion: 1,
    words: commonList,
  });
}

function pool({ loose = [], words = [] } = {}) {
  return {
    faceDown: [],
    looseLetters: loose,
    words: words.map((w) =>
      typeof w === 'string'
        ? { word: w, parents: [], owner: 'human' }
        : { parents: [], owner: 'human', ...w }
    ),
  };
}

const constRng = (v) => () => v;

describe('findGhostSteal', () => {
  it('returns null when there are no claimed words to steal', () => {
    const dict = dictWithCommon(['cat', 'cats']);
    const result = findGhostSteal(pool({ loose: ['c', 'a', 't'] }), dict, {
      random: constRng(0),
    });
    expect(result).toBeNull();
  });

  it('returns null when there are no loose letters available', () => {
    const dict = dictWithCommon(['cat', 'rook', 'brook']);
    const result = findGhostSteal(pool({ words: ['rook'] }), dict, {
      random: constRng(0),
    });
    expect(result).toBeNull();
  });

  it('returns a steal whose new word is longer than the parent word it consumes', () => {
    const dict = dictWithCommon(['rook', 'brook']);
    const result = findGhostSteal(
      pool({ loose: ['b'], words: ['rook'] }),
      dict,
      { random: constRng(0) }
    );
    expect(result).not.toBeNull();
    expect(result.word).toBe('brook');
    expect(result.parentWord).toBe('rook');
    expect(result.parentIndex).toBe(0);
    expect(result.consumedLoose).toEqual(['b']);
  });

  it('ignores legal-but-uncommon words even when TWL06 contains them', () => {
    // 'snub' is a real TWL06 word and a legal steal of 'nub' + s.
    // Restrict the common set so it does NOT include 'snub'.
    const dict = dictWithCommon(['nub']);
    const result = findGhostSteal(
      pool({ loose: ['s'], words: ['nub'] }),
      dict,
      { random: constRng(0) }
    );
    expect(result).toBeNull();
  });

  it('skips trivial-inflection candidates (cat -> cats)', () => {
    const dict = dictWithCommon(['cat', 'cats', 'acts']);
    const result = findGhostSteal(
      pool({ loose: ['s'], words: ['cat'] }),
      dict,
      { random: constRng(0) }
    );
    // 'cats' is a trivial inflection of 'cat' so should be skipped.
    // 'acts' is a legitimate steal — single-parent, longer, common.
    expect(result).not.toBeNull();
    expect(result.word).toBe('acts');
  });

  it('only targets human-owned words', () => {
    const dict = dictWithCommon(['rook', 'brook']);
    const result = findGhostSteal(
      pool({
        loose: ['b'],
        words: [{ word: 'rook', owner: 'ghost' }],
      }),
      dict,
      { random: constRng(0) }
    );
    expect(result).toBeNull();
  });

  it('picks deterministically among multiple legal steals using the supplied rng', () => {
    // Two legal steals from the same parent: 'shorted' or 'shortie' from short + e + d/i? Let's pick a simpler one.
    // From 'tea' + s, common candidates: 'eats', 'seat'
    const dict = dictWithCommon(['tea', 'eats', 'seat']);
    const candidates = new Set();
    for (let i = 0; i < 10; i++) {
      const r = findGhostSteal(
        pool({ loose: ['s'], words: ['tea'] }),
        dict,
        { random: constRng(i / 10) }
      );
      if (r) candidates.add(r.word);
    }
    expect(candidates.size).toBeGreaterThanOrEqual(2);
    expect([...candidates].every((w) => w === 'eats' || w === 'seat')).toBe(true);
  });
});

describe('applyGhostSteal', () => {
  it('removes the parent word and the consumed loose letters and inserts the new word with owner=ghost', () => {
    const before = pool({
      loose: ['b', 'x'],
      words: ['rook'],
    });
    const after = applyGhostSteal(before, {
      word: 'brook',
      parentIndex: 0,
      parentWord: 'rook',
      consumedLoose: ['b'],
    });
    expect(after.words.map((w) => w.word)).toEqual(['brook']);
    expect(after.words[0].owner).toBe('ghost');
    expect(after.words[0].parents).toEqual(['rook']);
    expect(after.looseLetters).toEqual(['x']);
  });
});

describe('pickGhostDelay', () => {
  it('always returns a value within [minMs, maxMs]', () => {
    for (let i = 0; i < 100; i++) {
      const r = Math.random();
      const d = pickGhostDelay(() => r);
      expect(d).toBeGreaterThanOrEqual(10000);
      expect(d).toBeLessThanOrEqual(30000);
    }
  });
});
