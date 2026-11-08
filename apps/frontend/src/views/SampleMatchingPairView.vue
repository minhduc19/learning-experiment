<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import sampleActivity from '../data/matchingPairs.json'
const props = defineProps({ activity: {type:Object,default:()=>sampleActivity}, lessonMode:Boolean })
const activity = props.activity
const emit = defineEmits(['completed'])
import { useMatchingPairs } from '../composables/useMatchingPairs.js'

const { columns, selected, matched, mismatch, complete, choose, clearMismatch, restart, total } = useMatchingPairs(activity.pairs)
const showSummary = ref(false)
const heading = ref(null)
const status = ref('Select a word, then its translation. You can start in either column.')
const rows = computed(() => columns.value[0].map((card, index) => [card, columns.value[1][index]]))
let mismatchTimer

function tap(card) {
  choose(card)
  if (mismatch.value.length) {
    status.value = 'Those don’t match. Try another pair.'
    clearTimeout(mismatchTimer)
    mismatchTimer = setTimeout(clearMismatch, 850)
  } else if (complete.value) {
    status.value = 'All pairs matched! Continue to see your results.'
  } else if (matched.value.includes(card.pairId)) {
    status.value = `Correct! ${matched.value.length} of ${total} pairs matched.`
  } else {
    status.value = selected.value ? 'Now tap its translation in the other column.' : 'Select a word, then its translation.'
  }
}

async function finish() {
  if (props.lessonMode) { emit('completed', {pair_ids:[...matched.value]}); return }
  showSummary.value = true
  await nextTick()
  heading.value?.focus()
}

async function startAgain() {
  clearTimeout(mismatchTimer)
  restart()
  showSummary.value = false
  status.value = 'Select a word, then its translation. You can start in either column.'
  await nextTick()
  heading.value?.focus()
}
onBeforeUnmount(() => clearTimeout(mismatchTimer))
</script>

<template>
  <main class="activity activity-screen matching-activity">
    <div class="activity-screen-progress">
      <div class="activity-topline">
        <span class="activity-eyebrow">DAILY PRACTICE</span>
        <span>{{ matched.length }} / {{ total }}</span>
      </div>
      <progress class="activity-progress" :value="matched.length" :max="total" aria-label="Pairs matched" />
    </div>

    <section v-if="showSummary" class="activity-finish">
      <div class="activity-mascot" aria-hidden="true">★</div>
      <p class="activity-eyebrow">ACTIVITY COMPLETE</p>
      <h1 ref="heading" class="activity-title" tabindex="-1">You did it!</h1>
      <p>You matched all {{ total }} pairs. A little practice goes a long way.</p>
      <button class="button activity-action" @click="startAgain">Practice again</button>
    </section>

    <section v-else class="activity-screen-question" aria-labelledby="matching-heading">
      <div class="activity-mascot" aria-hidden="true">✦</div>
      <p class="activity-eyebrow">{{ activity.title }}</p>
      <h1 id="matching-heading" ref="heading" class="activity-title" tabindex="-1">{{ activity.instruction }}</h1>
      <p class="activity-hint">Match each word with its translation. Start in either column.</p>
      <div class="matching-grid" role="group" aria-label="Matching words">
        <span class="matching-language">{{ activity.sourceLanguage }}</span>
        <span class="matching-language">{{ activity.targetLanguage }}</span>
        <template v-for="(row, index) in rows" :key="index">
          <button v-for="card in row" :key="card.id" type="button"
            class="activity-option matching-card"
            :disabled="matched.includes(card.pairId) || mismatch.length > 0"
            :aria-pressed="selected?.id === card.id"
            :class="{ 'is-selected': selected?.id === card.id, 'is-matched': matched.includes(card.pairId), 'is-mismatch': mismatch.includes(card.id) }"
            @click="tap(card)">
            <span>{{ card.text }}</span>
            <span v-if="matched.includes(card.pairId)" aria-hidden="true">✓</span>
            <span v-if="mismatch.includes(card.id)" aria-hidden="true">✗</span>
            <span v-if="matched.includes(card.pairId)" class="activity-sr-only"> (matched)</span>
          </button>
        </template>
      </div>
    </section>

    <footer v-if="!showSummary" class="activity-screen-actions">
      <p class="matching-status" role="status" aria-live="polite">{{ status }}</p>
      <button class="button activity-action" :disabled="!complete" @click="finish">Continue</button>
    </footer>
  </main>
</template>

<style scoped>
.matching-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}
.matching-language {
  color: #52665d;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
}
.activity-screen .matching-card {
  justify-content: center;
  min-height: clamp(48px, 7vh, 64px);
  text-align: center;
  overflow-wrap: anywhere;
}
.matching-card.is-matched {
  background: #d6f8b5;
  border-color: #79ab4f;
  color: #245800;
}
.matching-card.is-mismatch {
  background: #ffe0e0;
  border-color: #d56b6b;
  color: #9c2525;
}
.matching-status {
  color: #52665d;
  text-align: center;
  font-size: 0.9rem;
  min-height: 2.5em;
  margin: 0 0 8px;
}
@media (max-height: 740px) {
  .matching-activity .activity-screen-question .activity-mascot,
  .matching-activity .activity-hint { display: none; }
  .matching-activity .activity-screen-question { gap: 8px; }
}
@media (max-height: 620px) {
  .matching-activity .activity-screen-question > .activity-eyebrow { display: none; }
  .matching-activity .activity-title { font-size: 1.25rem; }
  .matching-grid { gap: 6px 10px; }
  .activity-screen .matching-card { min-height: 44px; padding: 6px 10px; }
}
</style>
