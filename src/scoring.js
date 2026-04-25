import { letterSignature } from './dictionary.js';

const MISSED_DRAW_PENALTY = 10;
const MIN_WORD_LEN = 3;
const MAX_LOOSE_SUBSET = 8;

export function scoreWord(word) {
  return word.length * word.length;
}

export function hasLoosePoolAnagram(looseLetters, dict) {
  if (looseLetters.length < MIN_WORD_LEN) return false;
  const cap = Math.min(MAX_LOOSE_SUBSET, looseLetters.length);
  for (let size = MIN_WORD_LEN; size <= cap; size++) {
    for (const sig of subsetSignatures(looseLetters, size)) {
      if (dict.signatureIndex.has(sig)) return true;
    }
  }
  return false;
}

export function finalScore({ words, missedDrawCount }) {
  const wordPoints = words.reduce((sum, w) => sum + scoreWord(w.word), 0);
  return wordPoints - MISSED_DRAW_PENALTY * missedDrawCount;
}

function* subsetSignatures(letters, size) {
  const seen = new Set();
  function* go(start, picked) {
    if (picked.length === size) {
      const sig = letterSignature(picked.join(''));
      if (!seen.has(sig)) {
        seen.add(sig);
        yield sig;
      }
      return;
    }
    for (let i = start; i < letters.length; i++) {
      picked.push(letters[i]);
      yield* go(i + 1, picked);
      picked.pop();
    }
  }
  yield* go(0, []);
}
