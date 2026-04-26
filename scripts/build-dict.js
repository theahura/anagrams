import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { Filter } from 'bad-words';

const WORD_LIST_URL = 'https://raw.githubusercontent.com/cviebrock/wordlists/master/TWL06.txt';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'dictionary.json');
const MIN_LEN = 3;

async function fetchTWL06() {
  console.log('Downloading TWL06 word list...');
  const res = await fetch(WORD_LIST_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const words = text
    .split('\n')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= MIN_LEN);
  console.log(`  Got ${words.length} words (length >= ${MIN_LEN})`);
  return words;
}

function filterProfanity(words) {
  const filter = new Filter();
  const before = words.length;
  const clean = words.filter((w) => !filter.isProfane(w));
  console.log(`  Removed ${before - clean.length} profane words`);
  return clean;
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const raw = await fetchTWL06();
  const clean = filterProfanity(raw);
  const out = { words: clean.sort() };
  writeFileSync(OUTPUT_PATH, JSON.stringify(out));
  const sizeKB = (JSON.stringify(out).length / 1024).toFixed(1);
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKB} KB, ${clean.length} words)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
