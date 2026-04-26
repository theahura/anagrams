<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { drawTile, submitWord, endGame } from '../game.js';
import { finalScore } from '../scoring.js';
import { highlightConsumption } from '../staging.js';

const props = defineProps({
  initialGame: { type: Object, required: true },
  dict: { type: Object, required: true },
});
const emit = defineEmits(['end']);

const game = ref(props.initialGame);
const trail = ref([]);
const feedback = ref(null);
const elapsedMs = ref(0);
const inputRef = ref(null);
let timerHandle = null;

const typed = computed({
  get: () => trail.value.map((e) => e.letter).join(''),
  set: (v) => {
    const next = String(v ?? '');
    const prev = trail.value.map((e) => e.letter).join('');
    if (next === prev) return;
    if (next.length > prev.length && next.startsWith(prev)) {
      const added = next.slice(prev.length);
      const out = [...trail.value];
      for (const ch of added) out.push({ kind: 'typed', letter: ch });
      trail.value = out;
      return;
    }
    if (next.length < prev.length && prev.startsWith(next)) {
      const removed = prev.length - next.length;
      trail.value = trail.value.slice(0, trail.value.length - removed);
      return;
    }
    trail.value = next.split('').map((ch) => ({ kind: 'typed', letter: ch }));
  },
});

function refocusInput() {
  inputRef.value?.focus();
}

function tileLabel(letter, i) {
  const claimed = consumption.value.loose.has(i) ? ', claimed' : '';
  return `Tile ${letter}${claimed}`;
}

function wordLabel(w, i) {
  const claimed = consumption.value.words.has(i) ? ', claimed' : '';
  return `Word ${w.word}, ${w.word.length} letters${claimed}`;
}

const score = computed(() =>
  finalScore({
    words: game.value.history,
    missedDrawCount: game.value.missedDrawCount,
  })
);

const looseLetters = computed(() => game.value.pool.looseLetters);
const playerWords = computed(() => game.value.pool.words);
const faceDownCount = computed(() => game.value.pool.faceDown.length);
const canDraw = computed(() => faceDownCount.value > 0);

const consumption = computed(() =>
  highlightConsumption(typed.value, game.value.pool, trail.value)
);

function findIdentityIndex(predicate) {
  for (let i = 0; i < trail.value.length; i++) {
    if (predicate(trail.value[i])) return i;
  }
  return -1;
}

function spliceTrail(indices) {
  const drop = new Set(indices);
  trail.value = trail.value.filter((_, idx) => !drop.has(idx));
}

function removeFirstTypedLetter(letter) {
  const target = letter.toLowerCase();
  const idx = findIdentityIndex(
    (e) => e.kind === 'typed' && e.letter.toLowerCase() === target
  );
  if (idx === -1) return false;
  spliceTrail([idx]);
  return true;
}

function onTileClick(i) {
  const idIdx = findIdentityIndex(
    (e) => e.kind === 'loose' && e.sourceIndex === i
  );
  if (idIdx !== -1) {
    spliceTrail([idIdx]);
  } else if (consumption.value.loose.has(i)) {
    removeFirstTypedLetter(looseLetters.value[i]);
  } else {
    trail.value = [
      ...trail.value,
      { kind: 'loose', sourceIndex: i, letter: looseLetters.value[i] },
    ];
  }
  clearFeedback();
  refocusInput();
}

function onWordClick(i) {
  const idIndices = [];
  for (let k = 0; k < trail.value.length; k++) {
    if (trail.value[k].kind === 'word' && trail.value[k].sourceIndex === i) {
      idIndices.push(k);
    }
  }
  if (idIndices.length > 0) {
    spliceTrail(idIndices);
  } else if (consumption.value.words.has(i)) {
    for (const ch of playerWords.value[i].word) removeFirstTypedLetter(ch);
  } else {
    const additions = playerWords.value[i].word
      .split('')
      .map((ch) => ({ kind: 'word', sourceIndex: i, letter: ch }));
    trail.value = [...trail.value, ...additions];
  }
  clearFeedback();
  refocusInput();
}

function onClear() {
  trail.value = [];
  clearFeedback();
  refocusInput();
}

function tick() {
  elapsedMs.value = Date.now() - game.value.startTime;
}

