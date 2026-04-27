<script setup>
import { computed, ref } from 'vue';
import {
  generateShareText,
  generateShareAltText,
  shareOrCopy,
} from '../share.js';

const props = defineProps({
  result: { type: Object, required: true },
  mode: { type: String, required: true },
  date: { type: String, default: null },
  streak: { type: Number, default: 0 },
});
defineEmits(['home']);

const copied = ref(false);
const copiedAlt = ref(false);

const canCopyAlt = computed(() => {
  const h = props.result?.history;
  return Array.isArray(h) && h.length > 0;
});

function buildShareArgs() {
  return {
    mode: props.mode,
    date: props.date,
    longestWord: props.result.longestWord,
    totalTimeMs: props.result.totalTimeMs,
    history: props.result.history,
    streak: props.streak,
  };
}

async function onShare() {
  const text = generateShareText(buildShareArgs());
  const outcome = await shareOrCopy(text);
  if (outcome === 'copied') {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}

async function onCopyAltText() {
  const text = generateShareAltText(buildShareArgs());
  try {
    await navigator.clipboard.writeText(text);
    copiedAlt.value = true;
    setTimeout(() => (copiedAlt.value = false), 2000);
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
  <section class="results-screen">
    <h2>Game over</h2>

    <div class="results-grid">
      <div class="results-cell">
        <div class="results-label">Total time</div>
        <div class="results-value">{{ formatTime(result.totalTimeMs) }}</div>
      </div>
      <div class="results-cell">
        <div class="results-label">Words</div>
        <div class="results-value">{{ result.words.length }}</div>
      </div>
    </div>

    <div v-if="mode === 'daily' && streak > 0" class="results-streak-row">
      <span class="results-streak">Streak <strong>{{ streak }}</strong></span>
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

    <div class="results-actions">
      <button class="action-btn primary" @click="onShare">
        {{ copied ? 'Copied!' : 'Share' }}
      </button>
      <button
        v-if="canCopyAlt"
        class="action-btn"
        @click="onCopyAltText"
      >
        {{ copiedAlt ? 'Copied!' : 'Copy alt text' }}
      </button>
      <button class="action-btn" @click="$emit('home')">Home</button>
    </div>
  </section>
</template>
