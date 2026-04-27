// Builds data/common-words.json by intersecting a top-50k frequency list
// with the TWL06 dictionary so the ghost player only knows recognizable words.
// Frequency source: hermitdave/FrequencyWords (en_50k.txt, MIT, OpenSubtitles).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { Filter } from 'bad-words';

const FREQ_LIST_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DICT_PATH = path.join(DATA_DIR, 'dictionary.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'common-words.json');
const MAX_ENTRIES = 50000;
const MIN_LEN = 3;

const profanityFilter = new Filter();

export function intersectCommonWords(commonList, dictionarySet, { maxEntries = MAX_ENTRIES } = {}) {
  const out = [];
  const seen = new Set();
  for (const raw of commonList) {
    if (typeof raw !== 'string') continue;
    const w = raw.toLowerCase();
    if (!/^[a-z]+$/.test(w)) continue;
    if (w.length < MIN_LEN) continue;
    if (!dictionarySet.has(w)) continue;
    if (profanityFilter.isProfane(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= maxEntries) break;
  }
  return out;
}

async function fetchFrequencyList() {
  console.log('Downloading FrequencyWords en_50k.txt...');
  const res = await fetch(FREQ_LIST_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // The file format is "word count" per line; we only want the first column.
  const words = text
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
  console.log(`  Got ${words.length} entries`);
  return words;
}

function loadDictionarySet() {
  if (!existsSync(DICT_PATH)) {
    throw new Error(`Missing ${DICT_PATH}. Run \`npm run build-dict\` first.`);
  }
  const dictRaw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  return new Set((dictRaw.words || []).map((w) => w.toLowerCase()));
}

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const dictionarySet = loadDictionarySet();
  const freqList = await fetchFrequencyList();
  const common = intersectCommonWords(freqList, dictionarySet);
  const out = { schemaVersion: 1, words: common };
  writeFileSync(OUTPUT_PATH, JSON.stringify(out));
  const sizeKB = (JSON.stringify(out).length / 1024).toFixed(1);
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKB} KB, ${common.length} words)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
