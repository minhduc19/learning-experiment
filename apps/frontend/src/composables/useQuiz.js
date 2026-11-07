import { computed, ref, shallowRef } from 'vue'
import { shuffle } from './shuffle.js'
import { questions } from '../data/questions.js'

export function useQuiz({ strict = false, items = questions } = {}) {
  const shuffledItems = shallowRef([])
  function shuffleOptions() {
    shuffledItems.value = items.map(item => ({ ...item, options: shuffle(item.options) }))
  }
  shuffleOptions()
  const index = ref(0)
  const results = ref([])
  const ended = ref(false)
  const correctCount = computed(() => results.value.filter(result => result.correct).length)
  const incorrectCount = computed(() => results.value.length - correctCount.value)
  const hearts = computed(() => Math.max(0, 5 - incorrectCount.value))
  const failed = computed(() => strict && hearts.value === 0)
  const selected = ref(null)
  const checked = ref(false)
  const complete = computed(() => ended.value || index.value === items.length)
  const question = computed(() => shuffledItems.value[index.value])
  const correct = computed(() => checked.value && selected.value?.id === question.value?.answer && selected.value !== null)

  const answerText = computed(() => selected.value ? selected.value.fill ?? selected.value.label.toLowerCase() : '___')

  const sentence = computed(() => {
    if (!question.value) return ''
    return question.value.sentence.replaceAll('[[blank]]', answerText.value)
  })

  function choose(option) {
    if (!complete.value && !checked.value && question.value.options.includes(option)) selected.value = option
  }

  function check() {
    if (!selected.value || complete.value || checked.value) return
    checked.value = true
    if (strict) results.value.push({ questionId: question.value.id, optionId: selected.value.id, correct: correct.value })
  }

  function proceed() {
    if (!checked.value) return
    if (strict || correct.value) index.value += 1
    if (failed.value) ended.value = true
    selected.value = null
    checked.value = false
  }

  function restart() {
    shuffleOptions()
    index.value = 0
    results.value = []
    ended.value = false
    selected.value = null
    checked.value = false
  }

  return { results, correctCount, incorrectCount, hearts, failed, index, selected, checked, check, complete, question, answerText, sentence, correct, choose, proceed, restart, total: items.length }
}
