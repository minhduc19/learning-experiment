import { computed, ref, toValue, watch } from 'vue'

export function useReadingProgress(blocks) {
  const passed = ref(new Set())
  const source = computed(() => toValue(blocks))
  watch(source, () => { passed.value = new Set() }, { flush: 'sync' })
  const checkpointIndex = computed(() => source.value.findIndex(block => block.type === 'Multiple-choice' && !passed.value.has(block.id)))
  const visibleBlocks = computed(() => checkpointIndex.value < 0 ? source.value : source.value.slice(0, checkpointIndex.value + 1))
  const complete = computed(() => checkpointIndex.value < 0)

  function unlock(id) {
    if (source.value[checkpointIndex.value]?.id === id) passed.value.add(id)
  }

  return { passed, visibleBlocks, complete, unlock }
}
