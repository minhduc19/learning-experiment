import assert from 'node:assert/strict'
import { test } from 'node:test'
import { story } from '../src/data/readingExercises/little-horse-river.js'
import { advanceStorySession, visibleStorySteps } from '../src/composables/storySession.js'

const passages = story.steps.filter(step => step.type === 'read').flatMap(step => step.lines)
const passageText = passages.flatMap(line => line.words).map(word => word.text).join('')

test('river story has 1000+ Chinese characters, dialogue, repeated elementary vocabulary, and phrase lookups', () => {
  assert.ok(passageText.match(/\p{Script=Han}/gu).length >= 1000)
  assert.ok(passages.filter(line => line.speaker).length > passages.length / 2)
  for (const phrase of ['小马', '妈妈', '面粉', '看看', '不一样', '一步一步']) {
    assert.ok(passageText.split(phrase).length - 1 >= 3, `repeat useful vocabulary: ${phrase}`)
  }
  for (const step of story.steps) {
    for (const line of step.lines ?? []) {
      assert.ok(!line.speaker || story.characters[line.speaker], `unknown speaker ${line.speaker}`)
    }
    const groups = [
      ...(step.lines ?? []).map(line => line.words),
      ...(step.options ?? []).map(option => option.words),
      ...['before', 'between', 'after'].filter(key => step[key]).map(key => step[key]),
    ]
    for (const group of groups) {
      for (const word of group) {
        if (/\p{Script=Han}/u.test(word.text)) {
          assert.ok(word.pinyin?.trim(), `missing pinyin: ${word.text}`)
          assert.ok(word.meaning?.trim(), `missing meaning: ${word.text}`)
          assert.ok(word.text.length <= 6, `oversized lookup: ${word.text}`)
          assert.ok(!/[，。！？；：“”]/u.test(word.text), `sentence-sized lookup: ${word.text}`)
        } else {
          assert.equal(word.pinyin, undefined)
          assert.equal(word.meaning, undefined)
        }
      }
    }
  }
  const words = passages.flatMap(line => line.words)
  assert.equal(words.find(word => word.text === '背着').pinyin, 'bēi zhe')
  assert.equal(words.find(word => word.text === '长大').pinyin, 'zhǎng dà')
  assert.equal(words.find(word => word.text === '对我来说').meaning, 'for me; from my point of view')
})

test('all five quiz types have valid answers and the story works with paragraph progression', () => {
  const quizzes = story.steps.filter(step => step.answer)
  assert.deepEqual(new Set(quizzes.map(step => step.type)), new Set(['choice', 'word', 'blanks', 'prediction', 'order']))
  assert.equal(new Set(story.steps.map(step => step.id)).size, story.steps.length)
  const lineIds = passages.map(line => line.id)
  assert.equal(new Set(lineIds).size, lineIds.length)
  for (const quiz of quizzes) {
    assert.ok(quiz['target-phrase']?.trim())
    assert.ok(quiz.hint?.trim() && quiz.explanation?.trim())
    assert.equal(new Set(quiz.options.map(option => option.id)).size, quiz.options.length)
    assert.ok(quiz.answer.every(id => quiz.options.some(option => option.id === id)))
  }
  let session = { index: 0, answers: {}, mistakes: 0 }
  let reveals = 0
  while (session.index < story.steps.length) {
    const active = story.steps[session.index]
    if (active.type === 'read') {
      assert.equal(visibleStorySteps(story, session).at(-1).lines.length, (session.paragraph ?? 0) + 1)
      reveals++
    } else {
      assert.equal(advanceStorySession(story, session), session, 'unanswered quiz gates progression')
      session.answers[active.id] = active.answer
    }
    session = advanceStorySession(story, session)
  }
  assert.equal(reveals, passages.length)
})
