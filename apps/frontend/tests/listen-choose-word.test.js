import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const data = JSON.parse(readFileSync(new URL('../src/data/listenChooseWord.json', import.meta.url)))
test('listening exercises have three distinct answers, two distractors, and bundled WAV audio', () => {
  assert.ok(data.exercises.length)
  assert.equal(new Set(data.exercises.map(item => item.id)).size, data.exercises.length)
  for (const exercise of data.exercises) {
    assert.equal(exercise.options.length, 5)
    assert.equal(new Set(exercise.options.map(option => option.id)).size, 5)
    assert.equal(exercise.spokenIds.length, 3)
    assert.equal(new Set(exercise.spokenIds).size, 3)
    for (const id of exercise.spokenIds) assert.ok(exercise.options.some(option => option.id === id))
    for (const option of exercise.options) {
      for (const key of ['text', 'pinyin', 'translation']) assert.ok(option[key]?.trim())
    }
    const wav = readFileSync(new URL('../public' + exercise.audio, import.meta.url))
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF')
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE')
    assert.ok(wav.length > 1000)
  }
})
