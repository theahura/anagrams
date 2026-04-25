# Current Progress — Anagrams

## Commit history

### `feat/initial-game` — Initial playable game (this commit)

Brand-new repository scaffolding plus a complete, playable Anagrams MVP.

#### Tooling
- Vite 7 + Vue 3 SPA, identical setup to `~/code/games/reword`.
- Vitest + happy-dom for unit + component tests.
- `npm run build-dict` downloads TWL06 + filters profanity → `data/dictionary.json`.

#### Domain modules (under `src/`)
- `prng.js` — `cyrb128`, `sfc32`, `getDailyRng`, `getRandomRng`, `seededShuffle`,
  `seededPick` (ported from reword).
- `tiles.js` — Bananagrams letter distribution (144 tiles); `createTileSet`,
  `shuffleTiles`.
- `pool.js` — immutable three-pool state (`faceDown`, `looseLetters`, `words`);
  `createPool`, `drawTile`, `formWord`, `isFaceDownEmpty`.
- `dictionary.js` — `loadDictionary` returning `{ isWord, signatureIndex }`;
  signature-based anagram lookup.
- `trivialInflection.js` — port of reword's `isTrivialInflection` (uses
  `wink-lemmatizer` + override list for drop-e edge cases).
- `anagramRules.js` — `canFormWord(typed, board, dict)` enforces all
  spec restrictions: length ≥ 3, in-dictionary, not-profane, must use ALL
  letters of any consumed preexisting word, not a trivial inflection,
  not a no-op replay.
- `scoring.js` — `scoreWord(w) = w.length²`; `hasLoosePoolAnagram` (signature
  subset enumeration up to size 8); `finalScore = sum − 10·missed_draws`.
- `game.js` — `createGame`, `drawTile`, `submitWord`, `endGame` orchestrator.
- `share.js` — Wordle-style share text (mode + score + longest length + time).

#### UI (under `src/components/`)
- `App.vue` — top-level `home / game / score` state machine, lazy-loads the
  bundled dictionary on first start.
- `HomeScreen.vue` — Daily Challenge / Random Trial buttons + rules summary.
- `GameScreen.vue` — face-up tile rack, word list, typed-input + Submit + Draw,
  live timer, live score.
- `ScoreScreen.vue` — final score grid, longest word transformation chain,
  Share button (clipboard copy).

#### Tests (`tests/`)
- `prng.test.js`, `tiles.test.js`, `pool.test.js`, `dictionary.test.js`,
  `trivialInflection.test.js`, `anagramRules.test.js`, `scoring.test.js`,
  `game.test.js`, `share.test.js`, `app.smoke.test.js`. All 70 tests green.

#### Verified
- `npm test` — 71/71 passing.
- `npm run build` — production bundle builds, dictionary emitted as asset.
- `npm run dev` — boots; HTML, vue components, dictionary asset all served.

#### Post-review fixes applied
- `wink-lemmatizer` moved from `devDependencies` to `dependencies` (was
  imported at runtime by `src/trivialInflection.js`).
- `game.history` (append-only) added so `endGame.buildChain` can reconstruct
  the longest-word transformation even after parent words have been
  consumed by `formWord`. Final score now sums history (rewards each step
  of `fine → refine → redefine`), not just on-table words.
- Smoke test now asserts on the feedback message text, not just its
  presence.

### `feat/initial-game` — Click-to-stage tile interaction (this commit)

Adds a hybrid input model: clicks on face-up tiles or on existing word rows
append letters to the typed input as a fast shortcut. Live multiset
highlighting shows which tiles and word groups are claimed by the current
input.

#### New / changed
- `src/staging.js` (new) — `highlightConsumption(typed, pool)` returns
  `{ words: Set<idx>, loose: Set<idx> }`. Greedy multiset matching: claim
  each existing word in order if it fits, then leftmost-first per letter
  for residual loose tiles. No dictionary / profanity check — purely a UI
  hint. `canFormWord` remains the source of truth at submit time.
- `src/components/GameScreen.vue` — face-up tile spans and word rows are
  now `clickable` with `@mousedown.prevent` handlers (`onTileClick`,
  `onWordClick`). A `consumption` computed property feeds `used` (loose
  tiles) and `consumed` (word rows) classes from
  `highlightConsumption`.
- `style.css` — `.tile.clickable` cursor + hover transform; `.word-row`
  rounded background container, `.word-row.clickable` hover, and
  `.word-row.consumed` accent (green tint + inset border).

#### Tests added
- `tests/staging.test.js` — 10 unit tests for `highlightConsumption`:
  empty input, single match, leftmost-of-duplicates, multi-letter, full
  word coverage, partial-coverage rejection, steal scenarios,
  over-consumption skipping, unclaimable extras (still claim what fits),
  case-insensitive.
- `tests/gameScreenInteraction.test.js` — 6 component tests covering
  click-to-append (tile + word), cumulative clicks, `used` class on
  matched loose tiles, `consumed` class on fully-covered words,
  no `consumed` on partial coverage.
- `tests/app.smoke.test.js` — added a smoke test asserting tile-click
  flows through the App boundary into the input box.

#### Verified
- `npm test` — 88/88 passing (10 staging + 6 gameScreenInteraction + 1
  app smoke addition + 71 prior).
- `npm run build` — production bundle builds (≈1.8 MB JS, identical to
  prior commit; CSS now 5.78 kB up from 5.31 kB).
- `npm run dev` — boots; HTML, vue components, dictionary asset all
  served. Tiles and word rows respond to clicks.

## Open follow-ups (next commits)

- Performance: bundled JS is 1.8MB (mostly `wink-lemmatizer`); consider
  lazy-loading or pre-computing trivial inflections offline.
- A11y pass: keyboard navigation, focus rings, ARIA on tile rack.
- Persistence (local-storage) for daily streak / past scores.
- Stronger share text (Wordle-style emoji block summarising flow).
- "Clear input" button to reset typed input quickly.
- Click an already-`used` tile to remove the matching letter from input
  (currently it just appends another copy).
- noridoc initialization once folder structure stabilises.
