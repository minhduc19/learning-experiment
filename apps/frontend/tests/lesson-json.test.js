import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseLesson, sampleLesson } from '../src/composables/lessonJson.js'
import { questions } from '../src/data/questions.js'

test('current question bank imports without changing its order or question data', () => {
  const lesson = parseLesson(JSON.stringify(questions))
  assert.deepEqual(lesson.items.map(item => item.data), questions)
  assert.equal(new Set(lesson.items.map(item => item.id)).size, questions.length)
  assert.deepEqual(parseLesson(JSON.stringify(sampleLesson)), sampleLesson)
})
test('ordered items keep placement IDs and can reuse one question', () => {
  const lesson = structuredClone(sampleLesson)
  lesson.items = [{ ...lesson.items[0], id: 'second' }, { ...lesson.items[0], id: 'first' }]
  assert.deepEqual(parseLesson(JSON.stringify(lesson)).items.map(item => item.id), ['second','first'])
})
test('invalid JSON, unsupported types, duplicate placement IDs and invalid answers are rejected', () => {
  assert.throws(() => parseLesson('{'))
  for (const change of [lesson => { lesson.items[0].type='future' }, lesson => { lesson.items.push(lesson.items[0]) }, lesson => { lesson.items[0].data.answer='missing' }, lesson => { lesson.items[0].data.sentence='no blank' }]) {
    const lesson=structuredClone(sampleLesson);change(lesson)
    assert.throws(()=>parseLesson(JSON.stringify(lesson)))
  }
})
