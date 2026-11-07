import { computed, ref } from 'vue'
import { normalizeActivityPrompt } from './activityPrompt.js'
import { shuffle } from './shuffle.js'

export function useSentenceJumble(items) {
  items = items.map(normalizeActivityPrompt)
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
  function move(id, destination, position) {
    if (complete.value || checked.value || !question.value.tiles.some(tile => tile.id === id)) return
    if (destination === 'answer') {
      const remaining = selected.value.filter(value => value !== id)
      remaining.splice(Math.max(0, Math.min(position, remaining.length)), 0, id)
      selected.value = remaining
    } else if (destination === 'bank') {
      remove(id)
      const remaining = banks.value[index.value].filter(tile => tile.id !== id)
      remaining.splice(Math.max(0, Math.min(position, remaining.length)), 0, question.value.tiles.find(tile => tile.id === id))
      banks.value[index.value] = remaining
    }
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
  return { index, selected, checked, correct, total, complete, question, answer, bank, choose, remove, move, check, proceed, restart }
}
