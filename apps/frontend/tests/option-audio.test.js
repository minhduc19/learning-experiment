import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { ref } from 'vue'
import { parseLesson, sampleLesson } from '../src/composables/lessonJson.js'
import { useOptionAudio } from '../src/composables/useOptionAudio.js'
import { playOptionAudio, stopOptionAudio } from '../src/composables/optionPlayback.js'

const originalFetch = globalThis.fetch, originalAudio = globalThis.Audio
const id = '12345678-1234-1234-1234-123456789abc'
const json = data => ({ ok: true, status: 200, json: async () => data })
afterEach(() => { stopOptionAudio(); globalThis.fetch = originalFetch; globalThis.Audio = originalAudio })
function mock(handler) {
  globalThis.fetch = async (path, options) => path === '/api/auth/refresh'
    ? json({ access_token: 'test', user: { id: 'alice' } }) : handler(path, options)
}

test('all options including distractors get audio; duplicate texts reuse one request; only failures retry once', async () => {
  const lesson = structuredClone(sampleLesson)
  lesson.items.push({ ...structuredClone(lesson.items[0]), id: 'duplicate' })
  const text = ref(JSON.stringify(lesson)), requests = []
  mock((_, options) => {
    const body = JSON.parse(options.body); requests.push(body)
    if (body.text === '走路') return json({ status: 'failed', attempts: body.retry ? 2 : 1, can_retry: !body.retry })
    return json({ status: 'ready', audio_id: id, attempts: 1, can_retry: false })
  })
  const audio = useOptionAudio(text)
  await audio.generate()
  assert.deepEqual(requests, [{ text: '学习', retry: false, provider: 'piper', voice_id: null }, { text: '走路', retry: false, provider: 'piper', voice_id: null }])
  const document = parseLesson(text.value)
  assert.equal(document.items[0].data.options[0].audio_id, id)
  assert.equal(document.items[1].data.options[0].audio_id, id)
  assert.equal(audio.canGenerate.value, false)
  assert.equal(audio.canRetry.value, true)
  await audio.generate(); assert.equal(requests.length, 2)
  await audio.generate(true)
  assert.deepEqual(requests.at(-1), { text: '走路', retry: true, provider: 'piper', voice_id: null })
  assert.equal(audio.canRetry.value, false)
  await audio.generate(true); assert.equal(requests.length, 3)
  assert.equal(parseLesson(text.value).items[0].data.options[0].audio_id, id)
})

test('editing a label invalidates its recording; new text can generate without repeating successful options', async () => {
  const text = ref(JSON.stringify(sampleLesson))
  mock(() => json({ status: 'ready', audio_id: id, attempts: 1, can_retry: false }))
  const audio = useOptionAudio(text)
  await audio.generate()
  const doc = JSON.parse(text.value)
  doc.items[0].data.options[0].label = '新文字'
  text.value = JSON.stringify(doc)
  assert.equal(parseLesson(text.value).items[0].data.options[0].audio_id, undefined)
  assert.equal(audio.canGenerate.value, true)
  await audio.generate()
  assert.equal(parseLesson(text.value).items[0].data.options[0].audio_text, '新文字')
  assert.throws(() => parseLesson(text.value.replaceAll(id, 'https://example.com/audio')), /audio_id/)
})

test('transport failures preserve JSON and allow one explicit retry', async () => {
  const text = ref(JSON.stringify(sampleLesson)), before = text.value
  mock(() => { throw new Error('Offline') })
  const audio = useOptionAudio(text)
  await audio.generate()
  assert.equal(text.value, before)
  assert.equal(audio.canRetry.value, true)
  await audio.generate(true)
  assert.equal(audio.canRetry.value, false)
  assert.equal(text.value, before)
})

test('playback fetches private audio with authorization and stops previous audio', async () => {
  const players = [], requests = []
  globalThis.Audio = class {
    constructor(url) { this.url = url; players.push(this) }
    async play() { this.played = true }
    pause() { this.paused = true }
  }
  mock((path, options) => {
    requests.push({ path, authorization: options.headers.get('Authorization') })
    return { ok: true, blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }) }
  })
  const option = { audio_id: id, audio_text: '学习', label: '学习' }
  const owner = Symbol('quiz')
  await playOptionAudio(option, owner)
  assert.equal(players[0].played, true)
  assert.equal(requests[0].authorization, 'Bearer test')
  await playOptionAudio(option, owner)
  assert.equal(players[0].paused, true)
  assert.equal(players[1].played, true)
  await playOptionAudio({ ...option, label: 'changed' }, owner)
  assert.equal(players[1].paused, true)
  assert.equal(requests.length, 2, 'Stale audio is never fetched')
})

test('playback errors are recoverable and stale fetches cannot play after a newer selection', async () => {
  const players = []
  globalThis.Audio = class { constructor() { players.push(this) } async play() {} pause() {} }
  let resolveFirst
  let requests = 0
  mock(() => ++requests === 1 ? new Promise(resolve => { resolveFirst = resolve })
    : { ok: true, blob: async () => new Blob(['second']) })
  const option = { audio_id: id, audio_text: 'a', label: 'a' }, owner = Symbol('quiz')
  const first = playOptionAudio(option, owner)
  await new Promise(resolve => setImmediate(resolve))
  await playOptionAudio(option, owner)
  resolveFirst({ ok: true, blob: async () => new Blob(['first']) })
  await first
  assert.equal(players.length, 1)
  mock(() => ({ ok: false }))
  await assert.rejects(playOptionAudio(option, owner), /Could not play audio/)
})

test('Piper is default; changing provider invalidates draft recordings and sends ElevenLabs settings', async () => {
  const { nextTick } = await import('vue')
  const text = ref(JSON.stringify(sampleLesson)), bodies = []
  mock((_, options) => { bodies.push(JSON.parse(options.body)); return json({ status:'ready', audio_id:id, attempts:1 }) })
  const audio = useOptionAudio(text)
  assert.equal(audio.provider.value, 'piper')
  await audio.generate()
  assert.ok(bodies.every(body => body.provider === 'piper' && body.voice_id === null))
  audio.provider.value = 'elevenlabs'
  await nextTick()
  assert.equal(parseLesson(text.value).items[0].data.options[0].audio_id, undefined)
  assert.equal(audio.canGenerate.value, true)
  await audio.generate()
  assert.equal(bodies.at(-1).provider, 'elevenlabs')
  assert.equal(bodies.at(-1).voice_id, 'MI36FIkp9wRP7cpWKPTl')
})

test('one explicit retry after a busy rejection can start the unattempted job', async () => {
  const text = ref(JSON.stringify(sampleLesson)), requests = []
  let busy = true
  mock((_, options) => {
    requests.push(JSON.parse(options.body))
    return busy ? { ok:false, status:429, json:async()=>({ detail:'Piper is busy' }) }
      : json({ status:'ready', audio_id:id, attempts:1 })
  })
  const audio = useOptionAudio(text)
  await audio.generate()
  busy = false
  await audio.generate(true)
  assert.ok(requests.every(body => body.retry === false))
  assert.equal(audio.canRetry.value, false)
  assert.ok(parseLesson(text.value).items[0].data.options[0].audio_id)
})
