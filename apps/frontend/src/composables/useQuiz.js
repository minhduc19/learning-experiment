import { computed, ref } from 'vue'
import { questions } from '../data/questions.js'

export function useQuiz() {
  const index = ref(0)
  const selected = ref(null)
  const complete = computed(() => index.value === questions.length)
  const question = computed(() => questions[index.value])
  const correct = computed(() => selected.value?.id === question.value?.answer && selected.value !== null)

  function choose(option) {
    if (!complete.value && !selected.value && question.value.options.includes(option)) selected.value = option
  }

  function proceed() {
    if (!selected.value) return
    if (correct.value) index.value += 1
    selected.value = null
  }

  function restart() {
    index.value = 0
    selected.value = null
  }

  return { index, selected, complete, question, correct, choose, proceed, restart, total: questions.length }
}
