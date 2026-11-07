import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { normalizeActivityPrompt, audioPromptUrl, demoAudioPrompt } from '../src/composables/activityPrompt.js'
import { parseLesson, sampleLesson } from '../src/composables/lessonJson.js'
import { useQuiz } from '../src/composables/useQuiz.js'
import { playPromptAudio, playOptionAudio, stopOptionAudio } from '../src/composables/optionPlayback.js'

const originalAudio = globalThis.Audio
afterEach(() => { stopOptionAudio(); globalThis.Audio = originalAudio })

test('legacy question keys normalize without mutating inputs or dropping explicit visibility', () => {
  const legacy = { sentence: 'I [[blank]] an apple.', 'text-prompt-available': false }
  const normalized = normalizeActivityPrompt(legacy)
  assert.equal(normalized['text-prompt'], legacy.sentence)
  assert.equal(normalized['text-prompt-available'], false)
  assert.equal(normalized['audio-prompt'], null)
  assert.equal(normalized.sentence, undefined)
  assert.ok(legacy.sentence)
  assert.equal(normalizeActivityPrompt({ prompt: null })['text-prompt-available'], false)
  assert.equal(normalizeActivityPrompt({ prompt: 'I eat.' })['text-prompt'], 'I eat.')
  assert.throws(() => normalizeActivityPrompt({ sentence: 'old', 'text-prompt': 'new' }), /Conflicting/)
})

test('lesson JSON writes canonical keys while accepting old saved questions', () => {
  const lesson = structuredClone(sampleLesson)
  const q = lesson.items[0].data
  q.sentence = q['text-prompt']; delete q['text-prompt']; delete q['text-prompt-available']; delete q['audio-prompt']
  const parsed = parseLesson(JSON.stringify(lesson)).items[0].data
  assert.equal(parsed['text-prompt'], q.sentence)
  assert.equal(parsed['text-prompt-available'], true)
  assert.equal(parsed.sentence, undefined)
  const quiz = useQuiz({ items: [q] })
  assert.equal(quiz.question.value['text-prompt'], q.sentence)
  assert.equal(quiz.sentence.value, q.sentence.replace('[[blank]]', '___'))
})

test('prompt flags are strict booleans and audio only accepts HTTP(S) URLs', () => {
  for (const value of ['false', 0, null]) {
    const lesson = structuredClone(sampleLesson)
    lesson.items[0].data['text-prompt-available'] = value
    assert.throws(() => parseLesson(JSON.stringify(lesson)), /boolean/)
  }
  for (const value of ['javascript:alert(1)', 'data:audio/mp3;base64,abc', 'file:///tmp/audio', 'https://user:password@example.com/a.mp3', 'not-a-url', 'https://example.com/with space']) {
    assert.equal(audioPromptUrl(value), null)
    const lesson = structuredClone(sampleLesson)
    lesson.items[0].data['audio-prompt'] = value
    assert.throws(() => parseLesson(JSON.stringify(lesson)), /HTTP/)
  }
  assert.equal(audioPromptUrl(demoAudioPrompt.replace('https:', 'http:')), demoAudioPrompt)
  const lesson = structuredClone(sampleLesson)
  lesson.items[0].data['audio-prompt'] = demoAudioPrompt
  lesson.items[0].data['text-prompt-available'] = false
  assert.equal(parseLesson(JSON.stringify(lesson)).items[0].data['audio-prompt'], demoAudioPrompt)
})

test('prompt playback is explicit, interrupts previous media, and cleans up on stop', async () => {
  const players = []
  globalThis.Audio = class {
    constructor(src) { this.src = src; players.push(this) }
    async play() { this.played = true }
    pause() { this.paused = true }
  }
  const first = Symbol('first'), second = Symbol('second')
  let stopped = 0
  await playPromptAudio(demoAudioPrompt, first, () => {}, () => stopped++)
  assert.equal(players[0].played, true)
  await playPromptAudio(demoAudioPrompt, second)
  assert.equal(players[0].paused, true)
  assert.equal(stopped, 1)
  // Choosing a silent option also stops a playing prompt.
  await playOptionAudio({ label: 'silent' }, Symbol('option'))
  assert.equal(players[1].paused, true)
})
