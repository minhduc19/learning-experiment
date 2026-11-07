<script setup>
import { nextTick, ref } from 'vue'
import items from '../data/sentenceJumble.json'
import { useSentenceJumble } from '../composables/useSentenceJumble.js'
const { index, selected, checked, correct, total, complete, question, answer, bank, choose, remove, check, proceed, restart } = useSentenceJumble(items)
const heading = ref(null), feedback = ref(null)
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
      <div class="jumble-answer" :class="{ 'is-correct': checked && correct, 'is-incorrect': checked && !correct }" role="group" aria-label="Your answer">
        <span v-if="!selected.length" class="activity-hint">Tap words below to build your answer</span>
        <button v-for="(tile, position) in answer" :key="tile.id" class="activity-option jumble-tile is-selected" :disabled="checked" :aria-label="`Remove ${tile.text}, position ${position + 1}`" @click="remove(tile.id)">{{ tile.text }}</button>
      </div>
      <p class="activity-sr-only" role="status">Your answer: {{ answer.map(tile => tile.text).join(' ') || 'empty' }}</p>
      <div class="jumble-bank" role="group" aria-label="Word bank">
        <button v-for="tile in bank" :key="tile.id" class="activity-option jumble-tile" :class="{ 'jumble-used': selected.includes(tile.id) }" :disabled="checked || selected.includes(tile.id)" :aria-hidden="selected.includes(tile.id) ? true : undefined" @click="choose(tile.id)">{{ tile.text }}</button>
      </div>
      <p class="activity-hint jumble-tip">Tap a word in your answer to return it to the bank.</p>
    </section>
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
.jumble-used { visibility: hidden; }
.jumble-answer.is-correct { border-color: #79ab4f; background: #f1ffe5; }
.jumble-answer.is-incorrect { border-color: #d56b6b; background: #fff7ef; }
@media (max-height: 740px) {
  .jumble-activity .activity-mascot, .jumble-tip { display: none; }
  .jumble-activity .activity-screen-question { justify-content: flex-start; }
}
</style>
