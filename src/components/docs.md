# Noridoc: components

Path: @/src/components

### Overview

- Vue 3 SFC layer for the Anagrams SPA. Three screen components (`HomeScreen`, `GameScreen`, `ScoreScreen`) plus the orchestrator (`App.vue`).
- Components are presentational — game state lives in domain modules under [`src/`](@/src), and persistence lives in [`src/storage.js`](@/src/storage.js). Components receive data via props and emit user intent via events.

### How it fits into the larger codebase

- [`src/components/App.vue`](@/src/components/App.vue) is the only file in the project that imports both [`src/storage.js`](@/src/storage.js) and the domain modules. It is the integration boundary between persistence, domain, and UI.
- Screen routing is a single `screen` ref (`'home' | 'game' | 'score'`) in `App.vue`. There is no router. Transitions between screens are the only points where stats are recomputed.
- `GameScreen` mutates the game by calling [`src/game.js`](@/src/game.js)'s pure functions (`drawTile`, `submitWord`) and re-binding the result locally; `App.vue` only learns the final result via the `end` event.
- `ScoreScreen` is the only consumer of [`src/share.js`](@/src/share.js). It assembles the `generateShareText` argument from its props (including the `streak` passed down from `App.vue`).

### Core Implementation

- **App.vue — orchestrator.** Owns `screen`, `game` (`shallowRef`), `finalResult`, `dict` (lazy-loaded), `stats` (`{ streak, best, completedToday }`), and `isNewBest`. `computeStats()` reads storage via `loadStore(browserStorage())` and derives the three values. Stats are recomputed on transitions to `home` (`returnHome`) and on score-screen entry (`endGameWithResult`).
- **App.vue — daily recording flow.** `endGameWithResult` only writes for `mode === 'daily'`: it snapshots the previous `bestScore` *before* calling `recordDailyResult`, then sets `isNewBest = wasNewRecord && result.score > previousBest`. This ordering is required because `recordDailyResult` is keep-first and returns `wasNewRecord: false` for replays.
- **App.vue — date convention.** `todayUTC()` returns `new Date().toISOString().slice(0, 10)` and is used both as the daily-mode `date` passed to `createGame` and as the storage record key, keeping the PRNG seed and storage key aligned.
- **HomeScreen.** Receives `loading`, `streak`, `best`, `completedToday` props. Renders a stats row only when `streak > 0 || best > 0` (so first-time players see a clean home). Shows a `✓ Played today` sub-label on the Daily button when `completedToday` is true. Emits `start` with `'daily'` or `'random'`.
- **GameScreen.** Holds a local mutable game ref, calls domain `submitWord` / `drawTile` to advance, and emits `end` with the `result` from `endGame` when the face-down pile is exhausted.
- **ScoreScreen.** Receives `result`, `mode`, `date`, `streak`, `isNewBest`. Renders a streak/new-best row only when `mode === 'daily' && (streak > 0 || isNewBest)`. The Share button calls `generateShareText` with `streak` so the share footer can append ` · Streak <N>` (only when `mode === 'daily' && streak ≥ 2`, enforced inside [`src/share.js`](@/src/share.js)). Falls back to `window.prompt` when `navigator.clipboard.writeText` rejects.

### Things to Know

- **`stats.streak` is the snapshot at score-screen entry, not pre-game.** When `endGameWithResult` runs, it calls `recordDailyResult` and then recomputes `stats`, so the streak shown on the score screen (and in the share text) reflects the just-finished play.
- **Random mode shows cached stats.** `ScoreScreen` is rendered with the same `stats.streak` regardless of mode, but the streak/new-best row is gated on `mode === 'daily'`. The share footer is gated identically inside `share.js`.
- **`isNewBest` resets on every transition.** `startGame`, `endGameWithResult`, and `returnHome` all reset `isNewBest` (the first two implicitly via the `bestScore` comparison, `returnHome` explicitly). It is only true on the score screen immediately after a daily play that beat the previous best.
- **Replays of a completed daily.** Because `recordDailyResult` is keep-first per date, a second daily play on the same UTC day returns `wasNewRecord: false`, `isNewBest` stays `false`, and `bestScore` reflects the *first* play's score even if the replay was higher.
- **Dictionary load is lazy and one-shot.** `ensureDictionary` caches `dict.value` and is awaited inside `startGame`. Failures surface via the `dictError` banner; the home buttons stay enabled but `startGame` will reject. There is no retry UI.
- **`shallowRef(game)` is intentional.** The game object is replaced wholesale by domain functions returning new objects; deep reactivity is unnecessary and would be wasteful given the immutable update pattern.
- **No event bus, no provide/inject.** All cross-screen state flows through `App.vue` props/events. Adding any new persisted value means updating `computeStats`, the `stats` ref shape, and the relevant screen's props.

Created and maintained by Nori.
