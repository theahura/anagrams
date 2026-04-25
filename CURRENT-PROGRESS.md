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

### `feat/initial-game` — Wordle-style share grid (this commit)

Replaces the flat-text share output with a Wordle-style emoji block that
visually summarises the player's run, satisfying APPLICATION-SPEC.md's
"share button (come up with something clever that we can use that is
wordle style)" requirement.

#### Format

```
Anagrams 2026-04-25 — 142

🟩🟩🟩🟩
🟨🟨🟨🟨🟩🟩
🟨🟨🟨🟨🟨🟨🟩🟩

Longest 8 · Time 5:00
```

Per row: 🟨 count = sum of consumed parent-word lengths (recycled
letters); 🟩 count = remainder (newly-added letters). Random mode shows
`Anagrams Random — <score>` instead of a date. Empty history → header +
footer only, no emoji rows.

#### New / changed
- `src/share.js` — rewritten. New optional `history` param; emits header
  + emoji rows + footer. Uses U+1F7E9 / U+1F7E8 (large green/yellow
  squares) for portability across Discord / iMessage / Twitter without
  variation selectors. No row padding — emoji widths are not consistent
  across renderers (VS Code / Discord desktop / iMessage all differ);
  ragged left-aligned rows are the convention.
- `src/game.js` — `endGame` result now exposes `history` so the score
  screen can hand it to the share function.
- `src/components/ScoreScreen.vue` — passes `result.history` into
  `generateShareText`.

#### Tests added
- `tests/share.test.js` — 6 new emoji-grid tests covering: empty
  history, all-green original word, single-parent steal (yellow + green
  mix), three-row chain (`fine → refine → redefine`), multi-parent
  all-yellow steal, footer format with longest length and time.
- Pre-existing share tests (date / score / longest-length / random
  header / determinism) continue to pass — the new format still contains
  those substrings.

#### Verified
- `npm test` — 96/96 passing (was 90; +6 new share tests).
- No changes to game logic, scoring, or anagram rules.

### `feat/initial-game` — Click-to-remove + Clear button (this commit)

Makes the click-to-stage interaction reversible. Clicking a tile/word
that is already claimed by the typed input now *removes* its letters.
Adds a "Clear" button that resets the typed input in one action.

#### New / changed
- `src/components/GameScreen.vue`:
  - `onTileClick(i)`: if `consumption.loose.has(i)`, remove the first
    occurrence of that letter from `typed` (case-insensitive). Else
    append (existing behavior).
  - `onWordClick(i)`: if `consumption.words.has(i)`, remove the word's
    letters from `typed` one-at-a-time, leftmost-first per letter. Else
    append.
  - New `onClear()` resets `typed` to `''` and clears feedback.
  - Two inline pure-string helpers: `removeFirstOccurrence(s, ch)` and
    `removeWordLetters(s, word)`.
  - Template: new `<button type="button">Clear</button>` between the
    input and Submit, disabled while `typed === ''`.
- No CSS changes needed — existing `.action-btn` + `.action-btn:disabled`
  styles cover the new button.
- No domain-module changes (`staging.js`, `anagramRules.js`, `game.js`,
  `scoring.js`, `pool.js`, etc. are untouched).

#### Tests added
- `tests/gameScreenInteraction.test.js`:
  - "removes the letter from input when an already-claimed tile is
    clicked" (replaces the previous "does not append" no-op test).
  - "removes the entire word's letters from input when an
    already-consumed word row is clicked" (typed='brook', word='rook'
    → typed='b').
  - "removes only the letters of the clicked word, leaving extras
    intact" (typed='barook' with extras 'b','a' loose → typed='ba').
  - "removes letters case-insensitively when input is uppercase".
  - "renders a Clear button that resets typed input when clicked".
  - "Clear button is disabled when typed input is empty".
  - "Clear button is enabled when typed input is non-empty".
- `tests/app.smoke.test.js`:
  - "Clear button empties the typed input from the App boundary".

#### Verified
- `npm test` — 103/103 passing (was 96; +7 new + 1 replaced).
- `npm run build` — production bundle builds, no size change.

#### Known limitation (documented in RESEARCH-NOTES.md)
- With duplicate letters, clicking the leftmost-of-letter claimed tile
  causes the rightmost-of-letter to lose its highlight instead. This is
  intrinsic to the multiset-claim model; fixing it requires switching
  to an explicit staged-array model (out of scope for a polish commit).
  Backspace and Clear both work as fallbacks.

### `feat/initial-game` — Daily streak + best-score persistence (this commit)

Adds a localStorage-backed persistence layer that records each finished
Daily Challenge run, derives a current streak (consecutive UTC days)
and a best score, and surfaces both on the Home and Score screens. The
share text grows a ` · Streak <N>` suffix in daily mode when the streak
is ≥ 2. Random Trial games never touch storage. No domain-module
changes.

