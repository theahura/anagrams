<script setup>
import { ref, shallowRef } from 'vue';
import HomeScreen from './HomeScreen.vue';
import GameScreen from './GameScreen.vue';
import ScoreScreen from './ScoreScreen.vue';
import { loadDictionary } from '../dictionary.js';
import { createGame } from '../game.js';

const screen = ref('home');
const game = shallowRef(null);
const finalResult = ref(null);
const dict = shallowRef(null);
const dictLoading = ref(false);
const dictError = ref(null);

async function ensureDictionary() {
  if (dict.value) return dict.value;
  dictLoading.value = true;
  try {
    const url = new URL('../../data/dictionary.json', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    dict.value = loadDictionary(json);
    return dict.value;
  } catch (err) {
    dictError.value = err.message;
    throw err;
  } finally {
    dictLoading.value = false;
  }
}

async function startGame(mode) {
  const d = await ensureDictionary();
  const date = todayUTC();
  game.value = createGame({ mode, date }, d);
  screen.value = 'game';
}

function endGameWithResult(result) {
  finalResult.value = result;
  screen.value = 'score';
}

function returnHome() {
  game.value = null;
  finalResult.value = null;
  screen.value = 'home';
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
</script>

<template>
  <div id="game-container">
    <header>
      <h1>Anagrams</h1>
    </header>

    <div v-if="dictError" class="error-banner">
      Failed to load dictionary: {{ dictError }}
    </div>

    <HomeScreen
      v-if="screen === 'home'"
      :loading="dictLoading"
      @start="startGame"
    />

    <GameScreen
      v-else-if="screen === 'game' && game"
      :initial-game="game"
      :dict="dict"
      @end="endGameWithResult"
    />

    <ScoreScreen
      v-else-if="screen === 'score' && finalResult"
      :result="finalResult"
      :mode="game.mode"
      :date="game.date"
      @home="returnHome"
    />
  </div>
</template>
