import { describe, it, expect } from 'vitest';
import { createPool, drawTile, formWord, isFaceDownEmpty } from '../src/pool.js';

function makePool(faceDown) {
  return createPool(faceDown);
}

describe('createPool', () => {
  it('starts with all letters face-down and empty face-up pools', () => {
    const pool = makePool(['a', 'b', 'c', 'd']);
    expect(pool.faceDown.length).toBe(4);
    expect(pool.looseLetters).toEqual([]);
    expect(pool.words).toEqual([]);
  });
});

describe('drawTile', () => {
  it('moves one tile from face-down to looseLetters in order', () => {
    const pool = makePool(['x', 'y', 'z']);
    const next = drawTile(pool);
    expect(next.faceDown).toEqual(['y', 'z']);
    expect(next.looseLetters).toEqual(['x']);
  });

  it('does not mutate the original pool', () => {
    const pool = makePool(['a', 'b']);
    const before = JSON.parse(JSON.stringify(pool));
    drawTile(pool);
    expect(pool).toEqual(before);
  });

  it('returns null when face-down is empty', () => {
    const pool = makePool([]);
    expect(drawTile(pool)).toBeNull();
  });
});

describe('isFaceDownEmpty', () => {
  it('is true when face-down has no tiles', () => {
    expect(isFaceDownEmpty(makePool([]))).toBe(true);
  });
  it('is false when face-down has tiles', () => {
    expect(isFaceDownEmpty(makePool(['a']))).toBe(false);
  });
});

describe('formWord', () => {
  it('removes consumed loose letters and adds the formed word entry', () => {
    const pool = { faceDown: [], looseLetters: ['c', 'a', 't', 'b'], words: [] };
    const next = formWord(pool, {
      word: 'cat',
      consumedLoose: ['c', 'a', 't'],
      consumedWordIndices: [],
    });
    expect(next.looseLetters).toEqual(['b']);
    expect(next.words.length).toBe(1);
    expect(next.words[0].word).toBe('cat');
  });

  it('removes consumed preexisting words from the words array', () => {
    const pool = {
      faceDown: [],
      looseLetters: ['b'],
      words: [{ word: 'rook', parents: [] }],
    };
    const next = formWord(pool, {
      word: 'brook',
      consumedLoose: ['b'],
      consumedWordIndices: [0],
    });
    expect(next.looseLetters).toEqual([]);
    expect(next.words.length).toBe(1);
    expect(next.words[0].word).toBe('brook');
  });

  it('records consumed words as parents of the new entry', () => {
    const pool = {
      faceDown: [],
      looseLetters: ['b'],
      words: [{ word: 'rook', parents: [] }],
    };
    const next = formWord(pool, {
      word: 'brook',
      consumedLoose: ['b'],
      consumedWordIndices: [0],
    });
    expect(next.words[0].parents).toEqual(['rook']);
  });

  it('does not mutate the original pool', () => {
    const pool = { faceDown: [], looseLetters: ['c', 'a', 't'], words: [] };
    const before = JSON.parse(JSON.stringify(pool));
    formWord(pool, {
      word: 'cat',
      consumedLoose: ['c', 'a', 't'],
      consumedWordIndices: [],
    });
    expect(pool).toEqual(before);
  });
});
