<script setup>
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'
import AudioPrompt from './AudioPrompt.vue'
import { useQuiz } from '../composables/useQuiz'
import { questions } from '../data/questions.js'
import { strictQuestions } from '../data/strictQuestions.js'
import { playOptionAudio, stopOptionAudio } from '../composables/optionPlayback.js'

const props = defineProps({
  lessonMode: Boolean,
  restartHandler: { type: Function, default: null },
  completionBusy: { type: Boolean, default: false },
  assessment: { type: Boolean, default: false },
  strict: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
  showInstructions: { type: Boolean, default: true },
  items: { type: Array, default: null },
  translationLabel: { type: String, default: 'Translation' },
  // Pixel values; null keeps the standalone activity's default typography.
  textSize: { type: Number, default: null, validator: (value) => value === null || (Number.isFinite(value) && value > 0) },
  translationSize: { type: Number, default: null, validator: (value) => value === null || (Number.isFinite(value) && value > 0) },
})
const emit = defineEmits(['passed', 'answered', 'completed'])
const questionHeadingId = useId()
const feedbackHeadingId = useId()
const feedbackDescriptionId = useId()

const { results, correctCount, incorrectCount, hearts, failed, index, selected, checked, check, complete, question, answerText, correct, choose, proceed, restart, total } = useQuiz({ strict: props.strict, items: props.items ?? (props.strict ? strictQuestions : questions) })
const feedbackHeading = ref(null)
const heading = ref(null)
const questionSection = ref(null)
const answerButtons = ref([])
let lastAnswer = 0
const audioOwner = Symbol('quiz-audio')
const audioError = ref('')
const hasSelectedAudio = computed(() => selected.value?.audio_id && selected.value?.audio_text === selected.value?.label)
async function playAudio(option) {
  audioError.value = ''
  try { await playOptionAudio(option, audioOwner, message => { audioError.value = message }) }
  catch (failure) { audioError.value = failure.message }
}
watch(index, () => { stopOptionAudio(audioOwner); audioError.value = '' })
onUnmounted(() => stopOptionAudio(audioOwner))

function selectOption(option, position) {
  lastAnswer = position
  choose(option)
  playAudio(option)
}

async function checkAnswer() {
  if (!selected.value || checked.value) return
  check()
  emit('answered', { optionId: selected.value.id, index: index.value })
  if (props.embedded && correct.value) emit('passed')
  await nextTick()
  feedbackHeading.value?.focus()
}

async function dismissFeedback() {
  // Passed reading checkpoints remain as a review of the submitted answer.
  if (props.embedded && correct.value) return
  const advance = props.strict || correct.value
  proceed()
  if (complete.value) emit('completed')
  await nextTick()
  if (advance) (heading.value ?? questionSection.value)?.focus()
  else answerButtons.value[lastAnswer]?.focus()
}

