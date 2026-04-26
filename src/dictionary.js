const LEMMA_SCHEMA_VERSION = 1;

export function letterSignature(word) {
  return word.toLowerCase().split('').sort().join('');
}

export function loadDictionary(json, lemmasJson) {
  const words = json.words || [];
  const set = new Set(words.map((w) => w.toLowerCase()));
  const signatureIndex = new Map();
  for (const w of words) {
    const sig = letterSignature(w);
    if (!signatureIndex.has(sig)) signatureIndex.set(sig, []);
    signatureIndex.get(sig).push(w.toLowerCase());
  }
  if (!lemmasJson || typeof lemmasJson !== 'object') {
    throw new Error('loadDictionary: lemmasJson is required');
  }
  if (lemmasJson.schemaVersion !== LEMMA_SCHEMA_VERSION) {
    throw new Error(
      `loadDictionary: lemmasJson schemaVersion ${lemmasJson.schemaVersion} != ${LEMMA_SCHEMA_VERSION}`
    );
  }
  if (!lemmasJson.lemmas || typeof lemmasJson.lemmas !== 'object') {
    throw new Error('loadDictionary: lemmasJson.lemmas must be an object');
  }
  const lemmaIndex = new Map();
  for (const [word, lemmas] of Object.entries(lemmasJson.lemmas)) {
    lemmaIndex.set(word.toLowerCase(), lemmas);
  }
  return {
    isWord(word) {
      if (!word) return false;
      return set.has(word.toLowerCase());
    },
    signatureIndex,
    lemmaIndex,
  };
}
