# Research Notes — Anagrams

## Reference: `~/code/games/reword`

A Vue 3 + Vite + Vitest SPA. Hosted at `rewordgame.xyz`. Several modules are
directly portable:

- `src/prng.js` — `cyrb128` (string → 4×u32 hash) and `sfc32` (PRNG). Exports
  `getDailyRng(dateStr)`, `seededShuffle(arr, rng)`, `seededPick(arr, rng)`.
  We will copy this verbatim.
- `src/words.js` — `letterSignature(word)` returns sorted-letter string,
  `buildSignatureIndex(dictionary)` returns Map<sig, words[]>. Useful for
  efficient anagram lookup.
- `src/game.js` — `isProfane(word)` uses `bad-words` Filter; we'll reuse the
  same filter pattern. Generic share-text formatter we'll model ours on.
- `scripts/build-words.js` — downloads TWL06 (cviebrock GitHub mirror) and
  applies trivial-inflection filtering with `wink-lemmatizer`. Function
  `isTrivialInflection(answer, root)` is exactly the rule we need for the
  "trivial addition" anagram restriction. We will port that function with its
  `FORCE_NON_TRIVIAL` override list.

## Visual / branding

Dark palette identical to reword:

- bg `#121213`, text `#d7dadc`, borders `#3a3a3c`
- accents: `#565758`, `#818384`
- success `#538d4e`/`#6aaa64`, hint yellow `#b59f3b`, error `#e74c3c`
- font: `'Helvetica Neue', Arial, sans-serif`

Tile styles (52x52 dark squares with thick borders, animated):

- `.tile`, `.tile.empty`, `.tile.offered`, `.tile.used`, `.tile.highlighted`
- `.tile-rack` flex container

## Tile distribution (Bananagrams)

The Bananagrams game has 144 tiles with the following count per letter:

```
A 13, B 3,  C 3,  D 6,  E 18, F 3,  G 4,  H 3,  I 12,
J 2,  K 2,  L 5,  M 3,  N 8,  O 11, P 3,  Q 2,  R 9,
S 6,  T 9,  U 6,  V 3,  W 3,  X 2,  Y 3,  Z 2
```

Sum: 144. (Source: standard Bananagrams set.)

## Game rules summary

Single-player rounds. State has three pools per tile: face-down, face-up-loose,
face-up-in-word. Each round the player either:

1. Forms a word from face-up letters (and possibly consuming whole preexisting
   words on the table — must use **all** letters of any consumed word, and the
   new word must not be a trivial inflection of any consumed word).
2. Draws a tile from face-down (ends the round, reveals one new face-up-loose
   tile).

Word validity: length ≥ 3, in scrabble dictionary, not profane.

Game ends when face-down pool is empty and player attempts to draw.

## Scoring

- Reward long words: per-word score = length² (so 9-letter is 81 vs 9 for a
  3-letter, strongly favoring length over count).
- Penalize draws when valid loose-pool anagrams exist: when player chooses to
  draw, if a 3+ letter word can be formed from face-up loose letters alone,
  apply a fixed penalty of −10 per such missed draw.
- Final score = sum(word_score) − 10·missed_draws.

This satisfies the spec's twin objectives: long words rewarded heavily, drawing
when easy words exist on the board is penalized.

## Daily / Random modes

- Daily: seed = today's UTC date in `YYYY-MM-DD`, hashed with `cyrb128`. All
  144 tiles get a deterministic shuffle order. Every player who plays today
  sees the same flip sequence.
- Random: seed = `Math.random()` ⇒ random permutation per session.

## Architecture choices

- Tooling matches reword: Vite 7, Vue 3, Vitest with happy-dom, no TypeScript.
- Dictionary: bundle TWL06 as a JSON array via a `scripts/build-dict.js`
  script that mirrors reword's `build-words.js` download flow. App builds a
  `Set` for O(1) lookup at startup.
- Profanity filter: `bad-words` library at runtime (cheap; small set).
- Trivial-inflection: port `isTrivialInflection` from reword's
  `build-words.js`; uses `wink-lemmatizer`. Runs at runtime per-validation
  call (only invoked when consuming a preexisting word, and the word counts
  are tiny — fast enough).
- Anagram match: when player submits a typed word, enumerate the powerset of
  preexisting words on the board (≤ 10 typically ⇒ ≤ 1024 subsets) to find
  any subset whose union with some loose-letter subset exactly forms the
  typed word. Treat board state as multisets.

## UI flow

1. Home screen — pick Daily Challenge or Random Trial.
2. Game screen:
   - Initial: 3 tiles face-up at game start (per spec).
   - Header: title, mode label, timer, score.
   - Face-up loose tile rack.
   - Player's words list (each row a word; clicking marks for consumption).
   - Text input + Submit button (player types proposed word).
   - Draw Tile button.
   - End Game button (manual end before face-down empty? optional — keep for
     ergonomics).
3. Score screen — total time, final score, longest word + transformation
   chain (e.g. `fine → refine → redefine`), share button copying Wordle-style
   text.

## Open questions / decisions

- "Trivial addition" beyond inflections (e.g., re-arranging letters but not
  forming an "anagram" of preexisting word in a meaningful way): the spec
  example calls "Snub" a true anagram of "Nub" because the letters are
  rearranged. Our rule: not a trivial inflection per `isTrivialInflection`.
  The "Snub" case is OK because wink-lemmatizer does NOT lemmatize "snub" to
  "nub".
- Game ends: face-down empty AND player draws — chosen interpretation.
- Per-round time limit: none; player may take as long as they want. Total
  time tracked for the score screen.
- Share text format mirrors reword's compact style.

## Click-to-stage UX (v2 commit)

Researched click-to-stage interaction patterns for tile-based word games and
Vue 3 input-mutation idioms. Key findings:

- Production word games (Wordscapes, Anagram Magic Tour, snatch-it) lean on
  pure tap-to-stage. For a desktop-first Snatch clone, hybrid (typing + click
  shortcuts) is reasonable: mouse users get tactile clicks, fast typers keep
  the keyboard. Submission via Enter or Submit either way.
- For "stealing" a word: a single click on the entire word group should
  append all that word's letters at once. This matches snatch-it precedent
  and the spec's "use all letters of the consumed word" rule.
- Visual highlight rule of thumb: highlight a word group as `consumed` only
  when the typed input fully covers all of that word's letters (a legal
  steal). Partial highlight on word groups misleads. For loose tiles, claim
  leftmost-first per letter; partial highlighting on individual loose tiles
  is fine.
- Vue 3 input pitfalls: `v-model` on `<input>` + `typed.value += letter`
  works directly. `v-model.trim` has known cursor-jump issues with
  programmatic mutation — avoid. Use `@mousedown.prevent` on tile click
  handlers to prevent the input from blurring; this is the cleanest idiom
  and avoids a re-focus dance.
- Multiset / frequency-vector subtraction is canonical for "is this word
  claimable from rack + word groups." We already use this in
  `anagramRules.canFormWord` (full powerset enumeration). For visual
  highlighting (no dictionary/profanity/inflection checks needed), a greedy
  pass — try each existing word as a steal candidate, then claim leftmost
  loose tiles for the residue — is simpler and good enough since it is
  purely a UI hint, not validation.

Sources of truth diverge:
- `canFormWord` stays the authoritative submission validator.
- A new module `src/staging.js` provides `highlightConsumption(typed, pool)`
  for visual feedback only. Greedy, no dictionary check.

### Implementation summary

- New module `src/staging.js` exposing `highlightConsumption(typed, pool)`
  that returns `{ words: Set<idx>, loose: Set<idx> }` describing which
  sources are highlighted by the current input.
- `GameScreen.vue` adds click handlers on each face-up tile (`@mousedown.prevent`
  appends letter to typed input) and on each existing word row (appends the
  whole word). Computed `consumption` reactively computes highlight indices.
- CSS: `.tile.clickable` cursor + hover; `.tile.used` already exists for
  the highlight color; new `.word-row.consumed` class for whole-word steal
  hint.
- All existing submit logic stays the same — typed input remains the
  source of truth for `submitWord`.

## Wordle-style share grid (v3 commit)

Spec line 55-56 explicitly asks for a "wordle style" share. Current
`generateShareText` is plain text only, no emoji block. Researched
Wordle/Connections/Quordle conventions and Snatch precedent.

Findings:
- Header format convention: `<Game> <id> <score>` on one line. Wordle uses
  `Wordle 1,064 4/6`. We don't have puzzle numbers; use the date for daily
  (`Anagrams 2026-04-25 — 142`) and `Random` literal for random
  (`Anagrams Random — 50`).
- No URL footer (Wordle/Connections precedent).
- Body grid: variable-width rows are fine. Do NOT pad with `⬛` or spaces —
  rendering is inconsistent across iMessage / Discord / VS Code / Twitter
  due to non-monospace emoji widths.
- Snatch / anagram games have no established share format — we have
  latitude.
- Twitter limit 280 chars; emojis count as 2 UTF-16 code units. A 30-word
  game can exceed that. YAGNI: skip truncation in v3, revisit if it bites.
- Use U+1F7E9 (🟩) and U+1F7E8 (🟨) — render reliably as emoji without
  needing VS-16 variation selectors. Avoid `□`/`■`/colored boxes that need
  variation selectors.
- Green/yellow semantic inversion vs Wordle: in Wordle 🟨 is "wrong
  position." Here 🟨 will mean "letters carried over from a consumed
  parent word" (recycled) and 🟩 means "new letters added beyond the
  parent." This is a deliberate metaphor reuse: "yellow = recycled, green
  = new value." Researcher flagged the cognitive collision but it is
  defensible since the games are obviously different.

Format spec (v3):

```
Anagrams 2026-04-25 — 142

🟩🟩🟩🟩
🟨🟨🟨🟨🟩🟩
🟨🟨🟨🟨🟨🟨🟩🟩

Longest 8 · Time 5:00
```

Per row: `yellow = sum(parent.length for parent in parents)`,
`green = word.length - yellow`. The spec rule "must use all letters of
any consumed preexisting word" means sum(parent lengths) ≤ word.length
always — green count is non-negative.

Random mode header: `Anagrams Random — 50`.
Empty history: header + blank + footer (no rows). Existing tests
(date/score/longestLen/Random/no-date/determinism) continue to pass with
this format because they only assert substring presence.

API change: `generateShareText` gains a new `history` param
(`{word, parents}[]`). `ScoreScreen.vue` passes `result.history` (added to
`endGame` output, currently absent — `game.history` already exists, just
need to surface it through `endGame`'s return).

## Click-to-remove + Clear button (v4 commit)

Open follow-up from CURRENT-PROGRESS.md: "Click an already-`used` tile to
remove the matching letter from input (currently it just appends another
copy)." (Note: actual current behavior is no-op, not double-append — the
`onTileClick`/`onWordClick` handlers in `GameScreen.vue` early-return on
`consumption.loose.has(i)` / `consumption.words.has(i)`. The follow-up
itself stands: clicking a used tile should be reversible, not a no-op.)

### Findings

- **Production word games** (Words With Friends, Wordscapes) treat each
  rack tile as an identity-bearing object: clicking a staged tile removes
  *that tile's* contribution. Their staging model is an explicit array of
  tile references, not a typed string. Adopting that model is a much
  bigger refactor than a UX polish pass — out of scope for this commit.
