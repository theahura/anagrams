<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { drawTile, submitWord, endGame } from '../game.js';
import { finalScore } from '../scoring.js';

const props = defineProps({
  initialGame: { type: Object, required: true },
  dict: { type: Object, required: true },
});
const emit = defineEmits(['end']);

const game = ref(props.initialGame);
const typed = ref('');
const feedback = ref(null);
const elapsedMs = ref(0);
let timerHandle = null;

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
    typed.value = '';
  } else {
    feedback.value = { type: 'error', text: reasonText(result.reason) };
  }
}

function onDraw() {
  const next = drawTile(game.value, props.dict);
  game.value = next;
  feedback.value = null;
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
      return 'That is the same word that is already on the table.';
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
      <span id="timer">{{ formatTime(elapsedMs) }}</span>
      <span class="score">Score: {{ score }}</span>
    </div>

    <div class="section-label">Face-up tiles · {{ faceDownCount }} face-down</div>
    <div class="tile-rack">
      <span v-for="(letter, i) in looseLetters" :key="`l${i}`" class="tile offered">{{ letter }}</span>
      <span v-if="looseLetters.length === 0" class="empty-note">No tiles yet — draw to start.</span>
    </div>

    <div class="section-label">Your words</div>
    <div class="words-list">
      <div v-if="playerWords.length === 0" class="empty-note">No words yet.</div>
      <div v-for="(w, i) in playerWords" :key="`w${i}`" class="word-row">
        <span v-for="(ch, j) in w.word.split('')" :key="`c${j}`" class="tile">{{ ch }}</span>
      </div>
    </div>

    <form class="word-input" @submit.prevent="onSubmit">
      <input
        v-model="typed"
        class="text-input"
        placeholder="Type a word…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @input="clearFeedback"
      />
      <button type="submit" class="action-btn primary">Submit</button>
    </form>

    <div v-if="feedback" :class="['feedback', feedback.type]">
      {{ feedback.text }}
    </div>

    <div class="game-actions">
      <button class="action-btn" :disabled="!canDraw" @click="onDraw">
        Draw tile ({{ faceDownCount }})
      </button>
      <button class="action-btn danger" @click="onEndGame">End game</button>
    </div>
  </section>
</template>
