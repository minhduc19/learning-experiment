import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatBytes, importFailure, useCorpusUpload } from '../src/composables/useCorpusUpload.js'

const uploadId = '11111111-1111-4111-8111-111111111111'
const importId = '22222222-2222-4222-8222-222222222222'
const storyId = '33333333-3333-4333-8333-333333333333'
const json = data => ({ ok: true, json: async () => data })
const file = () => new File(['中文故事'], 'story.txt', { lastModified: 1234 })
const completed = () => ({ id: importId, story_id: storyId, status: 'completed', title: 'My story', progress: 1,
  total_bytes: 12, byte_offset: 12, character_count: 4, completed_sentence_count: 1, error: null })

function harness({ stored, patch, fetcher, job = completed() } = {}) {
  const storage = { value: stored || null, getItem() { return this.value }, setItem(key, value) { this.value = value }, removeItem() { this.value = null } }
  let offset = 0
  const requests = []
  const chunks = []
  const defaultFetch = async (path, options) => {
    requests.push({ path, options })
    if (path.endsWith('/limits')) return json({ max_upload_bytes: 1024, max_chunk_bytes: 4 })
    if (path.endsWith('/uploads') && options.method === 'POST') return json({ id: uploadId })
    if (path.endsWith('/uploads/' + uploadId)) return json({ id: uploadId, size: 12, offset_bytes: offset })
    if (path.endsWith('/imports') && options.method === 'POST') return json({ id: importId, story_id: storyId, status: 'queued' })
    if (path.endsWith('/retry')) { job = completed(); return json({ id: importId, story_id: storyId, status: 'queued' }) }
    if (path.endsWith('/imports/' + importId)) return json(job)
    throw new Error('Unexpected path: ' + path)
  }
  const defaultPatch = async args => {
    chunks.push({ offset: args.offset, size: args.chunk.size })
    offset = args.offset + args.chunk.size
    args.onProgress(args.chunk.size)
    return offset
  }
  const uploader = useCorpusUpload({ storage, pollDelay: 100000, fetcher: fetcher ? (...args) => fetcher(defaultFetch, ...args) : defaultFetch,
    patch: patch ? args => patch(defaultPatch, args) : defaultPatch })
  return { uploader, storage, requests, chunks }
}

test('uploads bounded raw chunks, queues exactly once, then monitors the import', async () => {
  const { uploader, chunks, requests, storage } = harness()
  try {
    await uploader.initialize()
    uploader.selectFile(file())
    uploader.title = 'My story'
    await uploader.start()
    assert.deepEqual(chunks, [{ offset: 0, size: 4 }, { offset: 4, size: 4 }, { offset: 8, size: 4 }])
    assert.equal(uploader.phase, 'completed')
    assert.equal(uploader.uploaded, 12)
    assert.equal(requests.filter(r => r.path.endsWith('/imports') && r.options.method === 'POST').length, 1)
    assert.equal(JSON.parse(storage.value).importId, importId)
    assert.equal(uploader.file, null, 'completed uploads release the selected file')
  } finally { uploader.dispose() }
})

test('validates extension, empty files, configured size, and resume file identity', async () => {
  const { uploader } = harness()
  try {
    await uploader.initialize()
    uploader.selectFile(new File(['text'], 'story.pdf'))
    assert.match(uploader.fileError, /\.txt/)
    uploader.selectFile(new File([], 'story.txt'))
    assert.match(uploader.fileError, /empty/)
    uploader.selectFile(new File(['a'.repeat(1025)], 'story.txt'))
    assert.match(uploader.fileError, /limit/)
    assert.equal(uploader.file, null)
  } finally { uploader.dispose() }
})

