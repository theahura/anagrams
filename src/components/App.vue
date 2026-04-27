<script setup>
import { ref, shallowRef } from 'vue';
import HomeScreen from './HomeScreen.vue';
import GameScreen from './GameScreen.vue';
import ResultsScreen from './ResultsScreen.vue';
import { loadDictionary } from '../dictionary.js';
import { createGame } from '../game.js';
import {
  loadStore,
  recordDailyResult,
  currentStreak,
  hasCompletedDate,
  recentDays,
  browserStorage,
} from '../storage.js';
import { todayLocal } from '../dateKey.js';

const screen = ref('home');
const game = shallowRef(null);
const finalResult = ref(null);
const dict = shallowRef(null);
const dictLoading = ref(false);
const dictError = ref(null);

const storage = browserStorage();
const stats = ref(computeStats());

function computeStats() {
  const today = todayLocal();
  const { records } = loadStore(storage);
  return {
    streak: currentStreak(records, today),
    completedToday: hasCompletedDate(records, today),
    recent: recentDays(records, today, 7),
  };
}

async function ensureDictionary() {
  if (dict.value) return dict.value;
  dictLoading.value = true;
  try {
    const dictUrl = new URL('../../data/dictionary.json', import.meta.url);
    const lemmasUrl = new URL('../../data/lemmas.json', import.meta.url);
    const [dictRes, lemmasRes] = await Promise.all([
      fetch(dictUrl),
      fetch(lemmasUrl),
    ]);
    if (!dictRes.ok) throw new Error(`dictionary HTTP ${dictRes.status}`);
    if (!lemmasRes.ok) throw new Error(`lemmas HTTP ${lemmasRes.status}`);
    const [dictJson, lemmasJson] = await Promise.all([
      dictRes.json(),
      lemmasRes.json(),
    ]);
    dict.value = loadDictionary(dictJson, lemmasJson);
    return dict.value;
  } catch (err) {
    dictError.value = err.message;
    return null;
  } finally {
    dictLoading.value = false;
  }
}

async function startGame(mode) {
  const d = await ensureDictionary();
  if (!d) return;
  const date = todayLocal();
  game.value = createGame({ mode, date }, d);
  screen.value = 'game';
}

function endGameWithResult(result) {
  finalResult.value = result;
  if (game.value?.mode === 'daily' && game.value?.date) {
    recordDailyResult(storage, {
      date: game.value.date,
      longestWord: result.longestWord,
      durationMs: result.totalTimeMs,
      history: result.history,
    });
    stats.value = computeStats();
  }
  screen.value = 'results';
}

function returnHome() {
  game.value = null;
  finalResult.value = null;
  stats.value = computeStats();
  screen.value = 'home';
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
      :streak="stats.streak"
      :completed-today="stats.completedToday"
      :recent="stats.recent"
      @start="startGame"
    />

    <GameScreen
      v-else-if="screen === 'game' && game"
      :initial-game="game"
      :dict="dict"
      @end="endGameWithResult"
    />

    <ResultsScreen
      v-else-if="screen === 'results' && finalResult"
      :result="finalResult"
      :mode="game.mode"
      :date="game.date"
      :streak="stats.streak"
      @home="returnHome"
    />
  </div>
</template>
