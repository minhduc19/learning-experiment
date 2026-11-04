<script setup>
import { computed, ref } from 'vue'

const questions = [
  { word: 'the apple', hint: 'Choose the Spanish translation', options: ['La manzana', 'El pan', 'La leche', 'El agua'], answer: 0, emoji: '🍎' },
  { word: 'the bread', hint: 'Choose the Spanish translation', options: ['El gato', 'La casa', 'El pan', 'La manzana'], answer: 2, emoji: '🥖' },
  { word: 'the water', hint: 'Choose the Spanish translation', options: ['La leche', 'El agua', 'El libro', 'El perro'], answer: 1, emoji: '💧' },
  { word: 'the cat', hint: 'Choose the Spanish translation', options: ['El perro', 'El pan', 'La casa', 'El gato'], answer: 3, emoji: '🐈' },
  { word: 'the house', hint: 'Choose the Spanish translation', options: ['La casa', 'La manzana', 'El agua', 'El libro'], answer: 0, emoji: '🏡' },
]
const index = ref(0)
const selected = ref(null)
const checked = ref(false)
const score = ref(0)
const finished = ref(false)
const question = computed(() => questions[index.value])
const correct = computed(() => selected.value === question.value.answer)
const progress = computed(() => finished.value ? 100 : (index.value + (checked.value ? 1 : 0)) / questions.length * 100)

function submit() {
  if (finished.value) return restart()
  if (selected.value === null) return
  if (!checked.value) {
    checked.value = true
    if (correct.value) score.value++
    return
  }
  if (index.value === questions.length - 1) {
    finished.value = true
  } else {
    index.value++
    selected.value = null
    checked.value = false
  }
}
function restart() {
  index.value = 0
  selected.value = null
  checked.value = false
  score.value = 0
  finished.value = false
}
</script>

<template>
  <div class="lesson">
    <header class="lesson-header">
      <button class="restart" aria-label="Restart lesson" @click="restart">↻</button>
      <div class="progress" role="progressbar" aria-label="Lesson progress" :aria-valuenow="progress" :aria-valuemin="0" :aria-valuemax="100">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <span class="score" aria-label="Correct answers">✦ {{ score }}</span>
    </header>

    <main v-if="!finished" class="exercise">
      <div class="eyebrow">SPANISH · EVERYDAY WORDS</div>
      <h1>Which one means<br>“{{ question.word }}”?</h1>
      <p class="instruction">{{ question.hint }}</p>
      <div class="word-card"><span aria-hidden="true">{{ question.emoji }}</span><span>{{ question.word }}</span></div>
      <fieldset :key="index" :disabled="checked" class="answers">
        <legend class="sr-only">Choose one answer</legend>
        <label v-for="(option, optionIndex) in question.options" :key="option" class="answer" :class="{ selected: selected === optionIndex, right: checked && optionIndex === question.answer, wrong: checked && selected === optionIndex && !correct }">
          <input v-model="selected" type="radio" name="answer" :value="optionIndex">
          <span class="answer-number" aria-hidden="true">{{ optionIndex + 1 }}</span>
          <span>{{ option }}</span>
          <span v-if="checked && optionIndex === question.answer" class="answer-mark" aria-hidden="true">✓</span>
        </label>
      </fieldset>
      <p class="question-number">Question {{ index + 1 }} of {{ questions.length }}</p>
    </main>

    <main v-else class="completion">
      <div class="trophy" aria-hidden="true">🏆</div>
      <div class="eyebrow">LESSON COMPLETE</div>
      <h1>A little practice.<br>A big step forward.</h1>
      <p>You got {{ score }} of {{ questions.length }} answers right.</p>
      <div class="result"><span>{{ Math.round(score / questions.length * 100) }}%</span> ACCURACY</div>
    </main>

    <footer class="footer" :class="{ success: checked && correct && !finished, error: checked && !correct && !finished }">
      <div class="footer-content">
        <div class="feedback" aria-live="polite" aria-atomic="true">
          <template v-if="finished"><strong>Keep your momentum going!</strong><span>Try again to make these words stick.</span></template>
          <template v-else-if="checked"><strong>{{ correct ? '✓ Nicely done!' : 'Let’s learn this one' }}</strong><span>{{ correct ? 'You’re one word closer.' : `Correct answer: ${question.options[question.answer]}` }}</span></template>
          <template v-else><strong>Small steps, every day.</strong><span>Pick an answer, then check it.</span></template>
        </div>
        <button class="check" :disabled="!finished && selected === null" @click="submit">{{ finished ? 'PRACTICE AGAIN' : checked ? 'CONTINUE' : 'CHECK ANSWER' }}</button>
      </div>
    </footer>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #343b38; font-family: 'Trebuchet MS', system-ui, sans-serif; }
