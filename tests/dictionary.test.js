import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

describe('loadDictionary', () => {
  it('exposes isWord which returns true for common english words', () => {
    expect(dict.isWord('cat')).toBe(true);
    expect(dict.isWord('hello')).toBe(true);
    expect(dict.isWord('rook')).toBe(true);
    expect(dict.isWord('brook')).toBe(true);
  });

  it('isWord returns false for unknown strings', () => {
    expect(dict.isWord('xqzv')).toBe(false);
    expect(dict.isWord('asdfgh')).toBe(false);
  });

  it('isWord is case-insensitive', () => {
    expect(dict.isWord('Hello')).toBe(true);
    expect(dict.isWord('HELLO')).toBe(true);
  });

  it('isWord returns false for the empty string', () => {
    expect(dict.isWord('')).toBe(false);
  });

  it('exposes signatureIndex finding anagrams by sorted-letter key', () => {
    const matches = dict.signatureIndex.get('aet');
    expect(matches).toBeDefined();
    expect(matches).toContain('ate');
    expect(matches).toContain('eat');
    expect(matches).toContain('tea');
  });
});
