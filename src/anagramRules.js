import { Filter } from 'bad-words';
import { isTrivialInflection } from './trivialInflection.js';

const profanityFilter = new Filter();

export function isProfane(word) {
  return profanityFilter.isProfane(word);
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

    if (consumedWords.includes(word)) {
      bestFailure = bumpFailure(bestFailure, 'no-new-play', FAILURE_PRIORITY);
      continue;
    }

    if (consumedWords.some((w) => isTrivialInflection(word, w))) {
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

function multiset(letters) {
  const m = {};
  for (const ch of letters) m[ch] = (m[ch] || 0) + 1;
  return m;
}

function mergeMultiset(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}

function subtractMultiset(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const next = (out[k] || 0) - v;
    if (next < 0) return null;
    if (next === 0) delete out[k];
    else out[k] = next;
  }
  return out;
}

function arrayFromMultiset(m) {
  const out = [];
  for (const [k, v] of Object.entries(m)) {
    for (let i = 0; i < v; i++) out.push(k);
  }
  return out;
}
