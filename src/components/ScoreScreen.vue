<script setup>
import { ref } from 'vue';
import { generateShareText } from '../share.js';

const props = defineProps({
  result: { type: Object, required: true },
  mode: { type: String, required: true },
  date: { type: String, default: null },
  streak: { type: Number, default: 0 },
  isNewBest: { type: Boolean, default: false },
});
defineEmits(['home']);

const copied = ref(false);

async function onShare() {
  const text = generateShareText({
    mode: props.mode,
    date: props.date,
    score: props.result.score,
    longestWord: props.result.longestWord,
    totalTimeMs: props.result.totalTimeMs,
    history: props.result.history,
    streak: props.streak,
  });
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    window.prompt('Copy your result:', text);
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
  <section class="score-screen">
    <h2>Game over</h2>

    <div class="score-grid">
      <div class="score-cell">
        <div class="score-label">Final score</div>
        <div class="score-value">{{ result.score }}</div>
      </div>
      <div class="score-cell">
        <div class="score-label">Total time</div>
        <div class="score-value">{{ formatTime(result.totalTimeMs) }}</div>
      </div>
      <div class="score-cell">
        <div class="score-label">Words</div>
        <div class="score-value">{{ result.words.length }}</div>
      </div>
      <div class="score-cell">
        <div class="score-label">Missed draws</div>
        <div class="score-value">{{ result.missedDrawCount }}</div>
      </div>
    </div>

    <div v-if="mode === 'daily' && (streak > 0 || isNewBest)" class="score-streak-row">
      <span v-if="streak > 0" class="score-streak">Streak <strong>{{ streak }}</strong></span>
      <span v-if="isNewBest" class="new-best-pill">New best!</span>
    </div>

    <div v-if="result.longestWord" class="longest-section">
      <div class="section-label">Longest word</div>
      <div class="chain">
        <template v-for="(w, i) in result.longestChain" :key="i">
          <span class="chain-word">
            <span v-for="(ch, j) in w.split('')" :key="j" class="tile">{{ ch }}</span>
          </span>
          <span v-if="i < result.longestChain.length - 1" class="chain-arrow">→</span>
        </template>
      </div>
    </div>

    <div class="score-actions">
      <button class="action-btn primary" @click="onShare">
        {{ copied ? 'Copied!' : 'Share' }}
      </button>
      <button class="action-btn" @click="$emit('home')">Home</button>
    </div>
  </section>
</template>
