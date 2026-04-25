import { findConsumption } from './anagramRules.js';
import { multiset, subtractMultiset, arrayFromMultiset } from './multiset.js';

export function highlightConsumption(typed, pool) {
  const word = (typed || '').toLowerCase();
  const found = findConsumption(word, pool);

  if (found) {
    const looseHi = pickLooseIndices(pool.looseLetters, found.consumedLoose);
    return { words: new Set(found.consumedWordIndices), loose: looseHi };
  }

  return partialHighlight(word, pool);
}

function pickLooseIndices(looseLetters, neededLetters) {
  const picked = new Set();
  for (const letter of neededLetters) {
    for (let j = 0; j < looseLetters.length; j++) {
      if (picked.has(j)) continue;
      if (looseLetters[j] === letter) {
        picked.add(j);
        break;
      }
    }
  }
  return picked;
}

function partialHighlight(word, pool) {
  let remaining = multiset(word.split(''));
  const wordsHi = new Set();
  for (let i = 0; i < pool.words.length; i++) {
    const wm = multiset(pool.words[i].word.split(''));
    const sub = subtractMultiset(remaining, wm);
    if (sub !== null) {
      remaining = sub;
      wordsHi.add(i);
    }
  }
  const looseHi = pickLooseIndices(
    pool.looseLetters,
    arrayFromMultiset(remaining)
  );
  return { words: wordsHi, loose: looseHi };
}
