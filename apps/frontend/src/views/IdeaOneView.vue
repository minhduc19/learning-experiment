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
  <main class="page activity">
    <div class="activity-topline">
      <span class="activity-eyebrow">DAILY PRACTICE</span>
      <span>{{ complete ? total : index + 1 }} / {{ total }}</span>
    </div>
    <progress class="activity-progress" :value="index" :max="total" aria-label="Questions completed" />

    <section v-if="complete" class="activity-finish">
      <div class="activity-mascot" aria-hidden="true">★</div>
      <p class="activity-eyebrow">LESSON COMPLETE</p>
      <h1 class="activity-title" ref="heading" tabindex="-1">You did it!</h1>
      <p>You completed all {{ total }} questions. A little practice goes a long way.</p>
      <button class="button activity-action" @click="startAgain">Practice again</button>
    </section>

    <section v-else :key="question.id" aria-labelledby="question-heading">
      <div class="activity-mascot" aria-hidden="true">✦</div>
      <h1 class="activity-title" id="question-heading" ref="heading" tabindex="-1">{{ question.instruction }}</h1>
      <p class="activity-hint">Choose the word that completes the sentence.</p>
      <p class="activity-sentence">{{ question.sentence }}</p>
      <div class="activity-options" role="group" aria-label="Answer options">
        <button
          v-for="(option, position) in question.options"
          :key="option.id"
          :ref="(element) => answerButtons[position] = element"
          class="activity-option"
          :disabled="selected !== null"
          @click="selectOption(option, position)"
        >
          <span class="activity-option-number" aria-hidden="true">{{ position + 1 }}</span>
          {{ option.label }}
        </button>
      </div>
      <p class="activity-footer">Take your time. Every try is a step forward.</p>
    </section>

    <dialog ref="feedbackDialog" class="activity-feedback" :class="{ 'is-correct': correct }"
      aria-labelledby="feedback-heading" aria-describedby="feedback-description" @cancel.prevent>
      <template v-if="selected">
        <span class="activity-feedback-icon" aria-hidden="true">{{ correct ? '✓' : '↻' }}</span>
        <h2 id="feedback-heading">{{ correct ? 'Awesome!' : 'Opps!' }}</h2>
        <p class="activity-picked">You chose “{{ selected.label }}”.</p>
        <p v-if="correct" class="activity-translation"><strong>Spanish translation</strong><br>{{ question.translation }}</p>
        <p id="feedback-description">{{ selected.feedback }}</p>
        <button class="button activity-action" autofocus @click="dismissFeedback">{{ correct ? 'Continue' : 'Try again' }}</button>
      </template>
    </dialog>
  </main>
</template>
