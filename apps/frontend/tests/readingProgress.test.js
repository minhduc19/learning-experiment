import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ref } from 'vue'
import { useReadingProgress } from '../src/composables/useReadingProgress.js'

test('reading stops at each checkpoint, preserves previous content, and completes', () => {
  const blocks = [
    { id: 's1', type: 'sentence' },
    { id: 'q1', type: 'Multiple-choice' },
    { id: 's2', type: 'sentence' },
    { id: 'q2', type: 'Multiple-choice' },
    { id: 's3', type: 'sentence' },
  ]
  const progress = useReadingProgress(blocks)
  assert.deepEqual(progress.visibleBlocks.value.map(block => block.id), ['s1', 'q1'])
  progress.unlock('q2')
  assert.equal(progress.visibleBlocks.value.length, 2, 'cannot skip a checkpoint')
  progress.unlock('q1')
  assert.deepEqual(progress.visibleBlocks.value.map(block => block.id), ['s1', 'q1', 's2', 'q2'])
  assert.equal(progress.complete.value, false)
  progress.unlock('q1')
  assert.equal(progress.visibleBlocks.value.length, 4, 'repeated events do not skip ahead')
  progress.unlock('q2')
  assert.equal(progress.complete.value, true)
  assert.deepEqual(progress.visibleBlocks.value, blocks)
})

test('handles a checkpoint at the start, consecutive checkpoints, and no checkpoints', () => {
  const progress = useReadingProgress([{ id: 'q1', type: 'Multiple-choice' }, { id: 'q2', type: 'Multiple-choice' }])
  assert.equal(progress.visibleBlocks.value.length, 1)
  progress.unlock('q1')
  assert.equal(progress.visibleBlocks.value.length, 2)
  assert.equal(progress.complete.value, false)
  progress.unlock('q2')
  assert.equal(progress.complete.value, true)
  assert.equal(useReadingProgress([{ type: 'sentence' }]).complete.value, true)
})


test('loading a different reading updates blocks and resets checkpoint progress', () => {
  const blocks = ref([{ id: 'q1', type: 'Multiple-choice' }])
  const progress = useReadingProgress(blocks)
  progress.unlock('q1')
  assert.equal(progress.complete.value, true)
  blocks.value = [{ id: 's2', type: 'sentence' }, { id: 'q1', type: 'Multiple-choice' }]
  assert.equal(progress.complete.value, false)
  assert.equal(progress.passed.value.size, 0)
  assert.equal(progress.visibleBlocks.value.length, 2)
})
