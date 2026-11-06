import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useVocabularyProgress } from '../src/composables/useVocabularyProgress.js'

test('segment marks use segment IDs, independent requests, and survive out-of-order responses', async () => {
  const calls = []
  const state = useVocabularyProgress({ id: 12 }, 'segments', 'segment_id', (path, options) => new Promise(resolve => calls.push({ path, options, resolve })))
  const learned = state.toggle('learned'), learning = state.toggle('learning')
  assert.equal(state.learned, true)
  assert.equal(state.learning, true)
  assert.ok(calls.every(call => call.path === '/api/corpus/segments/12/progress'))
  assert.deepEqual(calls.map(call => JSON.parse(call.options.body)), [{ learned: true }, { learning: true }])
  calls[1].resolve({ ok: true, json: async () => ({ segment_id: 12, learned: true, learning: true }) })
  await learning
  calls[0].resolve({ ok: true, json: async () => ({ segment_id: 12, learned: true, learning: false }) })
  await learned
  assert.equal(state.learned, true)
  assert.equal(state.learning, true)
})

test('a character-shaped response cannot confirm a segment mark', async () => {
  const state = useVocabularyProgress({ id: 12 }, 'segments', 'segment_id', async () => ({ ok: true, json: async () => ({ character_id: 12, learned: true }) }))
  await state.toggle('learned')
  assert.equal(state.learned, false)
  assert.match(state.errors.learned, /Could not save/)
})
