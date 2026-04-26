import { findConsumption } from './anagramRules.js';
import { multiset, subtractMultiset, arrayFromMultiset } from './multiset.js';

export function highlightConsumption(typed, pool, trail) {
  const word = (typed || '').toLowerCase();

  const identityWords = new Set();
  const identityLoose = new Set();
  const typedResidueLetters = [];
  if (Array.isArray(trail)) {
    for (const entry of trail) {
      if (
        entry.kind === 'word' &&
        Number.isInteger(entry.sourceIndex) &&
        entry.sourceIndex >= 0 &&
        entry.sourceIndex < pool.words.length
      ) {
        identityWords.add(entry.sourceIndex);
      } else if (
        entry.kind === 'loose' &&
        Number.isInteger(entry.sourceIndex) &&
        entry.sourceIndex >= 0 &&
        entry.sourceIndex < pool.looseLetters.length
      ) {
        identityLoose.add(entry.sourceIndex);
      } else if (entry.kind === 'typed') {
        typedResidueLetters.push((entry.letter || '').toLowerCase());
      }
    }
  }

  if (identityWords.size === 0 && identityLoose.size === 0) {
    const found = findConsumption(word, pool);
    if (found) {
      const looseHi = pickLooseIndices(pool.looseLetters, found.consumedLoose);
      return { words: new Set(found.consumedWordIndices), loose: looseHi };
    }
    return partialHighlight(word, pool);
  }

  let remaining = multiset(typedResidueLetters);
  const wordsHi = new Set(identityWords);
  for (let i = 0; i < pool.words.length; i++) {
    if (wordsHi.has(i)) continue;
    const wm = multiset(pool.words[i].word.split(''));
    const sub = subtractMultiset(remaining, wm);
    if (sub !== null) {
      remaining = sub;
      wordsHi.add(i);
    }
  }

  const looseHi = new Set(identityLoose);
  for (const letter of arrayFromMultiset(remaining)) {
    for (let j = 0; j < pool.looseLetters.length; j++) {
      if (looseHi.has(j)) continue;
      if (pool.looseLetters[j] === letter) {
        looseHi.add(j);
        break;
      }
    }
  }

  return { words: wordsHi, loose: looseHi };
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
