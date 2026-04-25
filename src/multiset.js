export function multiset(letters) {
  const m = {};
  for (const ch of letters) m[ch] = (m[ch] || 0) + 1;
  return m;
}

export function mergeMultiset(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}

export function subtractMultiset(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const next = (out[k] || 0) - v;
    if (next < 0) return null;
    if (next === 0) delete out[k];
    else out[k] = next;
  }
  return out;
}

export function arrayFromMultiset(m) {
  const out = [];
  for (const [k, v] of Object.entries(m)) {
    for (let i = 0; i < v; i++) out.push(k);
  }
  return out;
}
