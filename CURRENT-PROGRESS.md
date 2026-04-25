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

### `feat/initial-game` — Bundle slim-down via precomputed lemmas (this commit)

Pre-computes the trivial-inflection lemma table at dictionary-build
time and removes `wink-lemmatizer` from the runtime dependency tree.
Cuts the production JS bundle from 1.82 MB → 93 kB (95% reduction);
gzipped JS drops from 633 kB → 36 kB. Runtime semantics of
`isTrivialInflection` are preserved exactly.

#### Why
`wink-lemmatizer` (used at runtime only by
`src/trivialInflection.js`) transitively pulls in `wink-lexicon`,
which ships ~3 MB of WordNet/lexicon JSON — most of the 1.8 MB JS
bundle. The lookup data the game actually needs is small and finite,
so we precompute it offline.

#### New / changed
- `scripts/build-lemmas.js` (new) — maintainer-only script. Exports
  `buildLemmaIndex(words)` (pure helper) and a `main()` that reads
  `data/dictionary.json` and writes `data/lemmas.json`. Imports
  `wink-lemmatizer`; this is the **only** file that does. Wired up
  via `npm run build-lemmas`.
- `data/lemmas.json` (new, committed) — schema
  `{ lemmas: { word: [lemma1, lemma2?] } }`. ~55,500 entries,
  1.36 MB raw / 267 kB gzipped. Identity entries omitted; lemma list
  deduped; non-vocabulary lemmas filtered.
- `src/trivialInflection.js` — rewritten. Removed
  `import lem from 'wink-lemmatizer'`. New signature
  `isTrivialInflection(answer, root, lemmaIndex)`. `lemmaIndex`
  accepts either a `Map<string, string[]>` or a plain object. The
  `FORCE_NON_TRIVIAL` override list and trailing-`e` drop-e
  heuristic are preserved verbatim; the heuristic now checks
  `lemmas.includes(r.slice(0,-1))` instead of calling the lemmatizer.
- `src/dictionary.js` — `loadDictionary(json, lemmasJson?)` gained an
  optional second arg. The returned object now exposes
  `dict.lemmaIndex` (a `Map<string, string[]>`). When `lemmasJson` is
  omitted, `lemmaIndex` is empty (back-compat for tests).
- `src/anagramRules.js` — `canFormWord` threads `dict.lemmaIndex`
  into the `isTrivialInflection(word, w, dict.lemmaIndex)` call.
- `src/components/App.vue` — `ensureDictionary` now `Promise.all`s
  fetches of `data/dictionary.json` and `data/lemmas.json`, then
  `Promise.all`s the two `.json()` parses, then calls
  `loadDictionary(dictJson, lemmasJson)`.
- `package.json` — `wink-lemmatizer` moved from `dependencies` to
  `devDependencies`. New `npm run build-lemmas` script.

#### Tests added
- `tests/buildLemmas.test.js` (new) — 5 unit tests for
  `buildLemmaIndex`: maps inflected words → lemma when in vocab,
  maps simple plurals → singular, omits identity-only words, captures
  the over-stem case (`rated → rat`) so the trailing-`e` heuristic
  fires, omits entries whose only candidates are absent from the
  vocabulary.
- `tests/trivialInflection.test.js` — rewritten to thread a fixture
  lemma `Map` through every assertion. Same 12 spec-rule assertions
  still hold.
- `tests/anagramRules.test.js`, `tests/game.test.js`,
  `tests/app.smoke.test.js` — updated to also load
  `data/lemmas.json` and pass it through `loadDictionary`. The smoke
  test's `fetch` stub now discriminates by URL to return either
  dictionary or lemmas JSON.

#### Bundle impact
- **Before:** `dist/assets/index-*.js` 1,819 kB raw / 633 kB gzipped.
- **After:** `dist/assets/index-*.js` 93 kB raw / 36 kB gzipped (95%
  smaller). New `dist/assets/lemmas-*.json` 1,357 kB raw / 267 kB
  gzipped, lazy-fetched in parallel with the dictionary on first
  game start.
- **Total raw payload** (JS + dict + lemmas): 3,937 kB → 3,568 kB.
- **Gzipped payload:** 1,110 kB → 780 kB. Crucially, **initial JS**
  drops from 633 kB gzipped to 36 kB gzipped — first paint is now
  near-instant.
- **Build time:** 89 s → 0.6 s (147× faster, since wink-lexicon's
  massive JSON no longer needs to be transformed by Vite/Rollup).

#### Verified
- `npm test` — 132/132 passing (was 127; +5 buildLemmas).
- `npm run build` — production bundle builds in 0.6 s.
- `npm run build-lemmas` — regenerates `data/lemmas.json`
  deterministically from `data/dictionary.json` (offline).