test('lost chunk acknowledgement resumes from the server offset without duplicating bytes', async () => {
  let fail = true
  const { uploader, chunks } = harness({ patch: async (send, args) => {
    const offset = await send(args)
    if (fail) { fail = false; throw new Error('Lost acknowledgement') }
    return offset
  } })
  try {
    await uploader.initialize()
    uploader.selectFile(file())
    await uploader.start()
    assert.equal(uploader.phase, 'paused')
    await uploader.start()
    assert.equal(uploader.phase, 'completed')
    assert.deepEqual(chunks.map(c => c.offset), [0, 4, 8])
  } finally { uploader.dispose() }
})

test('a 409 after another request committed the chunk is reconciled automatically', async () => {
  let conflict = true
  const { uploader, chunks } = harness({ patch: async (send, args) => {
    const offset = await send(args)
    if (conflict) { conflict = false; const error = new Error('Conflict'); error.status = 409; throw error }
    return offset
  } })
  try {
    await uploader.initialize()
    uploader.selectFile(file())
    await uploader.start()
    assert.equal(uploader.phase, 'completed')
    assert.deepEqual(chunks.map(c => c.offset), [0, 4, 8])
  } finally { uploader.dispose() }
})

test('reloading a partial upload requires the same file and preserves its upload ID', async () => {
  const stored = JSON.stringify({ version: 1, uploadId, importId: null, fileMeta: { name: 'story.txt', size: 12, lastModified: 1234 }, title: 'Saved story' })
  const { uploader, requests } = harness({ stored })
  try {
    await uploader.initialize()
    assert.equal(uploader.phase, 'paused')
    assert.equal(uploader.file, null)
    uploader.selectFile(new File(['中文故事'], 'other.txt', { lastModified: 1234 }))
    assert.match(uploader.fileError, /same, unchanged file/)
    assert.equal(uploader.fileMeta.name, 'story.txt')
    uploader.selectFile(file())
    await uploader.start()
    assert.equal(uploader.phase, 'completed')
    assert.equal(requests.filter(r => r.path.endsWith('/uploads') && r.options.method === 'POST').length, 0)
  } finally { uploader.dispose() }
})

test('a lost queue response retries the same upload ID and does not upload the file again', async () => {
  let loseResponse = true
  const { uploader, requests, chunks } = harness({ fetcher: async (send, path, options) => {
    const response = await send(path, options)
    if (path.endsWith('/imports') && loseResponse) { loseResponse = false; throw new TypeError('Network interrupted') }
    return response
  } })
  try {
    await uploader.initialize()
    uploader.selectFile(file())
    await uploader.start()
    assert.equal(uploader.phase, 'paused')
    await uploader.start()
    assert.equal(uploader.phase, 'completed')
    assert.equal(chunks.length, 3)
    const queues = requests.filter(r => r.path.endsWith('/imports') && r.options.method === 'POST')
    assert.equal(queues.length, 2)
    assert.ok(queues.every(r => JSON.parse(r.options.body).upload_id === uploadId))
  } finally { uploader.dispose() }
})

