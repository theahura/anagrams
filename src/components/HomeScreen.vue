<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  loading: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  best: { type: Number, default: 0 },
  completedToday: { type: Boolean, default: false },
  recent: { type: Array, default: () => [] },
});
defineEmits(['start']);

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const POPOVER_ID = 'home-day-popover';
const PANEL_W = 220;

const selectedIndex = ref(null);
const panelPos = ref({ top: 0, left: 0 });
const cellRefs = ref([]);
const panelRef = ref(null);

function setCellRef(i) {
  return (el) => {
    cellRefs.value[i] = el;
  };
}

const selectedEntry = computed(() => {
  if (selectedIndex.value === null) return null;
  return props.recent[selectedIndex.value] ?? null;
});

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

function formatDuration(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function computePosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const viewportW = window.innerWidth || document.documentElement.clientWidth;
  const rawLeft = rect.left + rect.width / 2 - PANEL_W / 2;
  const left = Math.max(8, Math.min(rawLeft, viewportW - PANEL_W - 8));
  return { top: rect.bottom + 8, left };
}

let restoreFocusOnClose = true;

function onCellClick(i, ev) {
  panelPos.value = computePosition(ev.currentTarget);
  selectedIndex.value = i;
}

function closePopover({ restoreFocus = true } = {}) {
  restoreFocusOnClose = restoreFocus;
  selectedIndex.value = null;
}

function onDocMousedown(ev) {
  if (selectedIndex.value === null) return;
  const path = ev.composedPath ? ev.composedPath() : [];
  if (panelRef.value && path.includes(panelRef.value)) return;
  for (const el of cellRefs.value) {
    if (el && path.includes(el)) return;
  }
  closePopover({ restoreFocus: false });
}

function onDocKeydown(ev) {
  if (selectedIndex.value === null) return;
  if (ev.key === 'Escape') closePopover();
}

watch(selectedIndex, async (val, prev) => {
  if (val !== null) {
    document.addEventListener('mousedown', onDocMousedown);
    document.addEventListener('keydown', onDocKeydown);
    await nextTick();
    panelRef.value?.focus();
  } else {
    document.removeEventListener('mousedown', onDocMousedown);
    document.removeEventListener('keydown', onDocKeydown);
    if (restoreFocusOnClose && prev !== null && cellRefs.value[prev]) {
      cellRefs.value[prev].focus();
    }
    restoreFocusOnClose = true;
  }
});

watch(
  () => props.recent,
  () => {
    if (selectedIndex.value !== null) {
      closePopover({ restoreFocus: false });
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMousedown);
  document.removeEventListener('keydown', onDocKeydown);
});
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
        <button
          v-if="entry.played"
          type="button"
          :ref="setCellRef(i)"
          class="home-calendar-cell played"
          :class="{ today: i === recent.length - 1 }"
          :aria-label="cellLabel(entry, i === recent.length - 1)"
          :title="cellLabel(entry, i === recent.length - 1)"
          aria-haspopup="dialog"
          :aria-expanded="(selectedIndex === i).toString()"
          :aria-controls="POPOVER_ID"
          @click="onCellClick(i, $event)"
        ></button>
        <div
          v-else
          class="home-calendar-cell"
          role="img"
          :class="{ today: i === recent.length - 1 }"
          :aria-label="cellLabel(entry, i === recent.length - 1)"
          :title="cellLabel(entry, i === recent.length - 1)"
        ></div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="selectedEntry"
        :id="POPOVER_ID"
        ref="panelRef"
        class="day-popover"
        role="dialog"
        aria-modal="false"
        aria-labelledby="day-popover-title"
        tabindex="-1"
        :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
      >
        <button
          type="button"
          class="day-popover-close"
          aria-label="Close"
          @click="closePopover"
        >×</button>
        <h3 id="day-popover-title" class="day-popover-title">
          {{ humanDate(selectedEntry.date) }}
        </h3>
        <div class="day-popover-row">
          <span class="day-popover-label">Score</span>
          <span class="day-popover-value">{{ selectedEntry.record?.score ?? 0 }}</span>
        </div>
        <div class="day-popover-row">
          <span class="day-popover-label">Longest</span>
          <span class="day-popover-value">{{ selectedEntry.record?.longestWord || '—' }}</span>
        </div>
        <div class="day-popover-row">
          <span class="day-popover-label">Time</span>
          <span class="day-popover-value">{{ formatDuration(selectedEntry.record?.durationMs) }}</span>
        </div>
      </div>
    </Teleport>

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