### `feat/initial-game` — Keyboard / accessibility pass (this commit)

Closes the long-standing keyboard-reach gap on the rack and player-word
list. Before this commit the game was completely unplayable by keyboard
— tiles and word rows were `<span>` containers with
`@mousedown.left.prevent` handlers, which fire only on pointer events.
After this commit Tab + Enter/Space activates a tile, focus rings are
visible against the dark theme, screen readers announce tile/word
labels, and live regions announce submit results.

#### New / changed
- `src/components/GameScreen.vue`:
  - Rack tile `<span>`s and player-word `<div>`s are now
    `<button type="button">` elements with the same `.tile` /
    `.word-row` classes preserved so visuals are unchanged.
  - Each rack tile carries `aria-label="Tile {letter}"` (`…, claimed`
    when in `consumption.loose`). Each word row carries
    `aria-label="Word {word}, {N} letters"` (`…, claimed` when
    consumed). Inner per-letter decoration `<span>`s inside a word-row
    button are `aria-hidden="true"` so AT only reads the row's
    aria-label, not the chopped-up letters.
  - Staging logic moved from `@mousedown.left.prevent` to `@click`. A
    no-op `@mousedown.prevent` is kept on these buttons solely to
    suppress input blur on pointer click. Native button semantics now
    handle keyboard activation (Enter on keydown, Space on keyup).
  - New `inputRef` is bound on the typed `<input>`. After every
    typed-mutating handler (`onTileClick`, `onWordClick`, `onClear`)
    the input is programmatically refocused so keyboard users keep
    typing without a manual Tab back.
  - Live regions: `.feedback` carries `role="status" aria-atomic="true"`
    and is rendered **unconditionally** (with empty text when no
    submission has happened) so the live region exists in the DOM
    before its content changes — some screen readers miss
    announcements when the region is created simultaneously with its
    text. The score is left as a static `<span>` (no live region) so
    SR users get one announcement per submit (the feedback line),
    not two; they can navigate to the score on demand. `#timer` gets
    explicit `aria-live="off"` so per-second tick updates don't
    spam screen readers.
  - The typed `<input>` got an `id="word-input-field"` and a paired
    visually-hidden `<label for="word-input-field" class="sr-only">
    Type a word</label>` — replaces the placeholder-only a11y
    anti-pattern.
- `style.css`:
  - `button.tile, button.word-row { appearance: none; … }` reset so
    the new `<button>` form looks identical to the prior
    `<span>`/`<div>` form. `button.word-row` additionally gets
    background/border/color resets and `text-align: left` since
    `<button>` defaults differ from `<div>`.
  - `:focus-visible` rule covering `.tile`, `.word-row`, `.action-btn`,
    `.mode-btn`: `outline: 3px solid #b59f3b; outline-offset: 2px;`
    (#b59f3b vs `#121213` ≈ 5.4:1 contrast ratio, satisfying WCAG
    2.4.11). No focus ring on mouse-only clicks (browsers handle
    `:focus-visible` heuristics natively).
  - `.sr-only` clip-path utility class for the visually-hidden input
    label.
- No domain-module changes (`game.js`, `scoring.js`, `pool.js`,
  `staging.js`, `dictionary.js`, `anagramRules.js`, `share.js`,
  `storage.js`, `trivialInflection.js` are untouched).

#### Tests added / updated
- `tests/gameScreenInteraction.test.js`:
  - Existing 14 click-to-stage tests retargeted from `trigger('mousedown')`
    to `trigger('click')` (matching the new event wiring; user-visible
    behavior unchanged).
  - New `describe('GameScreen accessibility', …)` block, 9 tests:
    each rack tile is a `<button type="button">`; each tile has an
    aria-label naming its letter; each word row is a button; each row
    has an aria-label naming the word; the typed input has an
    associated label (visible / hidden / aria-label); the feedback box
    has `role="status"` after a submission; the score region has
    `role="status"`; the timer has `aria-live="off"`; clicking a tile
    leaves focus on the typed input element (`document.activeElement`
    invariant, mounted with `attachTo: document.body`).
- `tests/app.smoke.test.js`:
  - Existing tile-click smoke retargeted from `mousedown` to `click`.

#### Verified
- `npm test` — 141/141 passing (was 132; +9 new).
- `npm run build` — production bundle builds in 0.6 s, JS ≈ 94 kB raw
  / 36 kB gzipped (CSS now 6.97 kB, was 6.54 kB; +0.4 kB for the new
  rules).
- `npm run dev` — boots; Vite serves the new `aria-label`,
  `:focus-visible`, and `.sr-only` rules. End-to-end keyboard /
  screen-reader interaction not driven from CLI; tested at the
  component-DOM level by the test suite.

