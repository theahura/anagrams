export function createPool(faceDownTiles) {
  return {
    faceDown: [...faceDownTiles],
    looseLetters: [],
    words: [],
  };
}

export function isFaceDownEmpty(pool) {
  return pool.faceDown.length === 0;
}

export function drawTile(pool) {
  if (pool.faceDown.length === 0) return null;
  const [next, ...rest] = pool.faceDown;
  return {
    ...pool,
    faceDown: rest,
    looseLetters: [...pool.looseLetters, next],
  };
}

export function formWord(pool, { word, consumedLoose, consumedWordIndices }) {
  const remainingLoose = removeMultiset(pool.looseLetters, consumedLoose);
  const consumedSet = new Set(consumedWordIndices);
  const consumedParents = consumedWordIndices.map((i) => pool.words[i].word);
  const remainingWords = pool.words.filter((_, i) => !consumedSet.has(i));
  return {
    ...pool,
    looseLetters: remainingLoose,
    words: [...remainingWords, { word, parents: consumedParents }],
  };
}

function removeMultiset(arr, toRemove) {
  const out = [...arr];
  for (const ch of toRemove) {
    const idx = out.indexOf(ch);
    if (idx !== -1) out.splice(idx, 1);
  }
  return out;
}