#### New / changed
- `src/storage.js` (new) — pure functions over an injected storage
  shim. `loadStore` is robust to missing key / malformed JSON / wrong
  schemaVersion / `getItem` throws. `recordDailyResult` is keep-first
  per date (Wordle convention) and swallows `setItem` failures
  (Safari Private Mode quota=0). `currentStreak` walks back day-by-day,
  preserving the streak when today is missing but yesterday is
  present. `bestScore` and `hasCompletedDate` are pure derivations.
  `browserStorage()` returns `window.localStorage` after a probe write,
  else a no-op shim. Schema: `{ schemaVersion: 1, records: { 'YYYY-MM-DD':
  { score, longestWord, durationMs, completedAt } } }` under the single
  key `anagrams:v1`. Streak and best are NEVER persisted as
  denormalized state.
- `src/share.js` — `generateShareText` accepts an optional `streak`
  param; appends ` · Streak <N>` to the footer when `mode === 'daily'`
  and `streak ≥ 2`. Backwards-compatible: omitted/0/1 produces the
  prior output exactly.
- `src/components/HomeScreen.vue` — accepts `streak`, `best`,
  `completedToday` props. Renders a small stats row when either is
  non-zero; "✓ Played today" sub-label on the Daily Challenge button
  when `completedToday` is true.
- `src/components/ScoreScreen.vue` — accepts `streak`, `isNewBest`
  props; renders a streak / "New best!" pill row in daily mode. Passes
  `streak` to `generateShareText`.
- `src/components/App.vue` — owns a `stats` ref. `computeStats()` reads
  storage and derives `{ streak, best, completedToday }`. On
  `endGameWithResult` for daily games, snapshots the previous best
  *before* calling `recordDailyResult` (keep-first means reading after
  the write would always tie or lose), then sets `isNewBest`. Stats
  recompute on home and score transitions.
- `style.css` — `.home-stats`, `.home-stat`, `.played-today-tag`,
  `.score-streak-row`, `.score-streak`, `.new-best-pill`. Dark palette
  consistent with existing rules.

#### Tests added
- `tests/storage.test.js` (new) — 19 unit tests against a `Map`-backed
  fake storage shim. Covers `loadStore` (empty / malformed / wrong
  schemaVersion), `recordDailyResult` (round-trip / keep-first /
  quota-exceeded swallow / `wasNewRecord` flag), `currentStreak`
  (empty / today-only / N consecutive ending today / N consecutive
  ending yesterday / 2-day-old gap / trailing-run-only / month and
  year boundaries), `bestScore` (empty / max), `hasCompletedDate`.
- `tests/share.test.js` — 4 new tests for the streak suffix
  (daily+streak≥2 contains `Streak N`, streak=1 absent, omitted/0
  absent, random+streak absent).
- `tests/app.smoke.test.js` — `localStorage` stubbed in `beforeEach`;
  new test pre-seeds storage with two daily records and verifies the
  home screen shows "Streak", "Best", and the seeded high score.

#### Documentation
- `src/docs.md` (new) — noridoc covering domain core (game lifecycle,
  three-pool model, anagram rules, scoring, dictionary), the new
  storage layer's keep-first / derived-stats invariants, and the
  share-text contract.
- `src/components/docs.md` (new) — noridoc covering App.vue as the sole
  storage caller, the previous-best-snapshot ordering, the
  date-as-PRNG-seed-and-storage-key convention, and the props/events
  boundary.

#### Verified
- `npm test` — 128/128 passing (was 104; +19 storage + 4 share + 1
  smoke).
- `npm run build` — production bundle builds cleanly (CSS now 6.54 kB
  up from 5.78 kB; JS unchanged at ≈1.82 MB).
- `npm run dev` — boots; index.html, components, dictionary asset all
  served. HomeScreen now exposes `streak`, `best`, `completedToday`
  props.

## Open follow-ups (next commits)

- Performance: bundled JS is 1.8MB (mostly `wink-lemmatizer`); consider
  lazy-loading or pre-computing trivial inflections offline.
- A11y pass: keyboard navigation, focus rings, ARIA on tile rack;
  switch click handlers from `@mousedown.left.prevent` to `@click`
  (with `@mousedown.prevent` only for focus-suppression) so keyboard
  activation works.
- Sticky-claim or staged-array model so click-to-remove on duplicate
  leftmost letters un-highlights the clicked tile (not the rightmost).
- Truncate share grid for very long runs (Twitter 280-char limit) — not
  hit by typical games but possible.
- Local-midnight reset for the Daily Challenge (industry consensus over
  UTC). Currently UTC for parity with the existing puzzle seed; if we
  move puzzle ID to local, the streak storage key follows automatically.
- Past-scores list / 7-day calendar grid on the home screen.
- Streak protection / freeze tokens (cosmetic feature; YAGNI for now).
