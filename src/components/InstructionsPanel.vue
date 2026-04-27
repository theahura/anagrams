<script setup>
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue';

const emit = defineEmits(['close']);
const closeBtnRef = ref(null);

function onDocKeydown(ev) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.isComposing || ev.repeat) return;
  if (ev.key === 'Escape' || ev.key === 'Enter') {
    ev.preventDefault();
    emit('close');
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onDocKeydown);
  await nextTick();
  closeBtnRef.value?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="instructions-overlay" @click.self="$emit('close')">
      <div
        class="instructions-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instructions-title"
        tabindex="-1"
      >
        <button
          ref="closeBtnRef"
          type="button"
          class="instructions-close"
          data-testid="close-instructions"
          aria-label="Close how to play"
          @click="$emit('close')"
        >×</button>

        <h2 id="instructions-title">How to play</h2>

        <p>
          Three tiles start <strong>face up</strong>. Each turn, build a word from the face-up letters or draw a new tile.
        </p>
        <p>
          You can <strong>steal</strong> an existing word by using <em>all</em> its letters plus at least one new tile, rearranged into a new word.
        </p>

        <div class="instructions-example">
          <div class="instructions-example-label">Example</div>
          <div class="instructions-example-row">
            <span class="tile">C</span>
            <span class="tile">A</span>
            <span class="tile">T</span>
            <span class="instructions-example-plus">+</span>
            <span class="tile offered">R</span>
          </div>
          <div class="instructions-example-arrow">↓</div>
          <div class="instructions-example-answer">CART</div>
          <p class="instructions-example-note">
            But <strong>CATS</strong> would not count — simply adding letters like &ldquo;s&rdquo; to make a plural is a trivial inflection.
          </p>
        </div>

        <ul>
          <li>A new puzzle every day.</li>
          <li>Long words score more.</li>
          <li>Drawing when an obvious word is on the board costs you points.</li>
          <li>Anagrams must <strong>rearrange</strong> letters — no trivial inflections.</li>
          <li>A <strong>ghost</strong> watches the board and will snatch your words every now and then — steal them back to keep them.</li>
        </ul>

        <p class="instructions-hint">
          Press <kbd>Enter</kbd> or <kbd>Esc</kbd> to start.
        </p>
      </div>
    </div>
  </Teleport>
</template>
