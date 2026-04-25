import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import lem from 'wink-lemmatizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DICT_PATH = path.join(DATA_DIR, 'dictionary.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'lemmas.json');

export function buildLemmaIndex(words) {
  const out = {};
  for (const raw of words) {
    const w = raw.toLowerCase();
    const candidates = [lem.verb(w), lem.noun(w), lem.adjective(w)];
    const lemmas = [];
    for (const c of candidates) {
      if (typeof c !== 'string') continue;
      if (c === w) continue;
      if (!lemmas.includes(c)) lemmas.push(c);
    }
    if (lemmas.length > 0) out[w] = lemmas;
  }
  return out;
}

function main() {
  if (!existsSync(DICT_PATH)) {
    throw new Error(`Missing ${DICT_PATH}. Run \`npm run build-dict\` first.`);
  }
  const dictRaw = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const words = dictRaw.words || [];
  console.log(`Building lemma index over ${words.length} words...`);
  const lemmas = buildLemmaIndex(words);
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const out = { schemaVersion: 1, lemmas };
  writeFileSync(OUTPUT_PATH, JSON.stringify(out));
  const sizeKB = (JSON.stringify(out).length / 1024).toFixed(1);
  const entries = Object.keys(lemmas).length;
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKB} KB, ${entries} entries)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