test('pause aborts the active request and late callbacks cannot change the paused state', async () => {
  let waiting
  let entered
  const started = new Promise(resolve => { entered = resolve })
  const { uploader } = harness({ patch: (send, args) => {
    waiting = args
    entered()
    return new Promise((resolve, reject) => args.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  } })
  try {
    await uploader.initialize()
    uploader.selectFile(file())
    const task = uploader.start()
    await started
    uploader.pause()
    waiting.onProgress(4)
    await task
    assert.equal(uploader.phase, 'paused')
    assert.equal(uploader.inFlight, 0)
    assert.equal(uploader.error, '')
  } finally { uploader.dispose() }
})

test('saved and direct import links monitor without requiring the original file', async () => {
  const { uploader } = harness({ stored: JSON.stringify({ version: 1, importId, uploadId, title: 'Saved title', fileMeta: null }) })
  try {
    await uploader.initialize()
    assert.equal(uploader.phase, 'completed')
    assert.equal(uploader.job.character_count, 4)
    assert.equal(uploader.file, null)
  } finally { uploader.dispose() }
})

test('transient status errors retain the job link and can be checked again', async () => {
  let fail = true
  const { uploader } = harness({ fetcher: async (send, path, options) => {
    if (path.endsWith('/imports/' + importId) && fail) { fail = false; return { ok: false, status: 503 } }
    return send(path, options)
  } })
  try {
    await uploader.initialize(importId)
    assert.equal(uploader.importId, importId)
    assert.match(uploader.error, /unavailable/)
    await uploader.monitor(importId)
    assert.equal(uploader.phase, 'completed')
    assert.equal(uploader.error, '')
  } finally { uploader.dispose() }
})

test('failed imports can retry from their checkpoint; invalid encoding asks for a new file', async () => {
  const { uploader, requests } = harness({ job: { ...completed(), status: 'failed', error: 'Import failed; inspect worker logs and retry' } })
  try {
    await uploader.initialize(importId)
    assert.equal(uploader.phase, 'failed')
    await uploader.retryImport()
    assert.equal(uploader.phase, 'completed')
    assert.ok(requests.some(r => r.path.endsWith('/retry')))
    assert.match(importFailure("'utf-8' codec cannot decode byte"), /Save it as UTF-8/)
  } finally { uploader.dispose() }
})

test('reset clears browser resume metadata and invalid links do not issue import requests', async () => {
  const { uploader, requests, storage } = harness()
  try {
    await uploader.initialize('not-a-uuid')
    assert.match(uploader.error, /invalid/)
    assert.equal(requests.filter(r => r.path.includes('/imports/')).length, 0)
    uploader.reset()
    assert.equal(uploader.phase, 'idle')
    assert.equal(storage.value, null)
    assert.equal(formatBytes(1024 ** 3), '1 GiB')
  } finally { uploader.dispose() }
})

test('restoring a pending upload displays the authoritative saved progress before file reselection', async () => {
  const stored = JSON.stringify({ version: 1, uploadId, importId: null, fileMeta: { name: 'story.txt', size: 12, lastModified: 1234 }, title: 'Saved story' })
  const { uploader, chunks } = harness({ stored, fetcher: async (send, path, options) => path.endsWith('/uploads/' + uploadId)
    ? json({ id: uploadId, size: 12, offset_bytes: 4 }) : send(path, options) })
  try {
    await uploader.initialize()
    assert.equal(uploader.uploaded, 4)
    assert.equal(uploader.file, null)
    uploader.selectFile(file())
    await uploader.start()
    assert.deepEqual(chunks.map(c => c.offset), [4, 8])
    assert.equal(uploader.phase, 'completed')
  } finally { uploader.dispose() }
})

test('a late status response cannot restore a job after starting a different upload', async () => {
  let finish, entered
  const started = new Promise(resolve => { entered = resolve })
  const { uploader } = harness({ fetcher: (send, path, options) => {
    if (path.endsWith('/imports/' + importId)) {
      entered()
      return new Promise(resolve => { finish = resolve })
    }
    return send(path, options)
  } })
  try {
    const initialization = uploader.initialize(importId)
    await started
    uploader.reset()
    finish(json(completed()))
    await initialization
    assert.equal(uploader.phase, 'idle')
    assert.equal(uploader.importId, null)
    assert.equal(uploader.job, null)
  } finally { uploader.dispose() }
})

test('server limit failures can retry without allocating an upload', async () => {
  let fail = true
  const { uploader, requests } = harness({ fetcher: async (send, path, options) => {
    if (path.endsWith('/limits') && fail) { fail = false; return { ok: false, status: 503 } }
    return send(path, options)
  } })
  try {
    await uploader.initialize()
    assert.equal(uploader.limits, null)
    assert.match(uploader.limitsError, /unavailable/)
    await uploader.loadLimits()
    assert.equal(uploader.limits.max_upload_bytes, 1024)
    assert.equal(uploader.limitsError, '')
    assert.equal(requests.filter(r => r.options.method === 'POST').length, 0)
  } finally { uploader.dispose() }
})
