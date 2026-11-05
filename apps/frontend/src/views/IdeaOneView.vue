<script setup>
import { nextTick, ref } from 'vue'
import { useQuiz } from '../composables/useQuiz'

const { index, selected, complete, question, correct, choose, proceed, restart, total } = useQuiz()
const feedbackDialog = ref(null)
const heading = ref(null)
const answerButtons = ref([])
let lastAnswer = 0

async function selectOption(option, position) {
  lastAnswer = position
  choose(option)
  await nextTick()
  feedbackDialog.value.showModal()
}

async function dismissFeedback() {
  const advance = correct.value
  feedbackDialog.value.close()
  proceed()
  await nextTick()
  if (advance) heading.value?.focus()
  else answerButtons.value[lastAnswer]?.focus()
}

async function startAgain() {
  restart()
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <main class="page quiz">
    <div class="quiz-topline">
      <span class="quiz-eyebrow">DAILY PRACTICE</span>
      <span>{{ complete ? total : index + 1 }} / {{ total }}</span>
    </div>
    <progress class="quiz-progress" :value="index" :max="total" aria-label="Questions completed" />

    <section v-if="complete" class="quiz-finish">
      <div class="quiz-mascot" aria-hidden="true">★</div>
      <p class="quiz-eyebrow">LESSON COMPLETE</p>
      <h1 ref="heading" tabindex="-1">You did it!</h1>
      <p>You completed all {{ total }} questions. A little practice goes a long way.</p>
      <button class="button quiz-action" @click="startAgain">Practice again</button>
    </section>

    <section v-else :key="question.id" aria-labelledby="question-heading">
      <div class="quiz-mascot" aria-hidden="true">✦</div>
      <h1 id="question-heading" ref="heading" tabindex="-1">{{ question.instruction }}</h1>
      <p class="quiz-hint">Choose the word that completes the sentence.</p>
      <p class="quiz-sentence">{{ question.sentence }}</p>
      <div class="quiz-options" role="group" aria-label="Answer options">
        <button
          v-for="(option, position) in question.options"
          :key="option.id"
          :ref="(element) => answerButtons[position] = element"
          class="quiz-option"
          :disabled="selected !== null"
          @click="selectOption(option, position)"
        >
          <span class="quiz-option-number" aria-hidden="true">{{ position + 1 }}</span>
          {{ option.label }}
        </button>
      </div>
      <p class="quiz-footer">Take your time. Every try is a step forward.</p>
    </section>

    <dialog ref="feedbackDialog" class="quiz-feedback" :class="{ 'is-correct': correct }"
      aria-labelledby="feedback-heading" aria-describedby="feedback-description" @cancel.prevent>
      <template v-if="selected">
        <span class="quiz-feedback-icon" aria-hidden="true">{{ correct ? '✓' : '↻' }}</span>
        <h2 id="feedback-heading">{{ correct ? 'Awesome!' : 'Opps!' }}</h2>
        <p class="quiz-picked">You chose “{{ selected.label }}”.</p>
        <p v-if="correct" class="quiz-translation"><strong>Spanish translation</strong><br>{{ question.translation }}</p>
        <p id="feedback-description">{{ selected.feedback }}</p>
        <button class="button quiz-action" autofocus @click="dismissFeedback">{{ correct ? 'Continue' : 'Try again' }}</button>
      </template>
    </dialog>
  </main>
</template>

<style scoped>
.quiz { --quiz-green: #357a00; --quiz-lime: #58cc02; --quiz-border: #dce6dc; }
.quiz-topline { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); font-weight: 700; }
.quiz-eyebrow { color: var(--color-primary); font-size: 0.75rem; letter-spacing: 0.12em; font-weight: 800; }
.quiz-progress { display: block; width: 100%; height: 16px; margin-block: var(--space-3) var(--space-5); border: 0; border-radius: 99px; overflow: hidden; background: #dce6dc; accent-color: var(--quiz-lime); }
.quiz-progress::-webkit-progress-bar { background: #dce6dc; border-radius: 99px; }
.quiz-progress::-webkit-progress-value { background: var(--quiz-lime); border-radius: 99px; }
.quiz-progress::-moz-progress-bar { background: var(--quiz-lime); border-radius: 99px; }
.quiz-mascot { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 22px; background: #e1f7cb; color: var(--quiz-green); font-size: 2.5rem; transform: rotate(-7deg); }
.quiz h1 { font-size: clamp(1.8rem, 5vw, 2.5rem); margin-bottom: var(--space-2); }
.quiz-hint, .quiz-footer { color: #52665d; }
.quiz-sentence { background: white; padding: var(--space-5); border: 2px solid var(--quiz-border); border-radius: 20px; font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 700; }
.quiz-options { display: grid; gap: var(--space-3); }
.quiz-option { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-3); border: 2px solid var(--quiz-border); border-bottom-width: 5px; border-radius: 16px; background: white; color: var(--color-text); font-weight: 700; text-align: left; cursor: pointer; }
.quiz-option:hover:not(:disabled) { background: #eefbdc; border-color: #8fbf64; }
.quiz-option:active:not(:disabled) { transform: translateY(2px); border-bottom-width: 3px; }
.quiz-option-number { display: grid; place-items: center; width: 30px; height: 30px; border: 2px solid var(--quiz-border); border-radius: 8px; font-size: 0.8rem; }
.quiz-footer { font-size: 0.85rem; text-align: center; margin-top: var(--space-4); }
.quiz-feedback { box-sizing: border-box; width: min(480px, calc(100% - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: var(--space-5); border: 2px solid #ebbb99; border-radius: 24px; background: #fff7ef; color: var(--color-text); box-shadow: 0 24px 80px #163b3533; }
.quiz-feedback::backdrop { background: #10251dcc; }
.quiz-feedback.is-correct { background: #f1ffe5; border-color: #a1ce79; }
.quiz-feedback-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: #ffe2ca; font-size: 1.8rem; }
.is-correct .quiz-feedback-icon { background: #d6f8b5; color: var(--quiz-green); }
.quiz-feedback h2 { font-size: 2rem; margin-block: var(--space-3); }
.quiz-picked { font-size: 0.85rem; color: #52665d; }
.quiz-translation { padding: var(--space-3); background: white; border-radius: 12px; }
.quiz-action { width: 100%; margin-top: var(--space-3); padding: var(--space-3); border-radius: 14px; background: var(--quiz-green); box-shadow: 0 4px 0 #255500; font-weight: 800; }
.quiz-action:hover { background: #2b6600; }
.quiz-finish { text-align: center; }
.quiz-finish .quiz-mascot { margin: var(--space-5) auto; }
</style>