onMounted(() => {
  tick();
  timerHandle = setInterval(tick, 1000);
});

onUnmounted(() => {
  if (timerHandle) clearInterval(timerHandle);
});

function clearFeedback() {
  feedback.value = null;
}

function onSubmit() {
  const word = typed.value.trim().toLowerCase();
  if (!word) return;
  const result = submitWord(game.value, word, props.dict);
  if (result.ok) {
    game.value = result.game;
    feedback.value = { type: 'success', text: `Played "${word}"` };
    trail.value = [];
  } else {
    feedback.value = { type: 'error', text: reasonText(result.reason) };
  }
}

function onDraw() {
  const prevMissed = game.value.missedDrawCount;
  const next = drawTile(game.value, props.dict);
  game.value = next;
  if (next.missedDrawCount > prevMissed) {
    feedback.value = {
      type: 'warning',
      text: 'Penalty: a word was available. −10 points.',
    };
  } else {
    feedback.value = null;
  }
  if (next.ended) {
    finishGame();
  }
}

function onEndGame() {
  finishGame();
}

function finishGame() {
  if (timerHandle) clearInterval(timerHandle);
  const result = endGame(game.value, Date.now());
  emit('end', result);
}

function reasonText(reason) {
  switch (reason) {
    case 'too-short':
      return 'Words must be at least three letters.';
    case 'not-a-word':
      return 'Not in the scrabble dictionary.';
    case 'profane':
      return 'No profanity.';
    case 'letters-unavailable':
      return 'You do not have those letters.';
    case 'trivial-inflection':
      return 'Anagrams must rearrange letters — no trivial inflections.';
    case 'no-new-play':
      return 'Steals must add a new letter — you can’t just rearrange an existing word.';
    default:
      return 'Invalid word.';
  }
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>

<template>
  <section class="game">
    <div class="game-info">
      <span class="meta">{{ game.mode === 'daily' ? `Daily ${game.date}` : 'Random' }}</span>
      <span id="timer" aria-live="off">{{ formatTime(elapsedMs) }}</span>
      <span class="score">Score: {{ score }}</span>
    </div>

    <div class="section-label">Face-up tiles · {{ faceDownCount }} face-down</div>
    <div class="tile-rack">
      <button
        v-for="(letter, i) in looseLetters"
        :key="`l${i}`"
        type="button"
        :class="['tile', 'offered', 'clickable', { used: consumption.loose.has(i) }]"
        :aria-label="tileLabel(letter, i)"
        @mousedown.prevent
        @click="onTileClick(i)"
      >{{ letter }}</button>
      <span v-if="looseLetters.length === 0" class="empty-note">No tiles yet — draw to start.</span>
    </div>

    <div class="section-label">Your words</div>
    <div class="words-list">
      <div v-if="playerWords.length === 0" class="empty-note">No words yet.</div>
      <button
        v-for="(w, i) in playerWords"
        :key="`w${i}`"
        type="button"
        :class="['word-row', 'clickable', { consumed: consumption.words.has(i) }]"
        :aria-label="wordLabel(w, i)"
        @mousedown.prevent
        @click="onWordClick(i)"
      >
        <span v-for="(ch, j) in w.word.split('')" :key="`c${j}`" class="tile" aria-hidden="true">{{ ch }}</span>
      </button>
    </div>

    <form class="word-input" @submit.prevent="onSubmit">
      <label for="word-input-field" class="sr-only">Type a word</label>
      <input
        id="word-input-field"
        ref="inputRef"
        v-model="typed"
        class="text-input"
        placeholder="Type a word…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @input="clearFeedback"
      />
      <button type="button" class="action-btn" :disabled="!typed" @click="onClear">Clear</button>
      <button type="submit" class="action-btn primary">Submit</button>
    </form>

    <div
      class="feedback"
      :class="feedback ? feedback.type : 'feedback-empty'"
      role="status"
      aria-atomic="true"
    >
      {{ feedback ? feedback.text : '' }}
    </div>

    <div class="game-actions">
      <button class="action-btn" :disabled="!canDraw" @click="onDraw">
        Draw tile ({{ faceDownCount }})
      </button>
      <button class="action-btn danger" @click="onEndGame">End game</button>
    </div>
  </section>
</template>
