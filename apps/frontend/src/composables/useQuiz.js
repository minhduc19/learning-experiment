import { computed, ref } from 'vue'
import { questions } from '../data/questions.js'

export function useQuiz() {
  const index = ref(0)
  const selected = ref(null)
  const checked = ref(false)
  const complete = computed(() => index.value === questions.length)
  const question = computed(() => questions[index.value])
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
    if (selected.value && !complete.value) checked.value = true
  }

  function proceed() {
    if (!checked.value) return
    if (correct.value) index.value += 1
    selected.value = null
    checked.value = false
  }

  function restart() {
    index.value = 0
    selected.value = null
    checked.value = false
  }

  return { index, selected, checked, check, complete, question, answerText, sentence, correct, choose, proceed, restart, total: questions.length }
}
