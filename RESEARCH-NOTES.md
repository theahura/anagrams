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
