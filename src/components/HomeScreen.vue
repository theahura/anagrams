<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  best: { type: Number, default: 0 },
  completedToday: { type: Boolean, default: false },
});
defineEmits(['start']);
</script>

<template>
  <section class="home">
    <p class="home-tagline">
      Flip letters. Build words. Anagram them into longer ones.
    </p>

    <div class="home-buttons">
      <button
        class="mode-btn"
        :disabled="loading"
        @click="$emit('start', 'daily')"
      >
        <span class="mode-title">Daily Challenge</span>
        <span class="mode-sub">
          Same shuffle for everyone today
          <span v-if="completedToday" class="played-today-tag">✓ Played today</span>
        </span>
      </button>

      <button
        class="mode-btn"
        :disabled="loading"
        @click="$emit('start', 'random')"
      >
        <span class="mode-title">Random Trial</span>
        <span class="mode-sub">A fresh shuffle every time</span>
      </button>
    </div>

    <div v-if="streak > 0 || best > 0" class="home-stats">
      <span class="home-stat">Streak <strong>{{ streak }}</strong></span>
      <span class="home-stat">Best <strong>{{ best }}</strong></span>
    </div>

    <p v-if="loading" class="home-loading">Loading dictionary…</p>

    <section class="rules">
      <h2>How to play</h2>
      <ul>
        <li>Three tiles start face up.</li>
        <li>Each turn, build a word from face-up letters or draw a new tile.</li>
        <li>Combine your existing words by using <em>all</em> their letters.</li>
        <li>Long words score more — but drawing when an obvious word is on the board costs you points.</li>
      </ul>
    </section>
  </section>
</template>
