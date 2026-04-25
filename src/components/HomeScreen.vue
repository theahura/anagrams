<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  best: { type: Number, default: 0 },
  completedToday: { type: Boolean, default: false },
  recent: { type: Array, default: () => [] },
});
defineEmits(['start']);

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function weekdayLetter(dateStr) {
  return WEEKDAY_LETTERS[parseDate(dateStr).getUTCDay()];
}

function humanDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function cellLabel(entry, isToday) {
  const human = humanDate(entry.date);
  if (isToday) {
    return entry.played
      ? `Today, score ${entry.record?.score ?? 0}, ${human}`
      : `Today, not played yet, ${human}`;
  }
  return entry.played
    ? `Score ${entry.record?.score ?? 0}, ${human}`
    : `Not played, ${human}`;
}
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

    <div
      v-if="recent.some(e => e.played)"
      class="home-calendar"
      role="group"
      aria-label="Last 7 days activity"
    >
      <div
        v-for="(entry, i) in recent"
        :key="entry.date"
        class="home-calendar-day"
      >
        <span class="home-calendar-letter">{{ weekdayLetter(entry.date) }}</span>
        <div
          class="home-calendar-cell"
          role="img"
          :class="{ played: entry.played, today: i === recent.length - 1 }"
          :aria-label="cellLabel(entry, i === recent.length - 1)"
          :title="cellLabel(entry, i === recent.length - 1)"
        ></div>
      </div>
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
