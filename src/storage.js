const STORAGE_KEY = 'anagrams:v1';
const SCHEMA_VERSION = 1;
const DAY_MS = 86400000;

export function loadStore(storage) {
  const empty = { schemaVersion: SCHEMA_VERSION, records: {} };
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return empty;
  }
  if (!raw) return empty;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.schemaVersion !== SCHEMA_VERSION ||
    !parsed.records ||
    typeof parsed.records !== 'object'
  ) {
    return empty;
  }
  return { schemaVersion: SCHEMA_VERSION, records: parsed.records };
}

export function recordDailyResult(storage, { date, score, longestWord, durationMs }) {
  const store = loadStore(storage);
  if (Object.prototype.hasOwnProperty.call(store.records, date)) {
    return { stored: store.records[date], wasNewRecord: false };
  }
  const entry = {
    score,
    longestWord: longestWord || '',
    durationMs,
    completedAt: Date.now(),
  };
  const next = {
    schemaVersion: SCHEMA_VERSION,
    records: { ...store.records, [date]: entry },
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return { stored: entry, wasNewRecord: false };
  }
  return { stored: entry, wasNewRecord: true };
}

export function currentStreak(records, todayDate) {
  if (!records || Object.keys(records).length === 0) return 0;
  let cursor;
  if (Object.prototype.hasOwnProperty.call(records, todayDate)) {
    cursor = todayDate;
  } else {
    const prev = shiftDate(todayDate, -1);
    if (!Object.prototype.hasOwnProperty.call(records, prev)) return 0;
    cursor = prev;
  }
  let n = 0;
  while (Object.prototype.hasOwnProperty.call(records, cursor)) {
    n += 1;
    cursor = shiftDate(cursor, -1);
  }
  return n;
}

export function bestScore(records) {
  if (!records) return 0;
  let best = 0;
  for (const k of Object.keys(records)) {
    const s = records[k]?.score ?? 0;
    if (s > best) best = s;
  }
  return best;
}

export function hasCompletedDate(records, date) {
  if (!records) return false;
  return Object.prototype.hasOwnProperty.call(records, date);
}

export function browserStorage() {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return noopStorage();
  }
  try {
    const probeKey = '__anagrams_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return noopStorage();
  }
}

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

function shiftDate(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + deltaDays * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}