async function startAgain() {
  stopOptionAudio(audioOwner)
  if (props.restartHandler) { await props.restartHandler(); return }
  restart()
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <component :is="embedded ? 'div' : 'main'" class="activity" :style="{
    '--activity-text-size': textSize === null ? undefined : `${textSize / 16}rem`,
    '--activity-translation-size': translationSize === null ? undefined : `${translationSize / 16}rem`,
  }" :class="{ 'activity-screen': !embedded, 'activity-embedded': embedded, 'activity-has-feedback': checked }">
    <div v-if="!embedded && !lessonMode" class="activity-screen-progress">
    <div class="activity-topline">
      <span class="activity-eyebrow">{{ strict ? 'STRICT QUIZ' : 'DAILY PRACTICE' }}</span>
      <span>{{ strict ? results.length : (complete ? total : index + 1) }} / {{ total }}</span>
    </div>
    <div class="activity-progress-with-hearts">
    <progress class="activity-progress" :value="strict ? results.length : index" :max="total" aria-label="Questions completed" />
    <div v-if="strict" class="activity-hearts" :class="hearts >= 4 ? 'is-healthy' : hearts >= 2 ? 'is-warning' : 'is-danger'" role="img" :aria-label="`${hearts} of 5 hearts remaining`">
      <span v-for="heart in 5" :key="heart" :class="{ 'is-lost': heart > hearts }" aria-hidden="true">♥</span>
    </div>
    </div>
    </div>

    <section v-if="complete" class="activity-finish">
      <div class="activity-mascot" aria-hidden="true">★</div>
      <p class="activity-eyebrow">{{ strict ? 'QUIZ RESULTS' : 'LESSON COMPLETE' }}</p>
      <h1 class="activity-title" ref="heading" tabindex="-1">{{ failed ? 'Out of hearts' : 'You did it!' }}</h1>
      <template v-if="strict">
        <p>{{ failed ? 'Five incorrect answers ended this attempt. Try again for a fresh start.' : 'Quiz complete! Here is how you did.' }}</p>
        <div class="activity-score" aria-label="Quiz score">
          <p><strong>{{ correctCount }}</strong> Correct</p>
          <p><strong>{{ incorrectCount }}</strong> Incorrect</p>
          <p v-if="results.length < total"><strong>{{ total - results.length }}</strong> Unanswered</p>
        </div>
      </template>
      <p v-else>You completed all {{ total }} questions. A little practice goes a long way.</p>
      <slot name="completion" />
      <button class="button activity-action" :disabled="completionBusy" @click="startAgain">{{ strict ? 'Redo quiz' : 'Practice again' }}</button>
    </section>

    <section v-else class="activity-screen-question" ref="questionSection" tabindex="-1" :key="question.id" :aria-labelledby="showInstructions ? questionHeadingId : undefined" :aria-label="showInstructions ? undefined : question.instruction">
      <div class="activity-mascot" aria-hidden="true">✦</div>
      <h1 v-if="showInstructions" class="activity-title" :id="questionHeadingId" ref="heading" tabindex="-1">{{ question.instruction }}</h1>
      <p v-if="showInstructions" class="activity-hint">{{ strict ? 'Choose an answer, then press Check to submit. You cannot retry after checking.' : (question['text-prompt-available'] ? 'Choose the word that completes the sentence.' : 'Choose an answer. The text prompt is revealed after checking.') }}</p>
      <AudioPrompt v-if="question['audio-prompt']" :key="index" :src="question['audio-prompt']" />
      <p v-if="question['text-prompt-available'] || checked" class="activity-sentence" aria-live="polite"><template v-for="(part, position) in question['text-prompt'].split('[[blank]]')" :key="position">{{ part }}<span v-if="position < question['text-prompt'].split('[[blank]]').length - 1" class="activity-answer" :class="{ 'is-correct': checked && correct, 'is-incorrect': checked && !correct }">{{ answerText }}<span v-if="checked" class="activity-answer-icon" aria-hidden="true">{{ correct ? ' ✓' : ' ✗' }}</span><span v-if="checked" class="activity-sr-only">{{ correct ? ' (correct)' : ' (incorrect)' }}</span></span></template></p>
      <div class="activity-options" role="group" aria-label="Answer options">
        <button
          v-for="(option, position) in question.options"
          :key="option.id"
          :ref="(element) => answerButtons[position] = element"
          class="activity-option"
          :disabled="checked"
          :aria-pressed="selected?.id === option.id"
          :class="{ 'is-selected': selected?.id === option.id }"
          @click="selectOption(option, position)"
        >
          <span class="activity-option-number" aria-hidden="true">{{ position + 1 }}</span>
          {{ option.label }} <span v-if="option.audio_id && option.audio_text === option.label" aria-hidden="true">♪</span>
        </button>
      </div>
      <button v-if="hasSelectedAudio" type="button" class="corpus-text-button" @click="playAudio(selected)">Replay audio</button>
      <p v-if="audioError" role="status" class="activity-footer">{{ audioError }}</p>
    </section>

    <footer v-if="!complete && !checked" class="activity-screen-actions">
      <button class="button activity-action" :disabled="!selected" @click="checkAnswer">Check</button>
    </footer>

    <section v-if="checked" class="activity-feedback" role="region" :class="{ 'is-correct': correct }"
      :aria-labelledby="feedbackHeadingId" :aria-describedby="feedbackDescriptionId">
      <template v-if="selected">
        <div class="activity-feedback-body">
        <span class="activity-feedback-icon" aria-hidden="true">{{ correct ? '✓' : '↻' }}</span>
        <h2 :id="feedbackHeadingId" ref="feedbackHeading" tabindex="-1">{{ correct ? 'Awesome!' : 'Opps!' }}</h2>
        <p v-if="correct && question.translation" class="activity-translation"><strong>{{ translationLabel }}</strong><br>{{ question.translation }}</p>
        <p :id="feedbackDescriptionId">{{ selected.feedback }}</p>
        </div>
        <div v-if="!assessment && (!embedded || !correct)" class="activity-feedback-actions">
        <button class="button activity-action" autofocus @click="dismissFeedback">{{ strict ? ((failed || index === total - 1) ? 'See results' : 'Continue') : (correct ? 'Continue' : 'Try again') }}</button>
        </div>
      </template>
    </section>
  </component>
</template>
