import { computed, ref } from 'vue'
import { shuffle } from './shuffle.js'

export function useSentenceJumble(items) {
  const index = ref(0), selected = ref([]), checked = ref(false), correct = ref(false)
  const banks = ref(items.map(item => shuffle(item.tiles)))
  const total = items.length
  const complete = computed(() => index.value === total)
  const question = computed(() => items[index.value])
  const answer = computed(() => selected.value.map(id => question.value.tiles.find(tile => tile.id === id)))
  const bank = computed(() => banks.value[index.value] ?? [])
  function choose(id) {
    if (complete.value || checked.value || selected.value.includes(id) || !question.value.tiles.some(tile => tile.id === id)) return
    selected.value.push(id)
  }
  function remove(id) {
    if (!checked.value) selected.value = selected.value.filter(value => value !== id)
  }
  function check() {
    if (complete.value || checked.value || !selected.value.length) return
    correct.value = question.value.answers.some(ids => ids.length === selected.value.length && ids.every((id, position) => id === selected.value[position]))
    checked.value = true
  }
  function proceed() {
    if (!checked.value) return
    if (correct.value) { index.value++; selected.value = [] }
    checked.value = false; correct.value = false
  }
  function restart() {
    index.value = 0; selected.value = []; checked.value = false; correct.value = false
    banks.value = items.map(item => shuffle(item.tiles))
  }
  return { index, selected, checked, correct, total, complete, question, answer, bank, choose, remove, check, proceed, restart }
}
