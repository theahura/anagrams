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
