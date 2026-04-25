export function letterSignature(word) {
  return word.toLowerCase().split('').sort().join('');
}

export function loadDictionary(json) {
  const words = json.words || [];
  const set = new Set(words.map((w) => w.toLowerCase()));
  const signatureIndex = new Map();
  for (const w of words) {
    const sig = letterSignature(w);
    if (!signatureIndex.has(sig)) signatureIndex.set(sig, []);
    signatureIndex.get(sig).push(w.toLowerCase());
  }
  return {
    isWord(word) {
      if (!word) return false;
      return set.has(word.toLowerCase());
    },
    signatureIndex,
  };
}
