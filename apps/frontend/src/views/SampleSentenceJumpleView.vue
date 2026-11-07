<script setup>
import { nextTick, ref } from 'vue'
import items from '../data/sentenceJumble.json'
import { useSentenceJumble } from '../composables/useSentenceJumble.js'
const { index, selected, checked, correct, total, complete, question, answer, bank, choose, remove, move, check, proceed, restart } = useSentenceJumble(items)
const heading = ref(null), feedback = ref(null)
const drag = ref(null), target = ref(null)
let suppressClickUntil = 0
function startDrag(event, tile) {
  if (checked.value || !event.isPrimary || event.button !== 0) return
  event.currentTarget.setPointerCapture(event.pointerId)
  drag.value = { id: tile.id, text: tile.text, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false }
}
function dragging(event) {
  if (!drag.value) return
  const state = drag.value
  state.x = event.clientX; state.y = event.clientY
  if (Math.hypot(state.x - state.startX, state.y - state.startY) > 7) state.active = true
  if (!state.active) return
  const zone = document.elementFromPoint(state.x, state.y)?.closest('[data-drop-zone]')
  target.value = null
  if (!zone) return
  const tiles = [...zone.querySelectorAll('[data-tile-id]')].filter(tile => tile.dataset.tileId !== state.id && !tile.classList.contains('jumble-used'))
  let before = null
  for (const tile of tiles) {
    const rect = tile.getBoundingClientRect()
    if (state.y < rect.top || (state.y <= rect.bottom && state.x < rect.left + rect.width / 2)) { before = tile.dataset.tileId; break }
  }
  target.value = { zone: zone.dataset.dropZone, before }
}
function endDrag(event) {
  if (!drag.value) return
  dragging(event)
  if (drag.value.active) {
    suppressClickUntil = Date.now() + 400
    if (target.value) {
      const destination = target.value.zone
      const ids = destination === 'answer' ? selected.value.filter(id => id !== drag.value.id) : bank.value.filter(tile => tile.id !== drag.value.id).map(tile => tile.id)
      const position = target.value.before === null ? ids.length : ids.indexOf(target.value.before)
      move(drag.value.id, destination, position)
    }
  }
  drag.value = null; target.value = null
}
function cancelDrag() { drag.value = null; target.value = null }
function tap(id, inAnswer) {
  if (Date.now() < suppressClickUntil) return
  if (inAnswer) remove(id)
  else choose(id)
}
function keyboardMove(event, id, position) {
  if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  move(id, 'answer', position + (event.key === 'ArrowLeft' ? -1 : 1))
}
async function checkAnswer() { check(); await nextTick(); feedback.value?.focus() }
async function advance() { proceed(); await nextTick(); heading.value?.focus() }
async function again() { restart(); await nextTick(); heading.value?.focus() }
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
      <div class="jumble-answer" data-drop-zone="answer" :class="{ 'is-drop-target': target?.zone === 'answer', 'is-correct': checked && correct, 'is-incorrect': checked && !correct }" role="group" aria-label="Your answer">
        <span v-if="!selected.length" class="activity-hint">Tap or drag words here to build your answer</span>
        <button v-for="(tile, position) in answer" :key="tile.id" class="activity-option jumble-tile is-selected" :data-tile-id="tile.id" :class="{ 'is-dragging': drag?.active && drag.id === tile.id, 'drop-before': target?.zone === 'answer' && target.before === tile.id }" :disabled="checked" @pointerdown="startDrag($event, tile)" @pointermove="dragging" @pointerup="endDrag" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag" @keydown="keyboardMove($event, tile.id, position)" :aria-label="`Remove ${tile.text}, position ${position + 1}`" @click="tap(tile.id, true)">{{ tile.text }}</button>
      </div>
      <p class="activity-sr-only" role="status">Your answer: {{ answer.map(tile => tile.text).join(' ') || 'empty' }}</p>
      <div class="jumble-bank" data-drop-zone="bank" :class="{ 'is-drop-target': target?.zone === 'bank' }" role="group" aria-label="Word bank">
        <button v-for="tile in bank" :key="tile.id" class="activity-option jumble-tile" :data-tile-id="tile.id" :class="{ 'jumble-used': selected.includes(tile.id), 'is-dragging': drag?.active && drag.id === tile.id, 'drop-before': target?.zone === 'bank' && target.before === tile.id }" @pointerdown="startDrag($event, tile)" @pointermove="dragging" @pointerup="endDrag" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag" :disabled="checked || selected.includes(tile.id)" :aria-hidden="selected.includes(tile.id) ? true : undefined" @click="tap(tile.id, false)">{{ tile.text }}</button>
      </div>
      <p class="activity-hint jumble-tip">Drag tiles between boxes or within your answer to reorder. Tap an answer tile to return it. Keyboard: Alt + Left/Right moves an answer tile.</p>
    </section>
    <div v-if="drag?.active" class="jumble-ghost" :style="{ left: drag.x + 'px', top: drag.y + 'px' }" aria-hidden="true">{{ drag.text }}</div>
    <footer v-if="!complete && !checked" class="activity-screen-actions"><button class="button activity-action" :disabled="!selected.length" @click="checkAnswer">Check</button></footer>
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
.jumble-tile.is-dragging { opacity: .35; }
.jumble-bank { min-height: 70px; padding: 10px; border: 2px dashed transparent; border-radius: 16px; }
.is-drop-target { outline: 3px solid #79ab4f; outline-offset: 2px; }
.jumble-tile.drop-before { box-shadow: -5px 0 0 #357a00; }
.jumble-ghost { position: fixed; pointer-events: none; z-index: 100; width: auto !important; max-width: 90vw !important; margin: 0 !important; transform: translate(-50%, -50%); padding: 10px 16px; background: #eefbdc; border: 2px solid #79ab4f; border-radius: 12px; box-shadow: 0 5px 15px #163b3533; font-weight: 700; }
.jumble-used { visibility: hidden; }
.jumble-answer.is-correct { border-color: #79ab4f; background: #f1ffe5; }
.jumble-answer.is-incorrect { border-color: #d56b6b; background: #fff7ef; }
@media (max-height: 740px) {
  .jumble-activity .activity-mascot, .jumble-tip { display: none; }
  .jumble-activity .activity-screen-question { justify-content: flex-start; }
}
</style>
