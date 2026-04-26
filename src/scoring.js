import { letterSignature } from './dictionary.js';
import { isProfane } from './anagramRules.js';
import { isTrivialInflection } from './trivialInflection.js';

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

export function hasMissedAnagram(pool, dict) {
  if (hasLoosePoolAnagram(pool.looseLetters, dict)) return 'loose';
  if (pool.words.length === 0) return null;
  if (pool.looseLetters.length === 0) return null;
  for (const parent of pool.words) {
    if (hasSingleParentSteal(parent.word, pool.looseLetters, dict)) {
      return 'steal';
    }
  }
  return null;
}

export function finalScore({ words, missedDrawCount }) {
  const wordPoints = words.reduce((sum, w) => sum + scoreWord(w.word), 0);
  return wordPoints - MISSED_DRAW_PENALTY * missedDrawCount;
}

function hasSingleParentSteal(parentWord, looseLetters, dict) {
  const cap = Math.min(MAX_LOOSE_SUBSET, looseLetters.length);
  for (let k = 1; k <= cap; k++) {
    for (const looseSig of subsetSignatures(looseLetters, k)) {
      const combinedSig = letterSignature(parentWord + looseSig);
      const candidates = dict.signatureIndex.get(combinedSig);
      if (!candidates) continue;
      for (const candidate of candidates) {
        if (candidate.length <= parentWord.length) continue;
        if (isProfane(candidate)) continue;
        if (isTrivialInflection(candidate, parentWord, dict.lemmaIndex)) continue;
        return true;
      }
    }
  }
  return false;
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