- **In our multiset-claim model** ("typed string is source of truth;
  highlighting is computed by greedy multiset matching"), individual tile
  identity is lost: removing one occurrence of letter L from typed always
  causes the *rightmost-claimed* L tile to lose its highlight, regardless
  of which L tile the user clicked. With duplicates of a letter, this
  produces a minor visual artifact when the user clicks the leftmost
  duplicate (their click becomes "click leftmost L tile, but rightmost L
  tile un-highlights"). For non-duplicates the behavior is correct.
- **Positional position-mapping does not fix this.** The artifact stems
  from the recompute logic (greedy leftmost claim), not from the removal
  algorithm. Mapping `tileIdx → typedPos` and removing exactly that
  position produces an identical `typed` string to "remove first
  occurrence of letter L." Verified with both algorithms on
  `typed='OOA', loose=['o','x','o','a']`. Only a sticky-claim or explicit
  staged-array model would produce identity-preserving removal.
- **Decision**: ship the simple "click-used → remove first occurrence of
  that letter" + "click-consumed → remove all letters of that word
  (leftmost-first per letter)." Accept the duplicate-leftmost artifact
  as a known minor limitation. Backspace + Clear + click-rightmost-first
  all work around it.

### A11y considerations

- `@mousedown.prevent` blocks the input from blurring on click — keep as
  a focus-suppression event handler. But put the actual toggle logic on
  `@click` so keyboard activation (Enter / Space on a focused tile) also
  fires it. The current code uses `@mousedown.left.prevent="onTileClick(i)"`
  which fires only on pointer events; keyboard users currently can't
  interact via clicks at all.
- For this commit, scope is "make click reversible" — keyboard parity
  belongs in the broader a11y pass already on the open-follow-ups list.
  We will keep `@mousedown.left.prevent` as the trigger for symmetry with
  the current implementation but flag the gap.

### Clear button conventions

- Visible "Clear" text button beats inline × icon on accessibility +
  clarity grounds (Nielsen Norman, Scott O'Hara). Place adjacent to the
  input. Keyboard-accessible by default (`<button type="button">`).
- Disable when typed input is empty so the button has no surprise effect.

### Implementation summary

- `GameScreen.vue` rewrites `onTileClick` and `onWordClick`: if the
  clicked tile/word is already in `consumption.{loose,words}`, remove
  letters from typed (leftmost-first); else append (existing behavior).
- New `onClear()` resets typed to `''` and clears feedback. Bound to a
  new `<button class="action-btn" type="button">Clear</button>` next to
  the Submit button. Disabled while `typed === ''`.
- `removeFirstOccurrence(s, ch)` and `removeWordLetters(s, word)` are
  small string helpers — keep inline in `GameScreen.vue` (no need for
  a new module — they are not reused).
- `style.css`: tweak the form layout if needed so Clear sits between the
  input and Submit.
- Tests:
  - `tests/gameScreenInteraction.test.js`: rewrite the "does not append"
    test to "removes the letter"; add tests for word-row remove, Clear
    behavior, Clear disabled-when-empty.
  - No changes to `staging.test.js`, `app.smoke.test.js` (smoke tests are
    coarse — no need to repeat at the App boundary).
- No changes to `staging.js`, `anagramRules.js`, `game.js`, `scoring.js`,
  or any domain module. Pure UI change.

## Daily streak / best-score persistence (v5 commit)

Open follow-up: persistence (local-storage) for daily streak / past
scores. Researched Wordle / Connections / VueUse conventions and
localStorage pitfalls.

### Findings

- **Streak semantics**: in Wordle and NYT Connections the streak only
  *increments* on a finish whose previous-day record exists, but the
  displayed counter persists across the gap until the user finishes
  another puzzle (the "preserve-but-at-risk" pattern). If yesterday is
  also missing, the next finish recomputes from scratch (= 1). Sources:
  Tom's Guide "I lost my Wordle streak", GameRant "Wordle streak resets",
  TechRadar Connections rules.
- **Schema**: single JSON blob under one key (`anagrams:v1`). Per-day or
  per-field keys multiply quota overhead, fragment writes, and create
  migration headaches. Persist only `{ schemaVersion, records: { date:
  {score, longestWord, durationMs, completedAt} } }`. Streak and best
  are derived on load — never persist them, since stale derived state is
  the most common bug class.
- **Same-day re-finish**: keep the *first* completion (Wordle locks the
  result on first solve). Simpler than "keep best" and prevents the
  "play once for the streak, replay for the high score" exploit.
- **Pitfalls**: Safari Private Mode reports a 0-byte quota and throws
  `QuotaExceededError` on `setItem`; defensive try/catch is mandatory
  (Muffin Man blog, Michal Zalecki). Firefox ETP/Private wipes session
  storage but does not throw. SSR is N/A — Vite SPA, but a
  `typeof window !== 'undefined'` guard costs nothing.
- **Library choice**: VueUse's `useStorage` is sound but adds a
  dependency for one schema. A ~30-line module is preferable here. No
  new deps.
- **UTC vs local midnight**: industry consensus is local midnight, but
  the existing daily-puzzle seed in this repo already uses UTC
  (`App.vue#todayUTC`). For consistency between puzzle ID and streak
  key, *keep UTC for v5*. If a future commit moves the puzzle ID to
  local midnight, the streak key follows automatically. YAGNI on a
  separate locale-aware storage key.

### Decisions

1. New module `src/storage.js`. Pure functions over an injected
   storage shim (so tests can pass a `Map`-backed fake without touching
   `window.localStorage`):
   - `loadStore(storage)` → `{ records: {date: {...}}, schemaVersion }`,
     defaulting to empty on missing/corrupt/quota error.
   - `recordDailyResult(storage, { date, score, longestWord, durationMs })`
     → idempotent on re-call (keep-first per date). Returns `{ stored,
     wasNewRecord }`. Swallows write errors and returns `wasNewRecord:
     false` on failure (private mode degrades gracefully).
   - `currentStreak(records, todayDate)` → integer. Counts back from
     today (or yesterday if today missing) over consecutive UTC dates.
     Handles the empty case → 0. Pure date arithmetic on `YYYY-MM-DD`
     strings via `Date.UTC` parse + 86400000 step.
   - `bestScore(records)` → integer (max over records, 0 if empty).
   - `hasCompletedDate(records, date)` → bool.
2. Production binding: `src/storage.js` exports a `browserStorage()`
   helper that returns `window.localStorage` if available, else a
   no-op shim — so `App.vue` can pass `browserStorage()` once at top
   level and never branch.
3. UI surface:
   - `HomeScreen.vue` props gain `streak` and `best`. A new
     `<div class="home-stats">Streak <strong>{{streak}}</strong>
     · Best <strong>{{best}}</strong></div>` renders below the
     buttons when either is non-zero. The "Daily Challenge" button
     gets a small "✓ Played today" sub-label when today is complete.
   - `ScoreScreen.vue` adds two optional new props `streak` and
     `isNewBest` (computed by App). When mode === 'daily', shows a
     small badge row below the score-grid: "Streak <N>" and a
     "New best!" pill when applicable.
   - `share.js` appends ` · Streak <N>` to the footer when in daily
     mode and streak ≥ 2. Add a new `streak` field to the
     `generateShareText` API; null/0/1 → no streak suffix.
4. App.vue wiring: on entering 'home' screen and on entering 'score'
   screen, recompute `streak`/`best`/`completedToday` from `loadStore`.
   On entering 'score' screen for a daily game, call
   `recordDailyResult` with `{date, score, longestWord, durationMs}`
   *before* recomputing.

### Tests

- `tests/storage.test.js` (new): all pure-function tests, using a
  `Map`-backed fake storage shim:
  - `loadStore` returns empty on missing key / invalid JSON / wrong
    schema version.
  - `recordDailyResult` writes a record and is keep-first on re-call.
  - `recordDailyResult` swallows write errors (quota exceeded fake)
    and returns `wasNewRecord: false`.
  - `currentStreak` returns 0 for empty records.
  - `currentStreak` returns N for N consecutive days ending today.
  - `currentStreak` returns N for N consecutive days ending yesterday
     when today is missing (preserve-but-at-risk).
  - `currentStreak` returns 0 when most recent record is ≥ 2 days ago.
  - `bestScore` returns 0 for empty, max otherwise.
  - `hasCompletedDate` returns true/false correctly.
- `tests/share.test.js`: 2 new tests:
  - daily mode + streak=5 footer contains ` · Streak 5`.
  - random mode + streak=5 footer does NOT contain `Streak`.
  - daily mode + streak=1 footer does NOT contain `Streak` (only ≥ 2
    surfaces in share).
- `tests/app.smoke.test.js`: 1 new test asserting the home screen
  shows "Streak" + "Best" labels after a fake daily completion was
  pre-seeded into a stubbed `localStorage`.

### Out of scope (intentional)

- Past-scores list / calendar grid.
- Local-midnight reset (UTC keeps puzzle ID + streak in sync).
- Streak protection / freeze tokens.
- Cross-tab sync via `storage` event (single-player, single-tab
  expected use).
- LongestWord-best tracking — just score for v5; longest can be added
  in a future polish pass.

## Bundle slim-down: precomputed lemmas (v6 commit)

Open follow-up #1 from CURRENT-PROGRESS.md: production JS bundle is
1.82 MB (633 kB gzipped). Profiling root cause: `wink-lemmatizer`
transitively pulls `wink-lexicon` (13 MB on disk; ships ~3 MB of WordNet
sense indices and exception lists into the bundle). Used only by
`src/trivialInflection.js`, which is only called when the player
submits a word that consumes a parent word.

### Findings (nori-knowledge-researcher + spot inspection)

- **Compresses well**: a `{word: [lemma]}` map for ~178k TWL06 words
  packs to roughly 8-15% of raw size after gzip; expected payload
  ~150-400 kB raw → ~30-60 kB gzipped if we drop identity entries.
  Massively cheaper than the 633 kB lemmatizer mass currently shipped.
- **JSON.parse cost**: at this size, parse is <50 ms on midrange
  mobile. Same hot-path as `dictionary.json`; load both in
  `Promise.all`.
- **Memory residency**: ~10-20 MB resident for a 178k Map. Trim by
  omitting identity (`lemma === word`) entries and lemmas not present
  in TWL06.
- **wink-lemmatizer behavior**: `verb`/`noun`/`adjective` each return
  the *input unchanged* when no rule fires. Build-time emitter must
  drop these — present-but-equal entries waste bytes.
- **Adjective lemmatizer false-positives**: many short 3-letter words
  get spurious adjective lemmas (root cause of the existing
  `FORCE_NON_TRIVIAL` overrides). Decision: keep the override list at
  runtime (not build time) so we can update overrides without
  regenerating `lemmas.json`. Slight runtime cost (a Set lookup) is
  trivial.
- **Trailing-`e` heuristic** stays at runtime in
  `trivialInflection.js`. Reason: the heuristic checks
  `r.endsWith('e') && (a.startsWith(r) || a === dropE+'ing')` where
  `r` is the parent word (only known at submit time). At lookup we
  ask: is `r.slice(0,-1) ∈ lemmasOf(a)`? Same lookup table — no
  separate "trailing-e" data.
- **Single file vs. separate**: emit `data/lemmas.json` as a separate
  asset. Reasons: (a) keeps cache lifetimes independent;
  (b) lemma changes diff cleanly in git; (c) Vite handles separate
  JSON assets identically to dictionary.json (asset-hash naming,
  HTTP/2 multiplex). Extending dictionary.json would couple their
  invalidation.
- **Build-dict is a maintainer step**: `npm run build-dict` is
  separate from `npm run build` (see package.json). `data/lemmas.json`
  gets committed alongside `data/dictionary.json`. CI does not need
  `wink-lemmatizer` to build.
- **Move `wink-lemmatizer` → devDependencies**: only `build-dict.js`
  imports it. After the refactor, no runtime module imports it. Vite
  tree-shake will exclude it from the production bundle.

### Decisions

1. **Schema**: `data/lemmas.json` = `{ "word": ["lemma1", "lemma2?"] }`
   only when at least one of `verb(w)`/`noun(w)`/`adjective(w)` differs
   from `w` itself. Lemma list is the deduped union of those three
   minus `w`. Words with no non-self lemma are omitted (absent key
   means "no lemma relationship").
2. **Filter to TWL06 membership**: only emit entries where the word
   itself is in TWL06 (already the case — input is the post-profanity
   list). Lemmas may or may not be in TWL06; we keep them anyway since
   the runtime check is `lemmas.includes(parentWord)` and `parentWord`
   came from the on-table `words` (which are TWL06-validated). If a
   lemma is non-TWL it just won't ever match — wasted bytes but
   correct behavior. Cheap to filter though, so we will: drop lemmas
   not in the TWL06 set.
3. **Runtime API**: `isTrivialInflection(answer, root, lemmaIndex)`
   becomes a pure 3-arg function. `lemmaIndex` is a `Map<string,
   string[]>` (or any object with `.get(word)` returning lemmas).
   Tests pass a fixture index. Production threads through `dict`.
4. **Dictionary loader change**: `loadDictionary(json, lemmasJson?)`
   gains an optional second argument and exposes `dict.lemmaIndex`
   (Map). When omitted, `lemmaIndex` is empty (back-compat for tests
   that don't care about lemmas).
5. **anagramRules**: `canFormWord` already gets `dict`. Replace
   `isTrivialInflection(word, w)` with
   `isTrivialInflection(word, w, dict.lemmaIndex)`.
6. **App.vue**: load both JSONs in parallel (`Promise.all`), pass
   both to `loadDictionary`.
7. **Override list (`FORCE_NON_TRIVIAL`)** stays in
   `src/trivialInflection.js` runtime. Cheap, low-churn,
   independently editable.

### Tests

- `tests/trivialInflection.test.js`: thread a fixture lemma index
  through every assertion. Fixture covers every word the existing
  tests touch: `nubs→[nub]`, `books→[book]`, `cats→[cat]`,
  `walked→[walk]`, `walking→[walk]`, `rated→[rat]`. The "true
  anagram" cases (`snub`, `brook`, `refine`, `redefine`) get *no*
  entry — i.e., absent from the lemma index → not trivial. Identity
  case (`cat→cat`) is excluded by the `a === r` short-circuit.
- `tests/dictionary.test.js`: add a test that `loadDictionary(json,
  lemmasJson)` exposes `dict.lemmaIndex` and that `lemmaIndex.get(w)`
  returns the array.
- `tests/anagramRules.test.js`: existing tests already exercise the
  trivial-inflection failure mode; update fixture dict to include a
  lemma index so the path still triggers.
- New: `tests/buildDict.test.js` — small unit test for the
  build-time helper that constructs the lemma index from a tiny word
  list (so we don't ship `wink-lemmatizer` use only via a script).
  Refactor `scripts/build-dict.js` to expose a pure
  `buildLemmaIndex(words)` helper that the test imports.

### Out of scope (intentional)

- Snapshot-test / parity-test of the full TWL06 lemma map. The
  unit-tested `buildLemmaIndex` plus the existing
  trivialInflection tests provide adequate coverage; a full-corpus
  snapshot bloats the repo with no signal-to-noise gain.
- Bundle-size CI threshold. Manual verification of bundle drop is
  documented in CURRENT-PROGRESS.md; future-us can add a guard if
  regressions appear.
- Moving `FORCE_NON_TRIVIAL` to build time. Negligible runtime cost,
  better git diffability at runtime.

## Accessibility / keyboard pass (v7 commit)

Open follow-up #1 from CURRENT-PROGRESS.md: keyboard navigation,
focus rings, ARIA on tile rack; switch click handlers from
`@mousedown.left.prevent` to a separation that makes keyboard
activation work. Current state: `GameScreen.vue` uses
`@mousedown.left.prevent="onTileClick(i)"` on `<span>` tiles and
word rows. This fires only on pointer events — keyboard users
cannot tab to tiles, cannot fire Enter / Space, see no focus ring,
and AT sees opaque `<span>` elements with no role.

### Findings (research summary)

- **Native `<button>` over `role="button" tabindex="0"`** (MDN /
  WAI-ARIA APG). Native button gets focus, keyboard activation
  (Enter on keydown, Space on keyup), role and disabled state for
  free. CSS reset cost is trivial; manual keydown handlers are
  error-prone (Space-scrolls-page, key-repeat handling, focus
  state).
- **`@mousedown.prevent` is the standard pattern** to suppress
  focus transfer on pointer click while keeping `@click` firing.
  Keyboard activation routes through Tab + Enter/Space → native
  `<button>` synthesises a click. After keyboard activation,
  programmatically refocus the typed `<input>` so the player can
  keep typing.
- **Live regions**: `role="status" aria-atomic="true"` on the
  feedback box (so "Played 'word'" / "Not in dictionary" announces
  politely as one unit). Score may also be `role="status"` — submits
  are infrequent and user-initiated, so chatty risk is low. Timer
  must be `aria-live="off"` (per-second updates would spam every
  screen reader).
- **Input labelling**: bare `<input>` with placeholder is an a11y
  anti-pattern. Use a visually-hidden `<label for=...>` with the
  standard sr-only utility class. `aria-label` is acceptable but
  visible/hidden label is more robust on mobile and translation.
- **Focus ring on dark theme**: WCAG 2.4.11 needs ≥3:1 contrast.
  Browser default rings disappear against `#121213`. Use
  `:focus-visible` (Baseline 2022, no polyfill needed) with a
  bright outline (e.g. `outline: 3px solid #b59f3b` —
  `#b59f3b` vs `#121213` ≈ 5.4:1 ✓) and `outline-offset: 2px` so
  the ring sits outside tile borders.
- **Vue 3 keyboard**: `.enter` and `.space` modifiers map to
  `KeyboardEvent.key` values `'Enter'` / `' '`. Modern browsers
  no longer emit legacy `'Spacebar'`, so the modifiers are safe.
  But since we are switching to native `<button>`, we don't need
  any keydown handlers — the browser handles activation.
- **Vue Test Utils gotcha**: `wrapper.trigger('keydown.enter')` on
  a `<button>` does NOT synthesise a `click` in happy-dom. So
  keyboard-activation tests should `trigger('keydown', { key:
  'Enter' })` AND independently `trigger('click')` — or, more
  robustly, just assert that the button is keyboard-reachable
  (has `type="button"`, is not `aria-hidden`, is not
  `disabled`) and rely on native browser semantics for the
  activation itself. We will go with the second pattern: assert
  structural accessibility (role, tabindex/native-button, accessible
  name) and assert click-fires-handler. End-to-end keyboard is
  better verified in a real browser than in happy-dom.

### Decisions

1. **Convert tile and word-row spans → `<button type="button">`**
   in `GameScreen.vue`. Keep their visual styling (`.tile` /
   `.word-row` classes) so look-and-feel is unchanged. Add a
   `.tile.button-reset` (or simply target `button.tile`) CSS rule
   to neutralise native button styling (`appearance: none;
   background: inherit; padding: 0; font: inherit; color: inherit;
   border: …` already covered by `.tile`).
2. **Keep `@mousedown.prevent` on `mousedown`** to suppress input
   blur on pointer clicks. Move the staging logic to `@click` so
   keyboard Enter/Space (which native buttons fire as click) also
   triggers it.
3. **Refocus the typed `<input>` after a successful tile/word
   click** so keyboard users can keep typing without a manual Tab
   back. Add a `ref` on the input; call `inputRef.value?.focus()`
   in `onTileClick` and `onWordClick` (and on `onClear`).
4. **Accessible names**: each tile button gets `aria-label="Tile
   {letter}"` (or `… (claimed)` when in `consumption.loose`). Each
   word row button gets `aria-label="Word {word}, {N} letters"` (or
   `… (claimed)` when in `consumption.words`). The submit button
   keeps its "Submit" text label; the input gets a visually-hidden
   `<label for="word-input-field">Type a word</label>`.
5. **Live regions**:
   - `<div class="feedback" role="status" aria-atomic="true">`,
     rendered **unconditionally** (empty text when no submission has
     happened). Reason: some AT (JAWS, older VoiceOver) miss
     announcements when the live region is created at the same time
     as its content. Region-exists-first-then-content-changes is the
     reliable pattern. The empty state is styled to take no visual
     space via a `.feedback.feedback-empty` class.
   - `.score` is **not** a live region. With both `.feedback` and
     `.score` as `role="status"`, every successful submit triggers
     two competing announcements (the message + the score change).
     Drop the `.score` live region; SR users navigate to it on
     demand. The score change is implicit in the feedback text the
     user just heard.
   - `<span id="timer" aria-live="off">…</span>` to be explicit
     (default for non-region elements is also off, but explicit
     beats implicit here).
6. **Focus ring CSS**: add a `:focus-visible` rule for tiles, word
   rows, and existing `.action-btn` / `.mode-btn`. Use the existing
   `#b59f3b` (Wordle-yellow accent already in palette) for
   visibility on dark background.
7. **No domain-module changes**. Pure UI / template / CSS pass.
8. **Update existing `gameScreenInteraction.test.js` tests** that
   currently `trigger('mousedown')` to `trigger('click')`.
   `mousedown.prevent` no longer fires the staging logic — `click`
   does. Same observable behavior for users (mouse click still
   fires both events in sequence in real browsers); tests have to
   match the new wiring.

### Tests (new + updated)

- Update existing `tests/gameScreenInteraction.test.js` (14 tests)
  to use `trigger('click')` in place of `trigger('mousedown')`. No
  behavioral change for users; just matches new event wiring.
- Add to `tests/gameScreenInteraction.test.js` (a11y assertions):
  - face-up tile is rendered as a `<button type="button">`;
  - face-up tile carries an `aria-label` like `Tile c` (or `Tile c
    (claimed)` when in consumption);
  - word-row is rendered as a `<button>` with an `aria-label` like
    `Word rook` (or `Word rook (claimed)`);
  - typed input has an associated label (`<label for=…>` or
    `aria-label`);
  - feedback box has `role="status"`;
  - score span has `role="status"`;
  - timer has `aria-live="off"`;
  - clicking a tile refocuses the typed input (assert
    `document.activeElement === input.element`).
- Add to `tests/app.smoke.test.js`: smoke that the page has a
  visually-hidden label for the input AND that pressing the
  rendered tile button (via `click`) appends a letter to the input,
  end-to-end.

### Out of scope (intentional)

- Sticky-claim / staged-array model for duplicate-leftmost
  highlight artifact (open follow-up #2; this commit only restores
  keyboard reach).
- Reduced-motion media query honouring on the pop-in animation —
  cheap to add but a separate concern.
- High-contrast media query — palette is already high-contrast on
  dark.
- Live focus management on Submit success / Draw button enable
  changes (not needed for the rack-keyboard primary fix).

## 7-day calendar grid on home screen (v8 commit)

Open follow-up: "Past-scores list / 7-day calendar grid on the home
screen." The streak/best persistence layer (v5) already records
per-date entries in `localStorage`. This commit surfaces that data
visually as a 7-cell horizontal strip on the home screen so players
see their recent activity at a glance, matching the de-facto pattern
used by daily-puzzle games.

### Findings (knowledge-researcher summary)

- **Layout**: horizontal 7-cell strip is the dominant pattern across
  Wordle clones, Duolingo's streak widget, GitHub's contribution
  graph, etc. Most-recent day on the right (today). Day letter
  (M/T/W/T/F/S/S) above each cell. Vertical or grid layouts only
  appear on dedicated stats screens, not home surfaces.
- **Cell state**: filled vs. hollow is sufficient for boolean
  played/missed; multi-tier color heatmaps (GitHub/Apple style) add
  signal but require defining score buckets. **YAGNI for this
  commit** — start with boolean fill; add tiering later only if
  player feedback says scores are hard to interpret.
- **Today**: distinct outline/accent ring, plus the same fill state
  the other days use (today played → filled-with-ring; today not
  yet played → hollow-with-ring). Don't change the fill semantics
  for "today" — readers should still parse played/unplayed at a
  glance.
- **Missed days**: hollow outline or low-opacity gray. **Avoid red**
  — reads as "wrong" rather than "skipped".
- **No score-in-cell text**: cells are 24-32 px on mobile, too
  small for legible numbers. Use `title` (tooltip) and `aria-label`
  (screen reader) to expose the score on demand.
- **Mobile**: keep all 7 days; shrink cells to 24 px rather than
  truncating count. 7×24 px + 6 gaps fits any 320 px viewport.
- **A11y**: GitHub's contribution graph is the gold standard.
  Wrap the strip in a labeled landmark (`role="group"
  aria-label="Last 7 days activity"`). Each cell carries a
  descriptive `aria-label` like `"Score 142, Tuesday April 22"`,
  `"Not played, Monday April 21"`, or `"Today, score 142, Friday
  April 25"`. The whole `<table>` row/column-header pattern is
  overkill for a 7-cell strip.

### Decisions

1. **New pure helper in `src/storage.js`**: `recentDays(records,
   todayDate, count = 7)`. Returns an array of `{ date, played,
   record? }` entries, oldest first, ending at `todayDate`. Pure
   over `records` and the date string — no storage access. Reuses
   the existing `shiftDate` UTC arithmetic for date traversal.
   `record` is the underlying entry (`{score, longestWord,
   durationMs, completedAt}`) when `played === true`; absent
   otherwise. Returning the raw record (rather than just `score`)
   keeps the API forward-compatible with future cell features
   (longest-word tooltip, time, etc.).

2. **App.vue wiring**: extend `computeStats()` to also derive
   `recent` (the 7-day window). Stats shape grows from `{ streak,
   best, completedToday }` to `{ streak, best, completedToday,
   recent }`. `recent` is recomputed on the same transitions
   (`returnHome`, `endGameWithResult`) so a freshly-recorded daily
   shows up immediately when navigating back.

3. **HomeScreen.vue**: new `recent` prop (`Array`, default `[]`).
   Renders a `.home-calendar` strip *below* the `.home-stats` row
   (and gated by the same "any non-zero history" condition — i.e.,
   render only when `streak > 0 || best > 0`). Each cell renders:
   - Day-letter label above (`['S','M','T','W','T','F','S']`
     keyed by UTC weekday).
   - The cell itself: `<div>` (not a button — these aren't
     interactive in v8; tooltip is enough). Has classes:
     `.home-calendar-cell`, `.played` (when played), `.today`
     (when matches today's date).
   - `aria-label` matching the GitHub pattern: `"Today, score
     {N}, {weekday} {month} {day}"`, `"Score {N}, {weekday}
     {month} {day}"`, or `"Not played, {weekday} {month} {day}"`.
   - `title` attribute (tooltip on hover) with the same text.

4. **Styling** in `style.css`:
   - `.home-calendar` — flex row, `gap: 6px`, `justify-content:
     center`, `margin-top: 14px`. Each unit is a `<div
     class="home-calendar-day">` containing the letter label
     above the cell.
   - `.home-calendar-letter` — small (10 px), `#565758`, uppercase,
     letter-spacing 1 px.
   - `.home-calendar-cell` — 28 px square, `border: 2px solid
     #3a3a3c`, `border-radius: 4px`, transparent fill.
   - `.home-calendar-cell.played` — fill `#538d4e`, border same.
     Mirrors the existing `.tile.used` palette for consistency.
   - `.home-calendar-cell.today` — `outline: 2px solid #b59f3b;
     outline-offset: 2px`. Same accent yellow used elsewhere for
     focus rings; visually distinct without changing fill.
   - Mobile breakpoint (`@media (max-width: 480px)`): cells
     shrink to 24 px.

5. **No new dependency**. The whole feature is a pure helper plus
   a presentational component slice. Date arithmetic reuses
   `shiftDate` (already in `src/storage.js`). Weekday letter is
   derived via `new Date(Date.UTC(...)).getUTCDay()`.

6. **No interactive cell**. Each cell is a `<div>` with `title`
   and `aria-label`. Clicking does nothing. (Future commit could
   open a per-day detail popup; out of scope here.)

7. **Empty / first-time players**: when `streak === 0 && best === 0`,
   neither the stats row nor the calendar strip renders. Same
   "clean for new players" gating as the existing stats row.

### Tests

- `tests/storage.test.js` (extend): new `describe('recentDays', …)`:
  - returns an empty array of length `count` when records is empty
    (each entry `{date, played: false}`)
  - returns 7 entries by default, ending at `todayDate`, oldest
    first
  - marks played correctly for partial history (mix of played and
    missed days)
  - includes the underlying `record` object when played
  - handles month and year boundaries correctly (analogous to the
    existing `currentStreak` boundary test)
  - respects an explicit `count` argument (e.g., `count: 14`
    returns 14 entries)
- `tests/homeScreen.test.js` (new — there isn't a HomeScreen unit
  test file yet):
  - renders the 7-day strip when `streak > 0` or `best > 0`
  - does NOT render the strip when both are 0
  - each cell receives an `aria-label` describing its state
    (Today / played / not played)
  - the rightmost cell has the `.today` class
  - cells whose `recent[i].played` is true have the `.played`
    class
- `tests/app.smoke.test.js` (extend): the existing "shows Streak
  and Best on the home screen when prior daily records exist" test
  also asserts that the calendar strip is in the DOM and that the
  rightmost cell has class `today`.

### Out of scope (intentional)

- Score-tier color heatmap on cells. YAGNI until we have data on
  whether players want it.
- Click-a-cell-to-see-details popup or score-row history list.
  Tooltip + screen reader label is sufficient v8 disclosure.
- Showing future days. The strip is strictly the 7 days ending at
  today; the calendar metaphor is "recent activity," not "weekly
  agenda."
- Streak protection / freeze tokens, longest-word "best",
  past-month grid view. All deferred.

## Per-day detail popover on calendar cell click (v10 commit)

Open follow-up from CURRENT-PROGRESS.md: "Click-a-calendar-cell to open a per-day detail popup (longest word, duration, share-text replay). Currently cells are non-interactive — tooltip + screen-reader label is the only disclosure."

The streak/best persistence layer (v5) records full per-day entries
(`{score, longestWord, durationMs, completedAt}`) and the v8 calendar
strip displays *only* the `played` boolean. This commit makes played
cells clickable and shows the rich underlying data on demand.

### Findings (knowledge-researcher summary)

- **ARIA pattern**: `role="dialog"` + `aria-modal="false"` is the
  de-facto convention for a non-modal popover that contains
  selectable text. `role="region"` is too weak (no implicit
  interactive semantics); `role="tooltip"` implies hover-only and
  no interactive content. Trigger: `aria-haspopup="dialog"`,
  `aria-expanded="true|false"`, `aria-controls="<panel-id>"`.
  Panel: `aria-labelledby` pointing at a heading inside.
- **Keyboard**: Escape closes; focus must return to the originating
  trigger button. Tab can leave (non-modal — no focus trap).
  Click-outside dismisses.
- **Native HTML `popover` attribute** (Baseline 2024) is tempting
  for the free Escape + light-dismiss + invoker focus return —
  BUT happy-dom's `showPopover()` support is incomplete, light-
  dismiss does not fire in tests, and reka-ui devs explicitly
  switch to jsdom for popover tests. Verdict: roll our own. The
  same `role="dialog"` markup remains valid if a future commit
  swaps in `popover="auto"`.
- **CSS anchor positioning** (`anchor-name` / `position-anchor`)
  is NOT Baseline yet (Firefox 145 still behind a flag late
  2025). Skip. For 7 cells in one row, JS-computed
  `getBoundingClientRect()` + `position: fixed` with a 1-line
  viewport-edge clamp is ~10 lines and fully sufficient.
- **No new dependency**: VueUse's `onClickOutside` is sound but
  adds a dep for ~15 lines of code. A small composable
  `useDismissable(panelRef, triggerRef, onDismiss)` handles
  Escape + outside-mousedown + colocates the close logic.
  Use `mousedown` (not `click`) so dismiss happens before any
  inside-target absorbs the click. Use `event.composedPath()` so
  the trigger button itself doesn't double-toggle.
- **Testing in happy-dom**: `wrapper.trigger('mousedown')` is on
  the element, not document — to test outside-click, must
  manually `document.dispatchEvent(new MouseEvent('mousedown', {
  bubbles: true, composed: true }))`. `document.activeElement`
  invariant requires `attachTo: document.body` on mount.

### Decisions

1. **Cells become buttons when played, stay `<div>`s when not**.
   `HomeScreen.vue`'s calendar cell renders as
   `<button type="button" class="home-calendar-cell played
   today?" aria-haspopup="dialog" aria-expanded :aria-controls>`
   when `entry.played`. Otherwise stays as the existing
   `<div role="img" aria-label>`. Unplayed cells have nothing
   to show — no need to expose them as interactive controls.
2. **Single popover at the HomeScreen level** (not one per
   cell). State: `selectedIndex` ref. Click on cell N sets
   `selectedIndex = N`; click again on the same cell, click
   outside, Escape, or the close button sets `selectedIndex
   = null`.
3. **Popover positioning**: on cell click, capture
   `event.currentTarget.getBoundingClientRect()` and store
   `{ top, left, width }`. Render the popover with `position:
   fixed` anchored below the cell:
   `top = rect.bottom + 8; left = clamp(rect.left + rect.width/2
   - panelW/2, 8, viewportW - panelW - 8)`. Panel width fixed
   at ~220 px so we can clamp predictably.
4. **Popover content** (purely from `entry.record`):
   - `<h3 id="day-popover-title">{date heading}</h3>` —
     human date (`Tuesday, April 22`).
   - Score (large).
   - Longest word, length annotation.
   - Duration (mm:ss).
   - Close button (X icon, `aria-label="Close"`).
   No share-text replay in v10. The history transformation chain
   is not stored — only the longest word string. Replay would
   require migrating the storage schema; out of scope per YAGNI.
5. **Composable `useDismissable` lives inline in
   `HomeScreen.vue`** as a `function setup` helper. It is not
   reused elsewhere in the codebase; promotion to a dedicated
   `composables/` module is YAGNI.
6. **Focus management**: When `selectedIndex` becomes non-null,
   move focus to the panel root (`tabindex="-1"` so it is
   programmatically focusable but not in the tab order). When
   it becomes null, return focus to the triggering cell button.
7. **Mobile**: same fixed-position popover. The 24 px cell on
   mobile yields enough anchor space; the panel wraps within
   viewport via the clamp logic.
8. **No domain-module changes**. `storage.js`, `share.js`,
   `game.js`, and the GameScreen tree are untouched.

### Tests

- `tests/homeScreen.test.js` (extend):
  - **No popover by default** — initial mount with played
    history shows no `[role="dialog"]` element.
  - **Played cell is a `<button>` with proper ARIA** — assert
    `aria-haspopup="dialog"`, `aria-expanded="false"` initially,
    has an `aria-controls` attribute.
  - **Unplayed cell is NOT a button** — stays as a `<div>` (no
    interaction surface).
  - **Click on played cell opens popover** — after
    `cell.trigger('click')`, a `[role="dialog"]` element exists
    in the DOM and contains the day's score, longest word, and
    duration text.
  - **Trigger's `aria-expanded` flips to `true`** when popover
    opens, back to `false` when closed.
  - **Click on close button closes the popover** —
    `[role="dialog"]` is gone after `closeButton.trigger('click')`.
  - **Escape key closes the popover** — keydown Escape on the
    panel dismisses.
  - **Outside-click closes the popover** — manual
    `document.dispatchEvent(new MouseEvent('mousedown', {bubbles:
    true, composed: true}))` dismisses.
  - **Focus returns to the trigger after close** — assert
    `document.activeElement === triggerCell` after Escape (with
    `attachTo: document.body`).
  - **Popover content shows formatted date, score, longest word,
    duration mm:ss** — assertions on the panel's text content.
  - **Clicking a different played cell switches the popover to
    that cell's data** — re-trigger on cell B, panel content
    updates to B's entry.
- No changes to `app.smoke.test.js` (smoke is coarse, popover
  state is well-covered at the component test level).
- No changes to `storage.test.js` (schema unchanged).

### Out of scope (intentional)

- Share-text replay from a past day. The `history`
  transformation chain is not in storage; would require a
  schema migration. Defer.
- Hover-to-preview popover. Click-only is fine for v10;
  hover would require interaction-vs-intent timeout
  bookkeeping (industry consensus: 100-300 ms delay on hover-
  show, click-to-pin pattern).
- Popover positioning via CSS anchor positioning. Not Baseline
  yet.
- Native HTML `popover` attribute. Test compatibility friction
  is not worth the dep-savings — we already roll the dismiss
  logic by hand.
- Animation on open/close. The existing `prefers-reduced-motion`
  reset would require special-casing if we added one. YAGNI.

## prefers-reduced-motion honouring (v9 commit)

Open follow-up from CURRENT-PROGRESS.md: "`prefers-reduced-motion`
honouring on the tile pop-in animation." Continues the v7 a11y track:
v7 covered keyboard reach + ARIA + focus rings; this commit covers
WCAG 2.3.3 (Animation from Interactions, Level AAA — the official
sufficient technique is W3C C39, "Using the CSS prefers-reduced-motion
query to prevent motion").

### Findings (knowledge-researcher summary)

- **WCAG mapping**: 2.3.3 is **AAA**, not AA, and applies to non-
  essential **motion** animations (transforms creating apparent
  motion: scale/translate/rotate/parallax). 2.2.2 Pause/Stop/Hide
  (Level A) targets long-running >5 s motion and is irrelevant to a
  0.18 s tile pop-in.
- **Heavy hammer vs targeted**: 2024-2026 consensus is *both*. Apply
  the canonical reset block as a global safety net (catches new
  rules added later, third-party CSS, etc.) AND add targeted
  overrides for `transform`-on-hover rules where the transition kill
  alone is insufficient — without `transform: none`, the element
  *still* jumps to the new transform, only without the animation.
- **Use `0.01ms`, not `0` or `none`** so `transitionend` /
  `animationend` events still fire for any JS that might depend on
  them. This is the well-known reason the canonical block uses
  near-zero rather than disabling outright. We have no JS animation
  callbacks today, but futureproofing is free here.
- **Keep `animation-iteration-count: 1 !important`** in the block.
  An infinite animation reduced to 0.01 ms duration *still loops*
  on the event loop, causing CPU spin and event flooding. Capping
  iterations at 1 prevents this. Keep it even though we have no
  infinite animations today.
- **Preserve color/background/opacity transitions** in spirit — the
  W3C definition of "motion animation" excludes these. But because
  our codebase uses `transition: all 0.15s ease` shorthand on
  `.action-btn` and `.mode-btn` (which include transforms via
  hover), we cannot cleanly separate motion from non-motion in the
  shorthand. The `0.01ms` reset preserves *event firing* while
  making the motion imperceptible — color changes are nearly-instant
  but still trigger transitionend.
- **Testing in Vitest/happy-dom**: jsdom and happy-dom **do not**
  evaluate `@media` queries against system settings; `matchMedia`
  returns `matches: false` (or undefined and must be mocked). The
  consensus pattern for plain CSS is to read the file as text and
  assert via regex/substring that the expected `@media (prefers-
  reduced-motion: reduce)` block is present and contains the
  expected reset rules. There is no `jest-styled-components`
  equivalent for plain CSS — text inspection is the standard.
- **Vite gotchas**: none. Vite dev server respects the OS setting;
  we can verify in Chrome DevTools → Rendering → "Emulate CSS media
  feature prefers-reduced-motion." Browser support universal since
  2020 ([caniuse](https://caniuse.com/prefers-reduced-motion)).

### Sources

- [W3C Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [W3C C39 Sufficient Technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [Pope Tech: Design accessible animation (2025)](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [Christian Heilmann: Testing for reduced-motion](https://christianheilmann.com/2020/06/26/testing-your-animations-for-prefers-reduced-motion-support/)
- [Andy Bell: Modern CSS reset](https://piccalil.li/blog/a-more-modern-css-reset/)

### Decisions

1. **Append a single `@media (prefers-reduced-motion: reduce)`
   block** to `style.css`. No new files, no JS. Pure CSS.
2. **Block contents**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *,
     *::before,
     *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
     .tile.clickable:hover { transform: none; }
   }
   ```
   `scroll-behavior: auto !important` was *considered* per web.dev
   guidance but dropped per YAGNI: the codebase declares no
   `scroll-behavior: smooth` anywhere, so the reset would be dead
   code.
3. **Hover transform override is `.tile.clickable:hover`** (not just
   `.tile:hover`) because the `translateY(-1px)` is scoped to that
   selector at line 137-140. Matching the original specificity
   avoids over-reach.
4. **No keyframe rewrites**. The `pop-in` animation will run for
   0.01 ms — visually instant — and we do not need to also delete
   the keyframe rule. Keeping the keyframe present means the
   non-reduced-motion path is unchanged.
5. **No domain-module changes**. Pure CSS; no JS / Vue templates /
   game logic touched.

### Tests

- **New `tests/reducedMotion.test.js`**: read `style.css` as text
  and assert:
  - the `@media (prefers-reduced-motion: reduce)` block exists;
  - inside it: universal-selector reset rule includes
    `animation-duration: 0.01ms !important`,
    `animation-iteration-count: 1 !important`,
    `transition-duration: 0.01ms !important`;
  - inside it: `.tile.clickable:hover` rule contains
    `transform: none`.
- **No changes** to existing tests. The block is appended after all
  existing rules, so cascade order is preserved and current visual
  / interaction tests don't see any change.

### Out of scope (intentional)

- Per-keyframe rewrites (e.g., a separate reduced-motion `pop-in`
  fade-only keyframe). The canonical reset is enough.
- JS-level reduced-motion gating (no JS animation callbacks today).
- `prefers-contrast` / `prefers-color-scheme` honouring (separate
  concerns; the palette is already dark).
- Real-browser keyboard / live-region a11y verification — that's
  the separate "A11y polish round 2" follow-up.

## Pure-rearrangement bug fix

### Problem

`canFormWord` rejects exact replay (`consumedWords.includes(word)`)
but does not reject same-length single-parent rearrangements. So the
sequence `side → dies → side → dies …` is currently a legal infinite
loop: each transformation passes the dictionary check, uses all of
the parent's letters, and is not a trivial inflection.

### Canonical rule (independently confirmed)

In Snatch / Anagrams (the game APPLICATION-SPEC.md is modelled on),
**every steal must add at least one tile from the pool**. Same-length
rearrangement is not a valid steal. Confirmed by Wikipedia
(Anagrams (game)), Bananagrammer (competitive community reference),
Letter Tile Games Wiki, and BoardGameGeek. Length growth over the
parent is the universal baseline rule.

The stricter "must rearrange at least two parent tiles" variant
(disallowing pure insertion like `MONEY + KS → MONKEYS`) is **out of
scope**: spec example `Nub + S → Snub` would fail this stricter rule
and the spec explicitly accepts it. So we only enforce the baseline.

### Decision

In `src/anagramRules.js#canFormWord`, replace the single-purpose
`consumedWords.includes(word)` exact-replay check with a more general
**max-parent-length growth** check:

```js
if (consumedWords.length > 0) {
  const maxParentLen = consumedWords.reduce(
    (m, w) => Math.max(m, w.length),
    0
  );
  if (word.length <= maxParentLen) {
    bestFailure = bumpFailure(bestFailure, 'no-new-play', FAILURE_PRIORITY);
    continue;
  }
}
```

The new rule subsumes the old one:

- **Replay** (`typed === parent`, single parent) — `typed.length ===
  parent.length`, fails growth check, rejected.
- **Same-length rearrangement** (`typed != parent`, single parent,
  same length) — fails growth check, rejected. (NEW: previously
  accepted.)
- **Single-parent + loose growth** (`nub + s → snub`) — `typed.length
  === 4 > 3`, passes.
- **Multi-parent merge** (`res + side → resides`) — `typed.length ===
  7 > max(3, 4)`, passes. In general for ≥2 parents, `typed.length
  ≥ Σ parent_lengths ≥ max_parent_length + min_other_parent_length ≥
  max_parent_length + 3 > max_parent_length`, so multi-parent always
  passes (consistent with the spec's intent).
- **Pure loose draw** — `consumedWords.length === 0`, growth check
  guarded off.

### Reason code

Reuses the existing `'no-new-play'` reason. The user-facing message
`reasonText('no-new-play')` in `src/components/GameScreen.vue` is
broadened from "That is the same word that is already on the table."
to "You must add at least one new letter when using an existing
word." Single reason keeps the failure-priority table intact.

### Sources

- [Anagrams (game) - Wikipedia](https://en.wikipedia.org/wiki/Anagrams_(game))
- [Bananagrammer — The Game of Snatch (a.k.a. Anagrams)](http://www.bananagrammer.com/2009/07/game-of-snatch-aka-anagrams.html)
- Letter Tile Games Wiki, BoardGameGeek

### Tests added

- `tests/anagramRules.test.js`:
  - `rejects same-length single-parent rearrangement (dies from
    side)`. Expects `{ ok: false, reason: 'no-new-play' }`. Headline
    bug regression test.
  - `accepts a multi-parent merge that exceeds the longest parent
    (trains from rat + sin)`. Locks the load-bearing invariant that
    multi-parent merges are unaffected by the new check; previously
    untested at the `canFormWord` boundary.
  - Sharpened existing "rejects rook from rook" test by asserting
    `reason: 'no-new-play'`, locking the new code path on the replay
    subcase.
  - Existing positive tests (`brook from rook + b`, `snub from nub +
    s`, `redefine from refine + d + e`) act as regression coverage —
    they must keep passing.

### Out of scope

- The stricter "must rearrange at least two parent tiles" variant
  (insertion-only steals). The spec accepts `Nub + S → Snub` so we
  cannot enforce it.
- Schema / storage changes — the bug is purely in submit-time rule
  evaluation.
- Domain-module signature changes — `canFormWord` shape unchanged.

## Per-day share-text replay (v11 commit)

Open follow-up from CURRENT-PROGRESS.md: "Share-text replay from a past
day on the calendar popover. `history` (transformation chain) is not
currently in storage — would require a schema migration to surface a
full Wordle-style share grid for past days."

Today the calendar popover shows score / longest word / duration but no
Share button. The reason is structural: `recordDailyResult` persists
`{ score, longestWord, durationMs, completedAt }` but not `history`, so
`generateShareText` (which renders the Wordle-style emoji grid from
`history[i].word.length` and `history[i].parents[i].length`) cannot be
called for a past day.

### Findings (knowledge-researcher summary)

- **Schema migration**: 2024-2026 consensus across Zustand persist,
  pinia-plugin-persistedstate, Redux Persist is "bump version + write a
  migrate function (chain by `for v from persisted to LATEST`), even
  for additive changes." Storage *key* stays the same; the inner
  `schemaVersion` is the source of truth. Migration fires on read at
  boot. Sources: [Zustand persist
  reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist),
  [diballesteros migration
  guide](https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp),
  [Zustand discussion #2082](https://github.com/pmndrs/zustand/discussions/2082).
- **YAGNI counter**: when the change is purely additive-optional
  (`history?: [{word, parents}]`), keeping `schemaVersion: 1` and
  treating the new field as optional is fully correct: existing v1
  records continue to load (no version mismatch), new records get
  `history` when available, share button is gated on its presence
  per-record. The migration framework can be added when the *first*
  non-additive change actually demands it. CLAUDE.md says YAGNI
  strongly; we honour that.
- **Decision**: do NOT bump SCHEMA_VERSION. Treat `history` as an
  optional field per record. Update `src/docs.md` to reflect that
  `history` is now part of the record contract (optional). Document
  the YAGNI rationale here for the next person who wonders why we
  didn't bump.
- **Clipboard testing in Vitest + happy-dom 20**: happy-dom has a real
  `navigator.clipboard` but [issues
  exist](https://github.com/capricorn86/happy-dom/issues/1153) around
  blob types and `writeText`. Consensus: mock it. Cleanest pattern is
  `Object.defineProperty(navigator, 'clipboard', { value: { writeText:
  vi.fn().mockResolvedValue(undefined) }, configurable: true,
  writable: true })` in a per-test `beforeEach`, then `vi.spyOn` per
  assertion. `vi.stubGlobal` works for top-level globals but not for
  nested properties like `navigator.clipboard`. Source: [Dheeraj
  Murali — Clipboard Testing in
  Vitest](https://dheerajmurali.com/blog/clipboard-testing/),
  [andrewchaa](https://dev.to/andrewchaa/mocking-navigatorclipboardwritetext-in-jest-3hih).
- **Promise gotcha**: `await wrapper.find('button').trigger('click')`
  only awaits the next tick, not the clipboard promise. Pattern:
  `await trigger('click'); await flushPromises(); expect(spy)…`.

### Decisions

1. **`recordDailyResult` accepts an optional `history` field** and
   persists it inside the record. No schema bump, no migration code.
   Existing v1 records continue to load (they just won't have a
   `history` field on their record). The persisted shape becomes
   `{ score, longestWord, durationMs, completedAt, history? }`. Old
   callers (none external) and passing-`history`-undefined remain
   safe.
2. **App.vue threads `result.history` into the call** when recording a
   finished daily run. `endGameWithResult` already has `result` from
   `endGame`; that result already exposes `history` (added in the v3
   share-grid commit so `ScoreScreen` could pass it to
   `generateShareText`). Trivial wiring.
3. **HomeScreen popover gains a Share button**, gated on
   `selectedEntry.record?.history?.length > 0`. Records without
   `history` (legacy v1 entries written before this commit) will not
   show the button at all — there is no degraded mode. The button is
   labelled "Share" with a "Copied!" flash on success, mirroring
   `ScoreScreen`. `streak: 0` is passed (we do not retroactively
   compute the streak as it stood on a past date — out of scope; would
   require walking records back from each date).
4. **Same clipboard-with-prompt-fallback** pattern as `ScoreScreen`.
   Both implementations share a 1-line try/catch shape. No new
   composable abstraction (YAGNI; one extraction-worthy duplicate at
   most).
5. **No `tests/setup.js` global file**. The clipboard mock is per-test
   in `beforeEach` — avoids global side effects on tests that don't
   touch clipboard. Pattern documented above.
6. **Streak in past-day share is 0** (no `Streak <N>` suffix on past
   shares). Reasonable: streak is a "right now" concept; a Wordle-
   style share of "I beat April 22" with today's streak attached
   would be misleading.

### Tests

- `tests/storage.test.js`: 2 new tests under `recordDailyResult` —
  persists `history` round-trip when provided; record without
  `history` field remains valid (forward compat for v1 records read
  by the new loader).
- `tests/homeScreen.test.js`: 6 new tests under day-detail popover:
  (a) Share button rendered when `selectedEntry.record.history` is
  non-empty; (b) Share button NOT rendered when `history` is absent;
  (c) Share button NOT rendered when `history` is `[]`; (d) clicking
  Share calls `navigator.clipboard.writeText` with text containing
  the date and score; (e) the share button label resets to "Share"
  when the user switches to a different cell after copying (race
  guard); (f) when `clipboard.writeText` rejects, falls back to
  `window.prompt`.
- `tests/app.smoke.test.js` extension is NOT needed — the popover
  share button is well covered at the component level. Smoke is
  coarse.

### Out of scope (intentional)

- SCHEMA_VERSION bump and migration framework. Add when first
  non-additive change demands it.
- Retroactive streak calculation per past date.
- Share-from-popover for random-mode runs (random doesn't persist to
  storage at all).
- A shared clipboard composable. One duplicate is not premature
  abstraction.
- Re-rendering the share grid in the popover preview (just copies
  text). Future cosmetic.

## Local-midnight Daily Challenge reset (v12 commit)

Open follow-up from CURRENT-PROGRESS.md: "Local-midnight reset for the
Daily Challenge (industry consensus over UTC). Currently UTC for parity
with the existing puzzle seed; if we move puzzle ID to local, the
streak storage key follows automatically."

Today both the daily PRNG seed and the storage record key are derived
from `new Date().toISOString().slice(0, 10)` (UTC). A user in Pacific
time sees today's puzzle change at 5 PM the *prior* local day; a user
on the east side of the date line sees the new puzzle hours before
their local midnight. NYT Wordle, NYT Connections, and most daily-puzzle
games reset at the user's local midnight by reading the device clock.

### Findings (knowledge-researcher summary)

- **Local YYYY-MM-DD formatting in vanilla JS**: idiomatic options are
  `date.toLocaleDateString('en-CA')` (one-liner; abuses locale for its
  format) and a manual `${y}-${pad(m+1)}-${pad(d)}` from
  `getFullYear/getMonth/getDate`. For a primary key (puzzle seed,
  storage key) the manual helper is preferred — three lines, no
  locale dependency, no `Intl` runtime cost. The `Intl` working group
  itself acknowledges `en-CA` "feels inappropriate" for this purpose
  ([tc39/ecma402#891](https://github.com/tc39/ecma402/issues/891)).
- **Mid-game "today" rollover**: industry consensus is **lock at
  game-start**. Wordle's reset is local-midnight per device clock, and
  if a user starts at 11:55 pm and finishes at 12:05 am, whatever
  puzzle they opened is the puzzle they finish. Re-deriving the date
  on submit would punish the 11:55 pm player. Source:
  [What Time Does Wordle Reset? — Connections Hintz](https://www.connectionshintz.com/blog/what-time-wordle-reset).
  This is already the architecture in `App.vue`: `startGame` captures
  the date once into `game.value.date`, and `endGameWithResult` reads
  `game.value.date` (not re-deriving). No code change needed for the
  lock — only the helper changes from UTC to local.
- **Migration from UTC keys to local keys**: cleanest pattern for an
  early-stage app is "don't migrate, just orphan." Old UTC-keyed
  records stay in localStorage harmlessly. The only risk is a single
  day of "you already played" state being mis-attributed, which is
  trivial. CLAUDE.md says YAGNI; we honour that. No migration code,
  no `SCHEMA_VERSION` bump (the *value* of date keys changes
  semantics, not the schema shape).
- **Vitest + happy-dom Date mocking**: `vi.useFakeTimers()` to enable,
  `vi.setSystemTime(new Date(2026, 3, 25, 12, 0, 0))` to set the
  moment, `vi.useRealTimers()` in cleanup. The constructor form
  `new Date(2026, 3, 25, 12, 0, 0)` is *local* midday Apr 25, 2026.
  `new Date('2026-04-25')` is *UTC* midnight — would flake under
  CI-vs-laptop TZ differences. Sources:
  [Vitest: Mocking Dates](https://vitest.dev/guide/mocking/dates),
  [Vitest: Timers](https://vitest.dev/guide/mocking/timers).

### Decisions

1. **Extract `todayLocal()` to `src/dateKey.js`** with a pure helper
   `formatLocalDate(date)` it builds on. Keeping it in its own module
   (rather than `storage.js`) reflects the dual purpose: same key
   feeds both the PRNG seed (`prng.js`/`game.js`) and the storage
   layer (`storage.js`). One source of truth so the seed and key
   never drift.
2. **App.vue** imports `todayLocal` and replaces `todayUTC()` callsites
   inline. Function call shape unchanged. Lock-at-start is preserved
   by the existing `startGame` → `game.value.date = ` pattern.
3. **No migration**. Old UTC-keyed records in localStorage are
   orphaned. For most users this is at most a one-day discrepancy
   (UTC and local diverge on at most one calendar day per midnight
   crossing) and only matters once.
4. **No `SCHEMA_VERSION` bump**. The schema shape is unchanged; only
   the *interpretation* of date keys flips from UTC to local. A
   schema migration framework will land when the first genuinely
   breaking shape change appears.
5. **`shiftDate()` in `storage.js` stays as-is**. It uses `Date.UTC`
   internally to step ±N days on a YYYY-MM-DD string and re-format.
   The string itself is timezone-agnostic — UTC math here is just an
   arithmetic stable point that avoids DST edge cases. Whether the
   string came from UTC or local time doesn't matter.
6. **`HomeScreen.vue` weekday/human-date helpers stay as-is.** They
   parse fixed `YYYY-MM-DD` strings via `Date.UTC` and read
   `getUTCDay()` / `toLocaleDateString({timeZone: 'UTC'})`. Same
   reasoning: the input is just a calendar-date label; UTC parsing
   gives a stable weekday. April 25 2026 is a Saturday no matter how
   you slice the day.

### Tests

- **`tests/dateKey.test.js` (new)**: unit tests for `formatLocalDate`
  (zero padding for single-digit month/day; full year regardless of
  TZ) and `todayLocal` (uses `vi.setSystemTime` to pin a known local
  moment, asserts the helper returns the local-calendar date).
- **`tests/app.smoke.test.js`** "shows Streak and Best..." test:
  switch from `new Date().toISOString().slice(0, 10)` (UTC) to
  `vi.useFakeTimers()` + `vi.setSystemTime(new Date(2026, 3, 25, 12, 0, 0))`
  + hardcoded `today = '2026-04-25'`, `yesterday = '2026-04-24'`. This
  pins the test to a deterministic moment regardless of CI/laptop
  timezone, and exercises the local-date code path. The other smoke
  tests don't depend on date semantics, so they're unaffected.

### Out of scope (intentional)

- One-time read-side fallback for legacy UTC records. CLAUDE.md says
  YAGNI; the orphan cost is one day of "you already played" state.
- Mid-game date-rollover unit test. The lock-at-start invariant is
  already structurally guaranteed by `App.vue`'s `game.value.date`
  capture; an isolated test would require complex internal state
  inspection for marginal value.
- Switching `HomeScreen.vue` weekday/human-date helpers to local
  parsing. They're consuming opaque YYYY-MM-DD labels and producing
  human-readable strings; the UTC-parse trick produces the right
  weekday in all timezones.

## Sticky-claim trail / staged-tile model (v13 commit)

Open follow-up from CURRENT-PROGRESS.md "Sticky-claim or staged-array
model so click-to-remove on duplicate leftmost letters un-highlights
the clicked tile (not the rightmost)." This was deferred as
out-of-scope on the v4 click-to-remove commit and is now the highest-
impact open item.

### The bug

Today the rack might offer `R, R, T, S` (loose tiles indices 0..3).
Player clicks tile 0 (the first R), then types `at`. Highlight-set
recompute in `staging.js#partialHighlight` walks the typed multiset
greedily and claims the leftmost-of-letter loose tile per letter — so
tile 0 is highlighted as "claimed." Player clicks tile 0 to deselect.
`removeFirstOccurrence` removes one R from `typed`, leaving `at`.
Recompute again picks leftmost-of-letter — but typed is `at`, no R, so
no R is highlighted. **Visually correct in this two-R rack.** Now
suppose only tile 0's R was claimed and tile 1's R is unclaimed:
player clicks tile 0; we remove the leftmost matching letter from
typed, leaving `at`; nothing else changed — also fine. The bug
**actually surfaces** in scenarios where typed contains multiple R's
already (e.g. `rar` from a click-tile-1, click-tile-0, type-a,
type-r run): recompute keeps highlighting leftmost-first, so the
*post-click* highlight set is `{tile-0, tile-1}` even though we just
clicked tile 0 to deselect. Effectively, the model never had a way to
remember **which specific tile the user clicked** — it only remembers
**how many of each letter are claimed**.

Symmetric issue on word rows is benign: `consumption.words` is index-
based and the click handler removes the word's letters wholesale, so
word-row clicks already track identity.

### The fix: a "claim trail" alongside typed

`trail = ref([])` — array of entries, one per letter currently in the
input box, in left-to-right order:

```
{ kind: 'loose', sourceIndex: number, letter: 'r' }
{ kind: 'word',  sourceIndex: number, letter: 'r' }   // multiple per word click
{ kind: 'typed', letter: 'r' }                        // no source
```

`typed` becomes a `computed(() => trail.value.map(e => e.letter).join(''))`.

**Click handlers** push entries with their identity. Click on already-
claimed tile finds the matching `{kind:'loose', sourceIndex:i}` entry
and splices it out — so the clicked tile, not the leftmost-matching
one, is the one that gets un-claimed. Word click on already-claimed
word finds all entries with `{kind:'word', sourceIndex:i}` and splices
all of them out atomically.

**Direct typing** is intercepted via `@beforeinput`. Input event types
(`event.inputType`):
- `insertText` (single letter) → push `{kind:'typed', letter}`. PreventDefault
  so the trail-derived computed value is the canonical input value.
- `deleteContentBackward` → pop the last trail entry.
- `deleteContentForward` → splice based on `selectionStart`.
- `insertFromPaste` → pushed as N `kind:'typed'` entries.
- Selection-delete (cut, range delete) → splice the slice
  `[selectionStart, selectionEnd)`.
- Anything unrecognized (IME composition, etc.) → preventDefault, no-op.

This game is English-letters-only and desktop-first; IME composition
is a non-goal, so a strict `preventDefault()` allow-list is safe.

**Highlight set** (`consumption`) becomes a pure derivation from
`trail`: a loose tile index `i` is in `consumption.loose` iff some
entry has `kind:'loose' && sourceIndex===i`; a word index `i` is in
`consumption.words` iff some entry has `kind:'word' && sourceIndex===i`.
No greedy multiset matching anymore — identity is preserved.

### Why this design (over alternatives)

- **`v-model` + watch(typed)**: rejected. The watcher fires post-flush
  with stale state; diffing old vs new typed string to figure out
  what changed (insert? delete? paste?) is fragile; re-entrancy bugs
  are likely. (Researcher cite: [Vue Watchers docs](https://vuejs.org/guide/essentials/watchers).)
- **Per-letter typed entries always**: rejected. Loses identity on
  click — defeats the purpose.
- **Bind `:value` + `@beforeinput`**: chosen. Trail is the model;
  the input is a transient editor. Mirrors Downshift `useMultipleSelection`,
  shadcn-vue `TagsInput`, PrimeVue `Chips`. Synchronous mutation
  inside the handler keeps Vue's reactivity flow happy.
- **Trail-as-set vs trail-as-array**: array. Order matters for
  display position and for backspace-removes-last semantics.

### Edge cases / gotchas

- **`insertCompositionText` on Android Chrome / GBoard**: the research
  agent flagged this. We `preventDefault` on unrecognized inputTypes
  and don't update trail — so on a phone with composition input,
  typing might not work. Mobile play is documented as out of scope
  for v13; if it becomes a gate, fall back to v-model + diff for
  composition events. (Researcher cite:
  [MDN beforeinput](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event).)
- **Reconciliation safety net**: if the trail-derived `typed.value`
  ever diverges from the actual `<input>.value` (e.g. browser auto-
  fill, third-party extension), the computed binding pulls the input
  back into sync on the next render. We don't try to be cleverer
  than that.
- **Submit-time identity**: `submitWord` only needs the typed string
  (and the pool). Trail is purely for highlight identity and click-
  removal. After a successful submit, both `trail` and `typed` reset
  to empty.
- **Stale `sourceIndex` after submit**: when `submitWord` succeeds the
  pool's loose-letter array is rebuilt (consumed letters removed,
  others re-indexed). Trail must be cleared on submit success — its
  source-indices reference a pool snapshot that no longer exists.
  Handled by the existing `typed.value = ''` reset; in the new model
  this becomes `trail.value = []`.
- **Stale `sourceIndex` after draw**: a draw appends one new tile
  to `looseLetters`. Existing indices are unchanged, so a trail
  entry with `sourceIndex=2` still refers to the same tile. Trail
  does NOT need to clear on draw.
- **Highlight on partial coverage**: if typed = "rat" and the rack
  has only one R, the existing `partialHighlight` highlights the
  one R it can claim. In the new model, if the user typed (no
  click) the trail entries are all `kind:'typed'` with no
  sourceIndex — so no loose tile is "claimed" by sourceIndex.
  We need a fallback: when computing `consumption`, after collecting
  identity-bound claims from the trail, run the existing greedy
  multiset matcher on the `kind:'typed'` letters against the
  remaining (unclaimed-by-identity) tiles to keep partial-cover
  hints. This is a hybrid model: identity wins where it exists,
  greedy fills the rest. **Critical** — without it, a player who
  types `cat` with no clicks sees zero loose-tile highlights, a UX
  regression.

### Tests

- **`tests/staging.test.js`**: 11 existing tests stay passing. The
  `highlightConsumption` API may need to gain a second param (the
  trail) or a new `highlightFromTrail` sibling export. Add unit
  tests:
  - "click identity persists when trail entry has sourceIndex"
  - "trail-with-only-typed-entries falls back to greedy match
    (parity with old behavior)"
  - "trail with mixed identity + typed entries highlights the
    identity-bound tile and greedy-matches the typed residue"
- **`tests/gameScreenInteraction.test.js`**: existing 14+9 tests
  retargeted minimally. Add the headline regression test:
  - "clicking the leftmost-of-duplicate-claimed tile un-highlights
    *that* tile, not the rightmost" (rack `[R,R,T,S]`, click tile 0,
    click tile 1, click tile 0 → consumption.loose === {1}).
  - "Backspace pops the last trail entry, regardless of whether it's
    a click or a typed letter."
  - "typing then clicking integrates correctly: type 'r', click
    tile 1 (R), type 'a' → consumption.loose includes tile 1 and
    one of the leftmost R's via greedy fallback for the 'r' typed."
  - "submit clears both typed and trail; consumption is empty after."

### Out of scope

- Mobile composition-input support. Manual testing on real Android
  is the gate; not a unit-test concern.
- Per-letter click-to-remove inside a placed word row. Word entries
  remain atomic (all-or-nothing).
- Backspace-removes-just-the-typed-tail-only (without affecting
  click entries). The simplest spec is "Backspace pops trail tail";
  if the tail is a click entry, that click is undone. Matches user
  intuition.
- Sticky highlights for word rows (already correct via index-based
  click handler).

### Decision summary

Replace `v-model="typed"` with `:value="typed"` + `@beforeinput` /
`@input` handlers. Introduce `trail` ref. Make `typed` a computed
joining trail letters. Click handlers push/splice trail entries by
sourceIndex. `consumption` is identity-derived from trail with a
greedy-fallback for `kind:'typed'` residue. `submitWord` keeps its
existing string-based contract (no signature change). All other
modules (`anagramRules`, `game`, `pool`, `scoring`, `share`,
`storage`) are untouched.

## Share-grid truncation for Twitter 280-char limit (v14 commit)

Open follow-up from CURRENT-PROGRESS.md: "Truncate share grid for very
long runs (Twitter 280-char limit) — not hit by typical games but
possible." Today `generateShareText` emits one emoji row per word in
`history`. For typical daily plays (5–10 words) this is well under the
limit; for marathon runs (25–30 words with steals) it overflows and
Twitter silently truncates — the share looks broken (cut row, missing
footer).

### Twitter character-counting (knowledge-researcher summary)

Twitter/X uses the official `twitter-text` v3 weighted-length model
([X docs](https://docs.x.com/fundamentals/counting-characters),
[twitter/twitter-text](https://github.com/twitter/twitter-text),
[v3 config](https://github.com/twitter/twitter-text/blob/master/config/v3.json)):

- `maxWeightedTweetLength = 280`. `defaultWeight = 200` (i.e. 2 weight
  units per char). Discounted weight `100` (1 unit) granted only to
  BMP code points in `[0–4350], [8192–8205], [8208–8223],
  [8242–8247]` — basic Latin, common Latin-extension, CJK punctuation,
  and a few general-punctuation ranges.
- U+1F7E9 (🟩) and U+1F7E8 (🟨) live in the Geometric Shapes Extended
  block at U+1F7E0–1F7EB — supplementary plane, far outside the
  discounted ranges. Each costs **2 weight units**.
- Counting is on code points after NFC normalization, not UTF-16 code
  units. ZWJ-joined sequences (👨‍👩‍👧 etc.) sum across components and
  are much heavier (7–11 units). We use plain colored squares only —
  exactly 2 weight each.
- For our format (~50 chars header/footer, all ASCII or near-ASCII +
  emoji rows): budget is `280 − 50 ≈ 230` weight, which is **~115
  emoji squares**. Targeting `260` total leaves a 20-weight safety
  margin for newlines, em-dash, middle-dots, and the elision line.

### Long-form Wordle precedent

- Wordle/Quordle/Octordle never hit the limit (max 30 squares).
- Sedecordle (16-word) is already pushing the limit with two keycap
  digits per guess.
- 64ordle.au explicitly rejected per-guess rendering ("128 keycap
  emoji is way too much for Twitter/Bluesky") and switched to **one
  emoji per word, color-tier encoded**. Total ≤ 64 emoji + few lines
  of text fits one tweet.
- **No mainstream Wordle variant uses "+N more" truncation.** The
  community convention is **re-encoding to a denser representation**.
  Truncation is an "un-Wordle" choice.

### Decision: truncation, not re-encoding

Re-encoding is rejected for Anagrams because the per-row format
encodes legible information — the 🟨/🟩 split per word shows how much
the player stole vs added. Collapsing each word to a single
score-tier emoji loses that signal. We accept that we're departing
from the Wordle community convention.

The truncation pattern follows general UX/accessibility guidance
(Baymard, Slate on Wordle accessibility):

- **Head + tail** elision is the convention readers understand: keep
  the first few rows (game opening), keep the last few rows
  (climax/longest-word play). Avoid "smart" selection (e.g.,
  longest-word-first) — surprising for cross-player comparison.
- **Plain text "+ N more words" line** as the elision signal. Screen-
  reader-friendly. Costs ~10 weight.
- **Hardcode the cap** — `MAX_WEIGHTED_LENGTH = 260`. Configurability
  is YAGNI for this domain.

### Algorithm

1. Build header, rows, footer as today.
2. Compute weighted length of the assembled output via a
   `weightedLength` helper.
3. If `≤ MAX_WEIGHTED_LENGTH` OR `rows.length ≤ HEAD_KEEP +
   TAIL_KEEP` (== 6), return as-is. (Can't help: dropping fewer than
   1 row is a no-op.)
4. Otherwise, drop the middle: keep `rows[0..3]` + elision +
   `rows[-3..]`. Elision line: `… +N more` where `N = rows.length −
   6`.

### `weightedLength` simplification

A faithful port of twitter-text would need ~10 lines of range-membership
code. We simplify to:

```js
function weightedLength(text) {
  let len = 0;
  for (const ch of text) {            // iterate by code point
    const cp = ch.codePointAt(0);
    len += cp <= 0x7F ? 1 : 2;
  }
  return len;
}
```

ASCII = 1 weight, everything else = 2. This **over-counts** a few
chars in our format (em-dash `—` U+2014, middle-dot `·` U+00B7) by 1
weight each. With 1 em-dash and at most 2 middle-dots in any run, we
over-count by ≤ 3 weight. That's safely inside the 20-weight buffer
between 260 and Twitter's 280 hard limit. Conservative bias is the
right side to err on for a defensive truncator — we'd rather truncate
slightly early than ship a tweet that gets silently cut.

### Tests (TDD plan)

`tests/share.test.js` — new `describe('generateShareText —
truncation', …)` block:

1. **No truncation when history fits**: 6 rows of 4 letters → output
   contains all 6 rows verbatim, no elision text.
2. **Truncates when history overflows**: 30 rows of 6 letters each
   (heavy overflow) → output has at most 6 emoji rows; elision line
   `+24 more` (or whatever count) present.
3. **Preserves header verbatim** when truncated.
4. **Preserves footer verbatim** when truncated (longest length, time,
   streak suffix all intact).
5. **First 3 + last 3 rows preserved** in original left-to-right
   order: `output.indexOf(rows[0]) < output.indexOf(rows[1]) <
   output.indexOf(rows[2]) < elision < ... < output.indexOf(rows[-1])`.
6. **Elision count reflects `rows.length − 6`**.
7. **Truncated output stays under Twitter's 280 weight** (asserted via
   the weight rule applied in the test itself, independently
   computed).
8. **Edge: exactly 7 rows, 1 to drop** → elision `+1 more`.
9. **Edge: exactly 6 rows, no truncation possible** → all 6 rows
   preserved even if the result is over 260 weight (we accept it; we
   can't help). Also asserts no elision text.
10. **Pre-existing tests unchanged**: all 14 current `share.test.js`
    tests continue to pass (small histories, streak suffix, random
    mode, deterministic output). The truncation path is opt-in by
    overflow; non-overflow plays bypass it.

### What NOT to change

- `src/game.js` — no signature change; `endGame` still emits
  `history` exactly as before.
- `src/components/ScoreScreen.vue` — no template change.
- `src/components/HomeScreen.vue` — popover Share button reuses the
  same `generateShareText` function; truncation flows through.
- No new dependencies. No `npm i twitter-text`. Twitter's library is
  100kB+ and we only need ~5 lines of weighting logic.
- No `MAX_WEIGHTED_LENGTH` parameter exposed on the public API.
  Hardcoded constant. (Tests assert behavior, not the constant.)

### Out of scope (intentional)

- Faithful twitter-text weighting (range tables). Conservative ASCII-
  vs-non-ASCII rule is good enough; over-counting by ≤3 weight is
  inside the safety margin.
- Discord/Slack/iMessage limits. They're 2000+ chars; Twitter is the
  binding constraint.
- An aria-label "alt text" share variant for screen readers
  ([Slate piece](https://slate.com/culture/2022/02/wordle-word-game-results-accessibility-twitter.html),
  wa11y.co for Wordle). Real concern but separate commit.
- Compaction-style re-encoding (one emoji per word). Loses the
  steal/add signal that makes Anagrams' grid informative; rejected
  above.

## Screen-reader alt-text share variant (v15 commit)

Open follow-up from CURRENT-PROGRESS.md v14: "Aria-label 'alt text'
share variant for screen readers (per Slate's Wordle-accessibility
piece, wa11y.co does this for Wordle). Real concern but separate from
the Twitter truncation work."

### The problem

Today `generateShareText` emits `🟩🟩🟩🟩\n🟨🟨🟨🟨🟩🟩\n…`. Screen
readers (NVDA, VoiceOver, JAWS, TalkBack) announce each emoji by its
Unicode CLDR name: "green square. green square. green square.
green square. yellow square. yellow square…". This is the canonical
Wordle accessibility complaint
([Christian Heilmann demo](https://christianheilmann.com/2022/01/19/ever-wondered-what-a-wordle-social-media-update-sounds-to-screenreader-users/),
[Slate Feb 2022](https://slate.com/culture/2022/02/wordle-word-game-results-accessibility-twitter.html)).
WCAG H86 specifically covers this: emoji/ASCII-art content needs a
text alternative ([w3.org H86](https://www.w3.org/WAI/WCAG20/Techniques/html/H86)).

### Format research

`wa11y.co` (Cariad Eccleston's Wordle alt-text generator) is the de
facto industry-standard format. Verbatim sample:

```
Line 1: Nothing.
Line 2: 2nd perfect, but 4th in the wrong place.
Line 3: 2nd and 5th perfect, but 1st and 3rd in the wrong place.
Line 4: 2nd, 3rd, 4th and 5th perfect.
Line 5: Won!
```

Conventions extracted: `Line N:` row prefix, one sentence per row,
period terminator, plain words (no emoji, no symbols).

Slate piece does NOT prescribe a text format — it endorses the
"screenshot of grid + alt text via wa11y.co" workflow transitively.

Other variants (Octordle, Quordle, 64ordle, Mayank's accessible
clone) do not publish their alt-text templates. WordleBot iOS shortcut
generates image+alt-text pairs.

### Pronunciation gotchas

- **Em-dash `—` (U+2014)** and **middle-dot `·` (U+00B7)** are
  unreliable across screen readers — sometimes silent, sometimes
  "dash"/"middle dot" ([CSUN dashes-and-hyphens guide](https://news.csun.edu/accessibility/accessibility-tip-on-dashes-and-hyphens/),
  [WebAIM thread](https://webaim.org/discussion/mail_thread?thread=4088)).
  Replace both with periods or "and" in alt text.
- **`YYYY-MM-DD`** reads as "two thousand twenty-six dash zero four
  dash twenty-five" on TalkBack/VoiceOver. Use `Month DD YYYY` in
  alt text.
- **Numerals**: "Score 142" reads naturally as "score one hundred
  forty-two." Don't word-spell the numbers.
- **Emoji-as-content** is not "alt text" in HTML's `alt` sense — it
  is content. Screen readers announce the emoji name regardless of
  surrounding markup ([BOIA on emoji a11y](https://www.boia.org/blog/emojis-and-web-accessibility-best-practices)).
  Solution: provide a separate, opt-in plain-text variant the user
  can choose to copy.

### X/Twitter alt-text constraint

X's per-image alt-text field accepts up to **1000 characters**
([Lireo guide](https://www.lireo.com/what-to-know-twitter-alternative-text-images/)).
Bluesky's alt text field accepts up to 2000. Both are well above the
length any Anagrams play would generate (≤30 word lines × ~30 chars
each + header/footer ≈ 1000 in the absolute worst case; typical
plays 200–400 chars). Truncation is not a binding constraint here.

### Decision: separate `generateShareAltText` + secondary "Copy as alt
text" button

- **Sibling export, not modification of `generateShareText`**: the
  primary Share button stays the canonical emoji grid (Twitter share-
  card workflow). Doubling text with a parallel narrative
  description would (a) blow past the 280-char weighted budget the
  v14 truncator was specifically built to respect, and (b) confuse
  the social/casual reader.
- **Secondary "Copy as alt text" button** on both surfaces that
  already host a Share button (`ScoreScreen.vue` and the
  `HomeScreen.vue` calendar popover). Same gating as Share —
  rendered iff `record.history` (or `result.history`) is non-empty.
- Per-cell history was added in v12 and the Twitter-truncation in
  v14; this is the third leg in the share-text family, all sharing
  one source of game data.

### Format spec for Anagrams

```
Anagrams, daily April 25 2026. Score 142.
Word 1: 4 new letters.
Word 2: 4 carried, 2 new.
Word 3: 6 carried, 2 new.
Longest word 8 letters. Time 5 minutes.
```

Random-mode header: `Anagrams, random run. Score 50.` (no date).

Per-row variants:
- 0 carried, N new (root word, no parents): `Word K: N new letters.`
- M carried, N new: `Word K: M carried, N new.`
- M carried, 0 new (impossible — same-length rearrangement is
  rejected by `canFormWord` at submit time, so any history entry has
  added ≥ 1).

Footer streak: append `Streak N.` (period, not middle-dot prefix)
when daily and streak ≥ 2.

Truncation: if `history.length > 6` (same threshold as the emoji
grid), apply head-3 / tail-3 with an elision sentence: `…and N more
words…`. Threshold + format mirror the emoji-grid truncation so the
two outputs describe the same play structurally.

### Edge cases

- `longestWord` empty: omit the "Longest word" sentence entirely
  (already what the emoji version does).
- `totalTimeMs` < 60s: render as `Time N seconds.` (e.g. `45
  seconds`). Matches reword's a11y precedent of avoiding the
  ambiguous `0:45` mm:ss form when humanizing.
- `history` empty (a player who drew until the deck was empty
  without forming a word): emit header + footer only, no `Word`
  lines — exact parity with the emoji version.
- Streak === 1: omit (matches emoji output suppressing `Streak 1`).

### Out of scope

- Auto-detecting screen-reader presence and swapping the primary
  button. Forced-detection is unreliable
  ([Marco's Accessibility Blog](https://marcozehe.de/why-screen-readers-cant-be-detected/));
  always-visible secondary button is the correct UX.
- Per-share-context customization (Twitter alt vs Bluesky alt vs
  Slack /me). One format works for all 1000+ char alt fields.
- Speech-only modality (TTS file). Alt-text is text-only; rendering
  is the consumer's job.
- Emoji-grid replacement. The emoji form remains the default; alt
  text is opt-in additive.

### Tests (TDD plan)

`tests/share.test.js` — new `describe('generateShareAltText', …)`
block, ~10 tests asserting plaintext behavior:

1. Daily mode header includes humanized date and score (no `—`,
   `·`, `YYYY-MM-DD`).
2. Random mode header reads "random run" with no date.
3. Single-row history with no parents: `Word 1: 4 new letters.`
4. Single-row history with one parent: `Word K: M carried, N new.`
5. Multi-row history numbers words 1-N consecutively.
6. Footer includes `Longest word N letters.` when longest word
   exists.
7. Footer omits longest sentence when `longestWord` is empty/null.
8. Footer time `< 60s` rendered as `N seconds.`; `>= 60s` rendered
   as `M minutes N seconds.` or `M minutes.` if `s === 0`.
9. Streak suffix `Streak N.` appears in daily mode when streak ≥ 2;
   absent for streak 0/1 or random mode.
10. History.length > 6 triggers truncation: head-3 + elision
    `…and X more words…` + tail-3 sentences. Total word-line count
    7.
11. History.length ≤ 6 emits all rows verbatim, even if individual
    rows are long.
12. Output contains zero emoji (assert `!/[\u{1F7E8}-\u{1F7E9}]/u`).
13. Output contains zero em-dash and zero middle-dot.
14. Determinism: same inputs → byte-identical output.

`tests/scoreScreen.test.js` (new file or extend existing) — add
"Copy as alt text" button rendering + click behavior:

15. Renders `Copy alt text` button when `result.history` is
    non-empty.
16. Does NOT render the button when `result.history` is empty/null.
17. Click invokes `navigator.clipboard.writeText` once with text
    that contains "Word 1:" and the score.
18. Falls back to `window.prompt` on clipboard rejection.
19. Click flips button label to "Copied!" for 2s then back.

`tests/homeScreen.test.js` — extend `popover — share` block:

20. Renders `Copy alt text` button in the popover when
    `record.history` is non-empty.
21. Does NOT render when history absent or empty.
22. Click invokes clipboard with text containing the entry's date
    and score, no emoji.
23. Falls back to prompt on rejection.
24. Switch-to-different-cell after clicking Copy alt text resets
    label.

### What does NOT change

- `generateShareText` — bytewise unchanged. All 22 existing share
  tests must continue to pass.
- Domain modules (`game.js`, `pool.js`, `scoring.js`, etc.) —
  untouched.
- Storage schema — no shape change.
- CSS palette — only need a new selector for the secondary button
  (or reuse `.action-btn` directly — TBD in plan).
- Primary Share button — visible label, position, and behavior all
  unchanged.

### Sources

- [wa11y.co — Wordle accessibility tool](https://wa11y.co/)
- [Slate — Wordle game results accessibility (Feb 2022)](https://slate.com/culture/2022/02/wordle-word-game-results-accessibility-twitter.html)
- [W3C WCAG H86 — Text alternatives for emoji/ASCII art](https://www.w3.org/WAI/WCAG20/Techniques/html/H86)
- [Christian Heilmann — Wordle screen-reader demo](https://christianheilmann.com/2022/01/19/ever-wondered-what-a-wordle-social-media-update-sounds-to-screenreader-users/)
- [Lireo — Twitter alt text 1000-char limit](https://www.lireo.com/what-to-know-twitter-alternative-text-images/)
- [BOIA — Emojis and web accessibility](https://www.boia.org/blog/emojis-and-web-accessibility-best-practices)
- [CSUN — Dashes and hyphens accessibility](https://news.csun.edu/accessibility/accessibility-tip-on-dashes-and-hyphens/)
