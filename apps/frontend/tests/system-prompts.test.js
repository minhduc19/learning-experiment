import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { useSystemPrompts } from '../src/composables/useSystemPrompts.js'
import { defaultSystemPrompt } from '../src/data/aiSystemPrompt.js'

const originalFetch = globalThis.fetch
const first = { id: 'first', title: 'First multiple choice quiz', content: 'First instructions', revision: 1 }
const second = { id: 'second', title: 'Second quiz', content: 'Second instructions', revision: 1 }
const ok = data => ({ ok: true, status: 200, json: async () => structuredClone(data) })
afterEach(() => { globalThis.fetch = originalFetch })
function mock(handler) {
  globalThis.fetch = async (path, options) => path === '/api/auth/refresh'
    ? ok({ access_token: 'test', user: { id: 'alice' } }) : handler(path, options)
}

test('the seeded backend prompt preserves the current default prompt exactly', () => {
  const backendDefault = readFileSync(new URL('../../backend/app/ai/default_system_prompt.txt', import.meta.url), 'utf8')
  assert.equal(backendDefault, defaultSystemPrompt)
})

test('load, read, create, select, and rename keep sending selection explicit', async () => {
  const requests = []
  mock((path, options) => {
    requests.push({ path, ...options })
    if (options.method === 'POST') return ok({ items: [first, second], selected_id: first.id })
    if (path.endsWith('/second/select')) return ok({ items: [first, second], selected_id: second.id })
    if (options.method === 'PUT') return ok({ items: [first, { ...second, title: 'Renamed', content: 'Edited', revision: 2 }], selected_id: second.id })
    return ok({ items: [first], selected_id: first.id })
  })
  const library = useSystemPrompts()
  await library.load()
  assert.equal(library.selected.value.id, first.id)
  library.edit()
  assert.equal(library.dirty.value, true)
  assert.equal(library.canSave.value, false)
  library.draft.value.title = second.title
  library.draft.value.content = second.content
  await library.save()
  assert.equal(library.selected.value.id, first.id)
  assert.equal(library.viewing.value.id, second.id)
  assert.equal(library.dirty.value, false)
  await library.select(second)
  assert.equal(library.selected.value.id, second.id)
  library.viewingId.value = first.id
  assert.equal(library.selected.value.id, second.id, 'Reading another prompt does not select it')
  library.edit(second)
  library.draft.value.title = 'Renamed'
  library.draft.value.content = 'Edited'
  await library.save()
  assert.equal(library.selected.value.title, 'Renamed')
  assert.equal(library.selected.value.content, 'Edited')
  assert.deepEqual(JSON.parse(requests.at(-1).body), { title: 'Renamed', content: 'Edited', revision: 1 })
})

test('failed save preserves edits and selection, and cancel discards only the draft', async () => {
  mock((_, options) => options.method === 'PUT'
    ? { ok: false, status: 409, json: async () => ({ detail: 'Changed elsewhere' }) }
    : ok({ items: [first], selected_id: first.id }))
  const library = useSystemPrompts()
  await library.load()
  library.edit(first)
  library.draft.value.content = 'My unsaved edits'
  await library.save()
  assert.equal(library.error.value, 'Changed elsewhere')
  assert.equal(library.draft.value.content, 'My unsaved edits')
  assert.equal(library.selected.value.content, first.content)
  assert.equal(library.dirty.value, true)
  await library.load()
  assert.equal(library.draft.value.content, 'My unsaved edits', 'Reload keeps the draft available to copy')
  library.cancel()
  assert.equal(library.dirty.value, false)
  assert.equal(library.selected.value.content, first.content)
})

test('deleting the selection clears it and empty libraries stay empty', async () => {
  mock((_, options) => options.method === 'DELETE'
    ? ok({ items: [], selected_id: null }) : ok({ items: [first], selected_id: first.id }))
  const library = useSystemPrompts()
  await library.load()
  await library.remove(first)
  assert.equal(library.selected.value, null)
  assert.equal(library.viewing.value, null)
  assert.deepEqual(library.items.value, [])
})

test('failed loading never invents a sending prompt; unmounted requests cannot update state', async () => {
  mock(() => { throw new Error('Offline') })
  const library = useSystemPrompts()
  await library.load()
  assert.equal(library.selected.value, null)
  assert.equal(library.loaded.value, false)
  assert.equal(library.error.value, 'Offline')
  let resolve
  mock(() => new Promise(done => { resolve = done }))
  const pending = library.load()
  await new Promise(done => setImmediate(done))
  assert.equal(library.busy.value, true)
  library.dispose()
  resolve(ok({ items: [first], selected_id: first.id }))
  await pending
  assert.equal(library.selected.value, null)
})
