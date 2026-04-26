import { Filter } from 'bad-words';
import { isTrivialInflection } from './trivialInflection.js';
import {
  multiset,
  mergeMultiset,
  subtractMultiset,
  arrayFromMultiset,
} from './multiset.js';

const profanityFilter = new Filter();

export function isProfane(word) {
  return profanityFilter.isProfane(word);
}

export function findConsumption(typed, board) {
  const word = (typed || '').toLowerCase();
  const n = board.words.length;
  if (n > 16) return null;

  const typedM = multiset(word.split(''));
  const looseM = multiset(board.looseLetters);
  const wordMultisets = board.words.map((w) => multiset(w.word.split('')));

  for (let mask = 0; mask < 1 << n; mask++) {
    const subsetIdx = [];
    let combined = {};
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subsetIdx.push(i);
        combined = mergeMultiset(combined, wordMultisets[i]);
      }
    }

    const remaining = subtractMultiset(typedM, combined);
    if (remaining === null) continue;

    const looseRemaining = subtractMultiset(looseM, remaining);
    if (looseRemaining === null) continue;

    return {
      consumedWordIndices: subsetIdx,
      consumedLoose: arrayFromMultiset(remaining),
    };
  }

  return null;
}

export function canFormWord(typed, board, dict) {
  const word = typed.toLowerCase();
  if (word.length < 3) return { ok: false, reason: 'too-short' };
  if (isProfane(word)) return { ok: false, reason: 'profane' };
  if (!dict.isWord(word)) return { ok: false, reason: 'not-a-word' };

  const typedM = multiset(word.split(''));
  const looseM = multiset(board.looseLetters);
  const wordMultisets = board.words.map((w) => multiset(w.word.split('')));

  const FAILURE_PRIORITY = {
    'letters-unavailable': 1,
    'no-new-play': 2,
    'trivial-inflection': 3,
  };
  let bestFailure = 'letters-unavailable';

  const n = board.words.length;
  if (n > 16) {
    return { ok: false, reason: 'letters-unavailable' };
  }

  for (let mask = 0; mask < 1 << n; mask++) {
    const subsetIdx = [];
    let combined = {};
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subsetIdx.push(i);
        combined = mergeMultiset(combined, wordMultisets[i]);
      }
    }

    const remaining = subtractMultiset(typedM, combined);
    if (remaining === null) continue;

    const looseRemaining = subtractMultiset(looseM, remaining);
    if (looseRemaining === null) continue;

    const consumedWords = subsetIdx.map((i) => board.words[i].word);

    if (consumedWords.length > 0) {
      const maxParentLen = consumedWords.reduce(
        (m, w) => Math.max(m, w.length),
        0,
      );
      if (word.length <= maxParentLen) {
        bestFailure = bumpFailure(bestFailure, 'no-new-play', FAILURE_PRIORITY);
        continue;
      }
    }

    if (consumedWords.some((w) => isTrivialInflection(word, w, dict.lemmaIndex))) {
      bestFailure = bumpFailure(bestFailure, 'trivial-inflection', FAILURE_PRIORITY);
      continue;
    }

    return {
      ok: true,
      consumedWordIndices: subsetIdx,
      consumedLoose: arrayFromMultiset(remaining),
    };
  }

  return { ok: false, reason: bestFailure };
}

function bumpFailure(current, candidate, priority) {
  return priority[candidate] > priority[current] ? candidate : current;
}