### `feat/initial-game` — 7-day calendar grid on home screen (this commit)

Surfaces the existing Daily Challenge persistence layer visually as a
horizontal 7-cell strip on the home screen. Cells run oldest-first
left-to-right, ending at today; filled cells = days played, hollow
cells = days missed, an accent outline ring marks today regardless of
played/unplayed state. Matches the de-facto pattern used by
Wordle/Duolingo/GitHub heatmaps. No domain-module changes; no storage
schema change.

#### New / changed
- `src/storage.js` — new exported pure helper
  `recentDays(records, todayDate, count = 7)` returning an oldest-first
  array of `{ date, played, record? }` entries ending at `todayDate`.
  Reuses the existing internal `shiftDate` UTC arithmetic. `record`
  (full underlying entry) is attached only when `played` is true,
  leaving the shape forward-compatible with future per-cell features.
- `src/components/HomeScreen.vue` — new optional `recent` prop
  (`Array`, default `[]`). Renders a `.home-calendar` strip below the
  existing `.home-stats` row when `(streak > 0 || best > 0) &&
  recent.length > 0`. Wrapped in `<div role="group" aria-label="Last
  7 days activity">`. Each cell is a presentational `<div
  class="home-calendar-cell">` (intentionally non-interactive — no
  focus, no click) carrying `.played` when the entry is played and
  `.today` on the rightmost cell. Per-cell `aria-label` and `title`
  follow GitHub's pattern: `Today, score N, Friday April 25`,
  `Today, not played yet, Friday April 25`, `Score N, Tuesday April
  22`, or `Not played, Monday April 21`. Day-letter labels above
  each cell come from `['S','M','T','W','T','F','S']` indexed by UTC
  weekday. Helpers `weekdayLetter`, `humanDate`, `cellLabel` all
  parse the date string via `Date.UTC` to keep weekday computation
  aligned with the storage-key UTC convention.
- `src/components/App.vue` — `computeStats()` now also derives
  `recent: recentDays(records, today, 7)`. Stats shape grew from
  `{ streak, best, completedToday }` to
  `{ streak, best, completedToday, recent }`. The `<HomeScreen … />`
  template line gained `:recent="stats.recent"`. Recompute timing is
  unchanged — same transitions (`returnHome`,
  `endGameWithResult`) refresh the calendar.
- `style.css` — new rules: `.home-calendar` (flex row, `gap: 6px`,
  `margin-top: 14px`, centered), `.home-calendar-day` (column flex),
  `.home-calendar-letter` (10 px gray uppercase, 1 px letter-spacing,
  color `#565758`), `.home-calendar-cell` (28×28 px, 2 px border
  `#3a3a3c`, 4 px radius, transparent fill), `.home-calendar-cell.played`
  (fill `#538d4e`, mirrors `.tile.used`), `.home-calendar-cell.today`
  (`outline: 2 px solid #b59f3b; outline-offset: 2 px` — same accent
  yellow used by `:focus-visible`). Mobile breakpoint
  (`@media (max-width: 480px)`) shrinks cells to 24×24 px.

#### Tests added
- `tests/storage.test.js` — 6 new `recentDays` unit tests: empty
  records returns 7 unplayed entries with the right oldest/newest
  dates; today-only attaches the record; mixed history marks the
  right indices; explicit `count` argument honored; month boundary;
  year boundary.
- `tests/homeScreen.test.js` (new file) — 6 component tests with
  Vue Test Utils + happy-dom: no calendar when `streak===0 &&
  best===0`; exactly 7 cells when history exists; only the rightmost
  cell carries `.today`; only `played: true` entries get `.played`;
  every cell has a non-empty `aria-label` whose content reflects
  today/played/unplayed state; the `.home-calendar` wrapper has
  `role="group"` and a non-empty `aria-label`.
- `tests/app.smoke.test.js` — extended the existing
  seeded-localStorage test to also assert `.home-calendar` exists
  and the rightmost `.home-calendar-cell` carries both `.today` and
  `.played` (today was seeded).

#### Verified
- `npm test` — 151/151 passing (was 139; +12 new + 1 extension).
- `npm run build` — production bundle builds cleanly in 0.6 s.
  CSS now 7.57 kB (was 6.97 kB; +0.6 kB for the new rules); JS
  unchanged at ≈95 kB raw / 36.9 kB gzipped.
- `npm run dev` — boots; serves the new `.home-calendar` markup and
  rules. Verified via the test suite at component-DOM level; full
  end-to-end manual click-through not run from CLI.

### `feat/initial-game` — `prefers-reduced-motion` honouring (this commit)

