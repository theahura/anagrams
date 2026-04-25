# Noridoc: src

Path: @/src

### Overview

- Vue 3 SPA implementing Anagrams (Snatch-style word game): pure-function domain core under `src/` with Vue components under [`src/components/`](@/src/components).
- Domain modules are framework-agnostic, side-effect-free, and consumed by the orchestrator [`src/components/App.vue`](@/src/components/App.vue).
- Two persistence-relevant boundaries exist: dictionary loading (fetch of `data/dictionary.json`) and Daily Challenge stats persistence via [`src/storage.js`](@/src/storage.js) → `localStorage`.

### How it fits into the larger codebase

- The application has no backend. All state lives either in Vue refs (transient) or in `localStorage` (Daily Challenge history only). There is no server, no API client, and no shared cache module.
- [`src/components/App.vue`](@/src/components/App.vue) is the sole orchestrator: it owns screen routing (`home` / `game` / `score`), constructs the game via `createGame`, advances it via `GameScreen`, and is the only caller of [`src/storage.js`](@/src/storage.js). Domain modules never import storage or Vue.
- Daily-mode determinism flows: a `YYYY-MM-DD` UTC date string seeds [`src/prng.js`](@/src/prng.js) inside `createGame` ([`src/game.js`](@/src/game.js)), guaranteeing every player gets the same shuffle for a given UTC day. The same date string is the storage record key in [`src/storage.js`](@/src/storage.js).
- Share-text generation ([`src/share.js`](@/src/share.js)) is purely derived from the end-of-game `result` plus the current `streak` value computed from storage. It is the only public-facing serialization of game state.

### Core Implementation

- **Game lifecycle.** [`src/game.js`](@/src/game.js) exposes `createGame`, `drawTile`, `submitWord`, `endGame`. State is immutable: each operation returns a new game object. `INITIAL_REVEAL = 3` tiles are drawn at construction. `endGame` computes `finalScore`, the longest word, and a parent-chain reconstruction (`buildChain`) used by the Score screen.
- **Pool model — three pools.** [`src/pool.js`](@/src/pool.js) defines the canonical board shape: `{ faceDown, looseLetters, words }`. `faceDown` is the unrevealed bag; `looseLetters` are revealed but uncommitted letters; `words` are committed plays, each carrying its `parents` (the prior words consumed to form it). `formWord` removes consumed loose letters via multiset subtraction and replaces consumed parent words with the new word.
- **Word legality.** [`src/anagramRules.js`](@/src/anagramRules.js) enumerates subsets of existing `words` (bitmask up to 16) and checks whether the typed word can be assembled from a chosen subset plus loose letters. Failures are prioritized (`letters-unavailable` < `no-new-play` < `trivial-inflection`) so the worst applicable reason is reported. Profanity is filtered via `bad-words`. Trivial inflections (e.g. plural-by-S) are rejected via [`src/trivialInflection.js`](@/src/trivialInflection.js).
- **Scoring.** [`src/scoring.js`](@/src/scoring.js) scores each word as `length²` and subtracts `MISSED_DRAW_PENALTY (10)` per missed-draw. `hasLoosePoolAnagram` (used by `drawTile` to detect missed draws) enumerates loose-letter subsets up to size 8 and checks them against the dictionary's `signatureIndex`.
- **Dictionary.** [`src/dictionary.js`](@/src/dictionary.js) builds two indices from the JSON wordlist: a `Set` for `isWord` lookups and a `signatureIndex: Map<sortedLetters, words[]>` for anagram subset detection. Loaded once per session by `App.vue`.
- **Persistence layer.** [`src/storage.js`](@/src/storage.js) is a pure-function module over an injected storage shim. `browserStorage()` returns `window.localStorage` after a probe write (to detect Safari Private Mode where quota is 0), or a no-op shim. Records are stored under key `anagrams:v1` with shape `{ schemaVersion: 1, records: { 'YYYY-MM-DD': { score, longestWord, durationMs, completedAt } } }`. `recordDailyResult` is **keep-first per date** (Wordle convention) — re-playing a date does not overwrite. `currentStreak` counts trailing consecutive UTC days and preserves the streak when today is missing but yesterday is present (so the streak is shown until the user actually breaks it). `bestScore` and `hasCompletedDate` are pure derivations over `records`. **Streak and best are never persisted as denormalized state — they are recomputed from `records` on each read.**
- **Share text contract.** [`src/share.js`](@/src/share.js) `generateShareText` produces a Wordle-style block: header `Anagrams <date|Random> — <score>`, an emoji grid where each played word becomes one row of `🟨` (carried letters from parents) followed by `🟩` (newly added letters), and a footer joining `Longest <N>`, `Time <m:ss>`, and (daily mode only, when `streak ≥ 2`) `Streak <N>` with ` · ` separators.

### Things to Know

- **Date string is UTC, sliced from ISO-8601.** `App.vue`'s `todayUTC()` uses `new Date().toISOString().slice(0, 10)`. The same convention is used as both the PRNG seed and the storage record key, so they cannot drift.
- **Storage failures are swallowed.** `loadStore` returns the empty store on missing-key, JSON parse failure, schema-version mismatch, and `getItem` throwing. `recordDailyResult` returns `{ wasNewRecord: false }` when `setItem` throws (quota exceeded). Callers must not assume a write succeeded.
- **`isNewBest` must be computed before recording.** [`src/components/App.vue`](@/src/components/App.vue) `endGameWithResult` snapshots `bestScore(loadStore(...).records)` *before* calling `recordDailyResult`, then compares the new score against that previous best. Reading after the write would always tie or lose.
- **Replays of a date never update stats.** Because `recordDailyResult` is keep-first, replaying an already-completed daily returns `wasNewRecord: false` and `isNewBest` stays `false` even if the replay scored higher.
- **Random mode never touches storage.** `endGameWithResult` only records when `game.mode === 'daily' && game.date`. Random mode's score screen will show `streak` (from the cached `stats`) but `isNewBest` will always be `false`.
- **Subset enumeration is exponential and capped.** Both `anagramRules.canFormWord` and `scoring.hasLoosePoolAnagram` enumerate subsets via bitmask; `canFormWord` short-circuits to `letters-unavailable` when `pool.words.length > 16`, and `hasLoosePoolAnagram` caps loose-letter subset size at `MAX_LOOSE_SUBSET = 8`.
- **Pool word `parents` are the share-text input.** [`src/share.js`](@/src/share.js)'s emoji grid relies on each history entry's `parents` array (set by `submitWord` from the consumed words). If `parents` were empty, every tile in that word would render as green (newly added).
- **Schema versioning is strict-equal.** Any future change to the record shape must bump `SCHEMA_VERSION` in [`src/storage.js`](@/src/storage.js); old data will then be silently treated as empty rather than migrated.

Created and maintained by Nori.
