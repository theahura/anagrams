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

## Open follow-ups (next commits)

- Performance: bundled JS is 1.8MB (mostly `wink-lemmatizer`); consider
  lazy-loading or pre-computing trivial inflections offline.
- A11y pass: keyboard navigation, focus rings, ARIA on tile rack.
- Click-to-stage tile interaction as an alternative to typing.
- Persistence (local-storage) for daily streak / past scores.
- Stronger share text (Wordle-style emoji block summarising flow).
- noridoc initialization once folder structure stabilises.