button, input { font: inherit; }
button { cursor: pointer; }
.lesson { min-height: 100dvh; display: flex; flex-direction: column; }
.lesson-header { width: min(920px, 100%); margin: 0 auto; padding: 36px 28px; display: flex; gap: 22px; align-items: center; }
.restart { border: 0; background: transparent; color: #8c9790; font-size: 30px; padding: 0 5px; }
.progress { flex: 1; height: 15px; background: #edf0e9; border-radius: 20px; overflow: hidden; }
.progress-fill { height: 100%; min-width: 0; border-radius: inherit; background: #78bf35; transition: width .3s; box-shadow: inset 0 4px #ffffff35; }
.score { color: #d58b0e; font-size: 21px; font-weight: bold; white-space: nowrap; }
.exercise { width: min(540px, 100%); margin: auto; padding: 30px 24px 36px; }
.eyebrow { font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #7e975f; margin-bottom: 16px; }
h1 { font-size: clamp(27px, 5vw, 36px); letter-spacing: -.8px; line-height: 1.23; margin: 0 0 12px; }
.instruction { color: #8b928b; font-size: 15px; margin: 0; }
.word-card { display: flex; gap: 20px; align-items: center; margin: 26px 0; padding: 18px 24px; background: #f7f9f2; border-radius: 18px; font-size: 19px; font-weight: bold; }
.word-card > span:first-child { font-size: 45px; }
.answers { display: grid; gap: 12px; border: 0; margin: 0; padding: 0; min-width: 0; }
.answer { display: flex; align-items: center; gap: 16px; min-height: 62px; padding: 12px 16px; border: 2px solid #e4e8e1; border-bottom-width: 4px; border-radius: 14px; font-weight: bold; cursor: pointer; transition: background .15s, border-color .15s; }
.answer:hover { background: #f6f8f3; }
.answer.selected { background: #eef7ff; border-color: #6bb7e1; color: #2580b4; }
.answer.right { background: #eef9df; border-color: #9cce64; color: #527f20; }
.answer.wrong { background: #fff0ef; border-color: #ed9990; color: #b4473b; }
.answer input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.answer:has(input:focus-visible) { outline: 3px solid #3189b7; outline-offset: 3px; }
.answers:disabled .answer { cursor: default; }
.answer-number { display: grid; place-items: center; width: 29px; height: 29px; border: 2px solid currentColor; border-radius: 8px; font-size: 12px; opacity: .5; }
.answer-mark { margin-left: auto; }
.question-number { text-align: center; font-size: 12px; color: #91998c; margin: 22px 0 0; }
.footer { border-top: 2px solid #edf0e9; padding: 24px; margin-top: 24px; }
.footer-content { max-width: 850px; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.feedback { display: grid; gap: 6px; font-size: 14px; }
.feedback strong { font-size: 18px; }
.feedback span { color: #7c8779; }
.success { background: #edf8dc; color: #527f20; border-color: #edf8dc; }
.error { background: #fff0ed; color: #b4473b; border-color: #fff0ed; }
.check { flex-shrink: 0; border: 0; border-bottom: 4px solid #579a20; border-radius: 13px; background: #79c438; color: white; font-size: 13px; font-weight: bold; letter-spacing: .8px; padding: 17px 30px; }
.check:hover:not(:disabled) { background: #87ce47; }
.check:active:not(:disabled) { transform: translateY(2px); border-bottom-width: 2px; }
.check:disabled { background: #e9ece6; color: #a4ada0; border-color: #dce1d7; cursor: default; }
button:focus-visible { outline: 3px solid #3189b7; outline-offset: 4px; }
.completion { text-align: center; margin: auto; padding: 40px 24px; }
.trophy { font-size: 85px; margin-bottom: 25px; }
.completion p { color: #7c8779; }
.result { border: 2px solid #dcebc9; border-radius: 16px; padding: 18px 35px; display: inline-grid; gap: 5px; font-size: 11px; color: #6a943f; font-weight: bold; letter-spacing: 1px; margin-top: 20px; }
.result span { font-size: 32px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 560px) { .lesson-header { padding: 22px; gap: 14px; } .exercise { padding-top: 16px; } .footer-content { flex-direction: column; align-items: stretch; gap: 18px; } .footer { padding: 20px 24px; } .feedback { min-height: 46px; } .check { width: 100%; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
