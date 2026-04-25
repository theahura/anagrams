Anagrams is a word game inspired by the game 'Snatch'.
Anagrams is structured as a single player game.
There are a set of 144 letter tiles. Each tile has a single letter on it. The tiles are weighted by the frequency of appearance in the game 'Banangrams'.
There are three 'pools' where a tile can be.
  - Face down / hidden. All letters start here.
  - Face up, not part of a word. Letters are moved here from their face down state one by one.
  - Face up, part of a word. The player can form a word with letters. These live on the 'table' in front of the player.

When the game starts, three tiles are revealed randomly from the face down pool.

Play advances in a series of 'rounds'.

Each 'round', a player can either:
  - create a word using some combination of the letters that are face up, including their own preexisting words.
  - choose to get a new letter. This ends the current round.

There are several restrictions on valid words that can be created.
  - All words must be at least three letters.
  - All words must be in the scrabble dictionary.
  - Any word created with any pre-existing word must use all the letters in the preexisting word.

<example>
Face up letter: B
Existing word: Rook
Valid anagram: 'Brook'
Invalid anagram: 'Book' (does not use the 'r')
</example>

  - Any word created with any pre-existing word cannot be a trivial addition.

<example>
Face up letter: S
Existing word: Nub
Valid anagram: 'Snub'
Invalid anagram: 'Nubs' (is not a true anagram)
</example>

  - No curse words allowed.

<system-note> For the implementation on whether or not a word is valid, reuse the implementation in ~/code/games/reword/** </system-note>

Players are given a final score based on their play. We want to reward players for making long words. We want to penalize players for asking for new letters when existing anagrams exist on the board. Come up with an implementation of a scoring algorithm that addresses this need.

There should be two modes for the game.
- Daily Challenge
- Random Trial
In the former, a random seed is selected based on the day, and every player gets the same order of random letter flips.
In the latter, the player just gets a fully random game.

At the end of each, a final score page is shown. This page should include:
- the total player time
- the final score
- the player's longest word and the sequence of letters it took to get there
(e.g. fine --> refine --> redefine --> defriended)
- a 'share' button (come up with something clever that we can use that is wordle style. You can also look at reword for an example)

Reuse the styling and branding from ~/code/games/reword/**, especially the css on the tiles.
