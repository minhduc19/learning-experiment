import { computed, ref } from 'vue'

export function useReadingProgress(blocks) {
  const passed = ref(new Set())
  const checkpointIndex = computed(() => blocks.findIndex(block => block.type === 'Multiple-choice' && !passed.value.has(block.id)))
  const visibleBlocks = computed(() => checkpointIndex.value < 0 ? blocks : blocks.slice(0, checkpointIndex.value + 1))
  const complete = computed(() => checkpointIndex.value < 0)

  function unlock(id) {
    if (blocks[checkpointIndex.value]?.id === id) passed.value.add(id)
  }

  return { passed, visibleBlocks, complete, unlock }
}
