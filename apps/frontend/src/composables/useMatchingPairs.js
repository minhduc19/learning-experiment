import { computed, ref } from 'vue'
import { shuffle } from './shuffle.js'

export function useMatchingPairs(pairs) {
  if (!Array.isArray(pairs) || pairs.length < 2 || pairs.length > 5) {
    throw new Error('Matching activities require 2–5 pairs.')
  }
  const ids = new Set()
  for (const pair of pairs) {
    if (!pair || typeof pair.id !== 'string' || !pair.id.trim() || ids.has(pair.id) ||
      typeof pair.source !== 'string' || !pair.source.trim() || typeof pair.target !== 'string' || !pair.target.trim()) {
      throw new Error('Each pair needs a unique ID and source and target text.')
    }
    ids.add(pair.id)
  }
  const columns = ref([])
  const selected = ref(null)
  const matched = ref([])
  const mismatch = ref([])
  const complete = computed(() => matched.value.length === pairs.length)

  function restart() {
    columns.value = ['source', 'target'].map(side => shuffle(pairs.map(pair => ({
      id: `${side}-${pair.id}`, pairId: pair.id, side, text: pair[side],
    }))))
    selected.value = null
    matched.value = []
    mismatch.value = []
  }

  function choose(card) {
    if (complete.value || mismatch.value.length || matched.value.includes(card.pairId) ||
      !columns.value.some(column => column.includes(card))) return
    if (selected.value?.id === card.id) {
      selected.value = null
      return
    }
    if (!selected.value || selected.value.side === card.side) {
      selected.value = card
      return
    }
    if (selected.value.pairId === card.pairId) {
      matched.value.push(card.pairId)
    } else {
      mismatch.value = [selected.value.id, card.id]
    }
    selected.value = null
  }

  function clearMismatch() { mismatch.value = [] }
  restart()
  return { columns, selected, matched, mismatch, complete, choose, clearMismatch, restart, total: pairs.length }
}