Closes the open follow-up "`prefers-reduced-motion` honouring on the
tile pop-in animation." Adds a single `@media (prefers-reduced-motion:
reduce)` block to `style.css` that neutralises the rack tile pop-in
keyframe, the `.tile.clickable:hover` translate, and all the short
transitions on tiles, word rows, action buttons, and mode buttons —
honouring WCAG 2.3.3 (Animation from Interactions, Level AAA;
sufficient technique W3C C39). Pure CSS commit; no JS, no Vue
templates, no domain modules, no new dependencies.

#### What changed
- `style.css` — appended a `@media (prefers-reduced-motion: reduce)`
  block at the end of the file. Two rules:
  1. A universal-selector reset (`*, *::before, *::after`) setting
     `animation-duration: 0.01ms !important`,
     `animation-iteration-count: 1 !important`, and
     `transition-duration: 0.01ms !important`. Using `0.01ms` (not
     `0` / `none`) preserves `animationend` / `transitionend` event
     firing for any future JS that might depend on them.
     `animation-iteration-count: 1 !important` is included even
     though we have no infinite animations today: an infinite
     animation reduced to `0.01ms` duration still loops on the event
     loop, so capping iterations is the canonical safety belt.
  2. A targeted `.tile.clickable:hover { transform: none; }` rule.
     Without this, the universal `transition-duration` reset alone
     would still let the element *snap* to `translateY(-1px)` on
     hover — visible 1 px jump. The targeted override removes the
     end state entirely.
- `tests/reducedMotion.test.js` (new) — 5 tests that read `style.css`
  as text and assert (a) the `@media (prefers-reduced-motion:
  reduce)` block exists; (b) inside it: `animation-duration: 0.01ms
  !important`, `animation-iteration-count: 1 !important`,
  `transition-duration: 0.01ms !important`; (c) inside it:
  `.tile.clickable:hover { … transform: none … }`. The block is
  isolated via brace-counting so the assertions only match content
  inside the media block. Headless DOMs (jsdom, happy-dom) do not
  evaluate `@media (prefers-reduced-motion)` against any system
  setting, so direct DOM-computed-style tests are not viable —
  text-inspection of the CSS file is the W3C / CSS-Tricks consensus
  pattern for plain CSS. (Verified independently by the
  knowledge-researcher subagent.)
- `src/components/docs.md` — extended the "Live-region policy in
  `GameScreen`" bullet's enumeration of what `style.css` hosts to
  include the new `prefers-reduced-motion` block, with the rationale
  (`0.01ms` vs `none`, hover-transform-none follow-up, keyframes
  preserved for users without the OS preference).

#### What did NOT change
- No JS files, no `.vue` templates.
- No domain modules.
- No `package.json`, no new dependencies.
- No keyframe rules deleted. The `@keyframes pop-in` definition
  remains; users without the OS preference still see the animation.
- No existing tests changed. Cascade order is preserved (the new
  block is appended after every existing rule).

#### Verified
- `npm test` — 154/154 passing (was 149; +5 new reducedMotion).
- `npm run build` — production bundle builds cleanly in 0.66 s.
  CSS now 7.80 kB (was 7.57 kB; +0.23 kB for the new block); JS
  unchanged at ≈95 kB raw / 36.86 kB gzipped.
- End-to-end OS-level reduced-motion behavior was not driven from
  CLI; it is verifiable in Chrome DevTools → Rendering → "Emulate
  CSS media feature `prefers-reduced-motion`."

#### Reviewer parity note
- An earlier draft of the block also included `scroll-behavior: auto
  !important`, recommended by web.dev. Dropped before commit because
  the codebase declares no `scroll-behavior: smooth` anywhere — the
  reset would be dead code. YAGNI.

## Open follow-ups (next commits)

- Sticky-claim or staged-array model so click-to-remove on duplicate
  leftmost letters un-highlights the clicked tile (not the rightmost).
- Truncate share grid for very long runs (Twitter 280-char limit) — not
  hit by typical games but possible.
- Local-midnight reset for the Daily Challenge (industry consensus over
  UTC). Currently UTC for parity with the existing puzzle seed; if we
  move puzzle ID to local, the streak storage key follows automatically.
- Score-tier color heatmap on calendar cells (currently boolean
  filled/hollow). Add only if play-tester feedback says scores are hard
  to interpret at a glance.
- Click-a-calendar-cell to open a per-day detail popup (longest word,
  duration, share-text replay). Currently cells are non-interactive —
  tooltip + screen-reader label is the only disclosure.
- Streak protection / freeze tokens (cosmetic feature; YAGNI for now).
- A11y polish round 2: keyboard activation tests in a real browser
  (Playwright) instead of happy-dom; live-region announcements verified
  against an actual screen reader; reduce score-region announcement
  cadence if play-tester feedback says it's chatty.
