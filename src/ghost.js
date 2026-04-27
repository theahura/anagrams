import { letterSignature } from './dictionary.js';
import { isProfane } from './anagramRules.js';
import { isTrivialInflection } from './trivialInflection.js';
import { formWord } from './pool.js';
import { seededPick } from './prng.js';

const MIN_DELAY_MS = 10000;
const MAX_DELAY_MS = 30000;
const MAX_LOOSE_SUBSET = 8;

export function pickGhostDelay(random, { minMs = MIN_DELAY_MS, maxMs = MAX_DELAY_MS } = {}) {
  return Math.floor(minMs + random() * (maxMs - minMs));
}

export function findGhostSteal(pool, dict, { random, onlyOwner = 'human' } = {}) {
  if (!random) throw new Error('findGhostSteal: random function is required');
  if (!dict || typeof dict.isCommonWord !== 'function') return null;
  if (pool.looseLetters.length === 0) return null;

  const legal = [];
  for (let parentIndex = 0; parentIndex < pool.words.length; parentIndex++) {
    const entry = pool.words[parentIndex];
    if (entry.owner !== onlyOwner) continue;
    const parentWord = entry.word;
    const cap = Math.min(MAX_LOOSE_SUBSET, pool.looseLetters.length);
    const seenForParent = new Set();
    for (let k = 1; k <= cap; k++) {
      for (const consumedLoose of subsetCombinations(pool.looseLetters, k)) {
        const combinedSig = letterSignature(parentWord + consumedLoose.join(''));
        const candidates = dict.signatureIndex.get(combinedSig);
        if (!candidates) continue;
        for (const candidate of candidates) {
          if (seenForParent.has(candidate)) continue;
          if (candidate.length <= parentWord.length) continue;
          if (!dict.isCommonWord(candidate)) continue;
          if (isProfane(candidate)) continue;
          if (isTrivialInflection(candidate, parentWord, dict.lemmaIndex)) continue;
          seenForParent.add(candidate);
          legal.push({
            word: candidate,
            parentIndex,
            parentWord,
            consumedLoose: [...consumedLoose],
          });
        }
      }
    }
  }

  if (legal.length === 0) return null;
  return seededPick(legal, random);
}

export function applyGhostSteal(pool, steal) {
  return formWord(pool, {
    word: steal.word,
    consumedLoose: steal.consumedLoose,
    consumedWordIndices: [steal.parentIndex],
    owner: 'ghost',
  });
}

export function startGhost({ getGame, dict, random, onSteal }) {
  let timer = null;
  let stopped = false;

  function schedule() {
    if (stopped) return;
    const delay = pickGhostDelay(random);
    timer = setTimeout(tick, delay);
  }

  function tick() {
    if (stopped) return;
    const game = getGame();
    if (!game || game.ended) {
      schedule();
      return;
    }
    const steal = findGhostSteal(game.pool, dict, { random });
    if (steal) {
      const newPool = applyGhostSteal(game.pool, steal);
      onSteal(newPool, steal);
    }
    schedule();
  }

  schedule();

  return {
    stop() {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

function* subsetCombinations(letters, size) {
  const seen = new Set();
  function* go(start, picked) {
    if (picked.length === size) {
      const sig = letterSignature(picked.join(''));
      if (!seen.has(sig)) {
        seen.add(sig);
        yield [...picked];
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
