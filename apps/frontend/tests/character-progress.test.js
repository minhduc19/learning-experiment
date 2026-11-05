import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useCharacterProgress } from '../src/composables/useCharacterProgress.js'

const ok = (learned, learning) => ({ ok: true, json: async () => ({ character_id: 7, learned, learning }) })

test('both flags preview immediately and stay selected when responses arrive out of order', async () => {
  const requests = []
  const state = useCharacterProgress({ id: 7 }, (path, options) => new Promise(resolve => {
    requests.push({ path, options, resolve })
  }))
  const learned = state.toggle('learned')
  const learning = state.toggle('learning')
  assert.equal(state.learned, true)
  assert.equal(state.learning, true)
  assert.deepEqual(requests.map(request => JSON.parse(request.options.body)), [{ learned: true }, { learning: true }])
  assert.ok(requests.every(request => request.path === '/api/corpus/characters/7/progress' && request.options.method === 'PATCH'))
  requests[1].resolve(ok(true, true))
  await learning
  requests[0].resolve(ok(true, false))
  await learned
  assert.equal(state.learned, true)
  assert.equal(state.learning, true)
  assert.equal(state.busy.learned, false)
  assert.equal(state.busy.learning, false)
})

test('a failed mark rolls back only that flag and allows retry', async () => {
  let calls = 0
  const state = useCharacterProgress({ id: 7, learned: true }, async () => {
    if (++calls === 1) throw new Error('Offline')
    return ok(true, true)
  })
  await state.toggle('learning')
  assert.equal(state.learned, true)
  assert.equal(state.learning, false)
  assert.match(state.errors.learning, /Could not save/)
  assert.equal(state.busy.learning, false)
  await state.toggle('learning')
  assert.equal(state.learning, true)
  assert.equal(state.errors.learning, '')
})

test('persisted marks can be removed independently and duplicate pending clicks do not toggle twice', async () => {
  let finish
  let count = 0
  const state = useCharacterProgress({ id: 7, learned: true, learning: true }, async (_, options) => {
    count++
    assert.deepEqual(JSON.parse(options.body), { learned: false })
    return new Promise(resolve => { finish = resolve })
  })
  const pending = state.toggle('learned')
  await state.toggle('learned')
  await state.toggle('other')
  assert.equal(count, 1)
  assert.equal(state.learned, false)
  assert.equal(state.learning, true)
  finish(ok(false, true))
  await pending
})

test('HTTP failures and invalid response bodies never appear as saved marks', async () => {
  for (const response of [
    { ok: false, status: 403 },
    { ok: true, json: async () => ({ character_id: 8, learned: true }) },
    { ok: true, json: async () => ({ character_id: 7, learned: 'true' }) },
  ]) {
    const state = useCharacterProgress({ id: 7 }, async () => response)
    await state.toggle('learned')
    assert.equal(state.learned, false)
    assert.match(state.errors.learned, /Could not save/)
  }
})
