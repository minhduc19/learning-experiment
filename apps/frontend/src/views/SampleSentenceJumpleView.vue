<script setup>
import { nextTick, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import items from '../data/sentenceJumble.json'
import { useSentenceJumble } from '../composables/useSentenceJumble.js'
const { index, selected, checked, correct, total, complete, question, answer, bank, choose, remove, move, check, proceed, restart } = useSentenceJumble(items)
const heading = ref(null), feedback = ref(null)
const answerTiles = ref([]), bankTiles = ref([])
const sorting = ref(false)
let suppressClickUntil = 0
function syncTiles(resetBank = false) {
  answerTiles.value = [...answer.value]
  const seen = new Set(selected.value)
  bankTiles.value = [...(resetBank ? [] : bankTiles.value), ...bank.value].filter(tile => {
    if (seen.has(tile.id)) return false
    seen.add(tile.id)
    return true
  })
}
watch(index, () => syncTiles(true), { immediate: true })
function finishSort() {
  selected.value = answerTiles.value.map(tile => tile.id)
  sorting.value = false
  suppressClickUntil = Date.now() + 250
}
function tap(id, inAnswer) {
  if (sorting.value || Date.now() < suppressClickUntil) return
  if (inAnswer) remove(id)
  else choose(id)
  syncTiles()
}
function keyboardMove(event, id, position) {
  if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  move(id, 'answer', position + (event.key === 'ArrowLeft' ? -1 : 1))
  syncTiles()
}
async function checkAnswer() { if (sorting.value) return; check(); await nextTick(); feedback.value?.focus() }
async function advance() { proceed(); await nextTick(); heading.value?.focus() }
async function again() { restart(); syncTiles(true); await nextTick(); heading.value?.focus() }
</script>

<template>
  <main class="activity activity-screen jumble-activity" :class="{ 'activity-has-feedback': checked }">
    <div class="activity-screen-progress">
      <div class="activity-topline"><span class="activity-eyebrow">DAILY PRACTICE</span><span>{{ complete ? total : index + 1 }} / {{ total }}</span></div>
      <progress class="activity-progress" :value="index" :max="total" aria-label="Sentences completed" />
    </div>
    <section v-if="complete" class="activity-finish">
      <div class="activity-mascot" aria-hidden="true">★</div>
      <p class="activity-eyebrow">LESSON COMPLETE</p>
      <h1 ref="heading" tabindex="-1" class="activity-title">You did it!</h1>
      <p>You built all {{ total }} sentences.</p>
      <button class="button activity-action" @click="again">Practice again</button>
    </section>
    <section v-else class="activity-screen-question" aria-labelledby="jumble-heading">
      <div class="activity-mascot" aria-hidden="true">✦</div>
      <h1 id="jumble-heading" ref="heading" tabindex="-1" class="activity-title">{{ question.instruction }}</h1>
      <p class="activity-hint">{{ question.prompt ? `Translate into ${question.targetLanguage}.` : `Arrange the tiles into a sensible ${question.targetLanguage} sentence.` }} Extra tiles may be left over.</p>
      <p v-if="question.prompt" class="activity-sentence">{{ question.prompt }}</p>
      <Draggable v-model="answerTiles" item-key="id" group="sentence-tiles" class="jumble-answer" data-drop-zone="answer"
        :class="{ 'is-correct': checked && correct, 'is-incorrect': checked && !correct }"
        :animation="180" :disabled="checked" :force-fallback="true" :fallback-on-body="true" :fallback-tolerance="5"
        ghost-class="jumble-placeholder" drag-class="jumble-dragging" draggable=".jumble-tile" :empty-insert-threshold="30"
        role="group" aria-label="Your answer" @start="sorting = true" @end="finishSort">
        <template #header><span v-if="!answerTiles.length" class="activity-hint jumble-empty">Tap or drag words here to build your answer</span></template>
        <template #item="{ element: tile, index: position }">
          <button class="activity-option jumble-tile is-selected" :data-tile-id="tile.id" :disabled="checked"
            @keydown="keyboardMove($event, tile.id, position)" :aria-label="`Remove ${tile.text}, position ${position + 1}`" @click="tap(tile.id, true)">{{ tile.text }}</button>
        </template>
      </Draggable>
      <p class="activity-sr-only" role="status">Your answer: {{ answer.map(tile => tile.text).join(' ') || 'empty' }}</p>
      <Draggable v-model="bankTiles" item-key="id" group="sentence-tiles" class="jumble-bank" data-drop-zone="bank"
        :animation="180" :disabled="checked" :force-fallback="true" :fallback-on-body="true" :fallback-tolerance="5"
        ghost-class="jumble-placeholder" drag-class="jumble-dragging" draggable=".jumble-tile" :empty-insert-threshold="30"
        role="group" aria-label="Word bank" @start="sorting = true" @end="finishSort">
        <template #item="{ element: tile }">
          <button class="activity-option jumble-tile" :data-tile-id="tile.id" :disabled="checked" @click="tap(tile.id, false)">{{ tile.text }}</button>
        </template>
      </Draggable>
      <p class="activity-hint jumble-tip">Drag tiles between boxes or within your answer to reorder. Tap an answer tile to return it. Keyboard: Alt + Left/Right moves an answer tile.</p>
    </section>
    <footer v-if="!complete && !checked" class="activity-screen-actions"><button class="button activity-action" :disabled="sorting || !selected.length" @click="checkAnswer">Check</button></footer>
    <section v-if="checked" class="activity-feedback" :class="{ 'is-correct': correct }" role="region" aria-labelledby="jumble-feedback">
      <div class="activity-feedback-body">
        <span class="activity-feedback-icon" aria-hidden="true">{{ correct ? '✓' : '↻' }}</span>
        <h2 id="jumble-feedback" ref="feedback" tabindex="-1">{{ correct ? 'Awesome!' : 'Not quite yet' }}</h2>
        <template v-if="correct"><p class="activity-translation"><strong>Translation</strong><br>{{ question.translation }}</p><p>{{ question.explanation }}</p></template>
        <p v-else>Check the word order and look out for extra words. Tap a tile to change your answer after choosing Try again.</p>
      </div>
      <div class="activity-feedback-actions"><button class="button activity-action" @click="advance">{{ correct ? 'Continue' : 'Try again' }}</button></div>
    </section>
  </main>
</template>

<style scoped>
.jumble-answer, .jumble-bank { display: flex; flex-wrap: wrap; align-content: flex-start; gap: 8px; }
.jumble-answer { min-height: 100px; border: 2px dashed var(--activity-border); border-radius: 16px; padding: 12px; }
.activity-screen .jumble-tile { width: auto; min-height: 44px; padding: 8px 12px; overflow-wrap: anywhere; max-width: 100%; }
.jumble-tile { touch-action: none; user-select: none; cursor: grab; }
.jumble-bank { min-height: 70px; padding: 10px; border: 2px dashed transparent; border-radius: 16px; }
.jumble-placeholder { opacity: .25; }
.jumble-dragging { cursor: grabbing; }
.jumble-empty { pointer-events: none; }
.jumble-answer.is-correct { border-color: #79ab4f; background: #f1ffe5; }
.jumble-answer.is-incorrect { border-color: #d56b6b; background: #fff7ef; }
@media (max-height: 740px) {
  .jumble-activity .activity-mascot, .jumble-tip { display: none; }
  .jumble-activity .activity-screen-question { justify-content: flex-start; }
}
</style>
