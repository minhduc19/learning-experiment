import assert from 'node:assert/strict'
import { test } from 'node:test'
import { story } from '../src/data/readingExercises/fox-tiger.js'
import { advanceStorySession, visibleStorySteps, revealStoryUntilQuiz } from '../src/composables/storySession.js'

const passages = story.steps.filter(step => step.type === 'read').flatMap(step => step.lines)
const text = passages.flatMap(line => line.words).map(word => word.text).join('')

test('fox story has substantial dialogue, 1000+ Chinese characters, and repeated elementary vocabulary', () => {
  assert.ok(text.match(/\p{Script=Han}/gu).length >= 1000)
  assert.ok(passages.filter(line => line.speaker).length > passages.length / 2)
  for (const phrase of ['狐狸', '老虎', '看见', '后面', '为什么', '害怕']) {
    assert.ok(text.split(phrase).length - 1 >= 3, `repeat useful vocabulary: ${phrase}`)
  }
  assert.equal(new Set(passages.map(line => line.id)).size, passages.length)
  for (const line of passages) assert.ok(!line.speaker || story.characters[line.speaker])
})

test('every Chinese word or phrase has its own annotation, including contextual meanings of 假', () => {
  for (const step of story.steps) {
    const groups = [
      ...(step.lines ?? []).map(line => line.words),
      ...(step.options ?? []).map(option => option.words),
      ...['before', 'between', 'after'].filter(key => step[key]).map(key => step[key]),
    ]
    for (const group of groups) for (const word of group) {
      if (/\p{Script=Han}/u.test(word.text)) {
        assert.ok(word.pinyin?.trim(), `missing pinyin: ${word.text}`)
        assert.ok(word.meaning?.trim(), `missing meaning: ${word.text}`)
        assert.ok(word.text.length <= 6, `oversized lookup: ${word.text}`)
        assert.ok(!/[，。！？；：“”]/u.test(word.text), `sentence lookup: ${word.text}`)
      } else {
        assert.equal(word.pinyin, undefined)
        assert.equal(word.meaning, undefined)
      }
    }
  }
  const closing = passages.find(line => line.id === 'closing')
  const meanings = closing.words.filter(word => word.text === '假')
  assert.equal(meanings.length, 2)
  assert.match(meanings[0].meaning, /borrow/)
  assert.match(meanings[1].meaning, /false; pretend/)
  assert.equal(meanings[0].pinyin, 'jiǎ')
  assert.equal(passages.flatMap(line => line.words).find(word => word.text === '爪子').pinyin, 'zhuǎ zi')
})

test('all five quiz types have valid answers and both reading modes complete without skipping quizzes', () => {
  const quizzes = story.steps.filter(step => step.answer)
  assert.deepEqual(new Set(quizzes.map(step => step.type)), new Set(['choice', 'word', 'blanks', 'prediction', 'order']))
  assert.equal(new Set(story.steps.map(step => step.id)).size, story.steps.length)
  for (const quiz of quizzes) {
    assert.ok(quiz['target-phrase']?.trim())
    assert.ok(quiz.hint?.trim() && quiz.explanation?.trim())
    assert.equal(new Set(quiz.options.map(option => option.id)).size, quiz.options.length)
    assert.ok(quiz.answer.every(id => quiz.options.some(option => option.id === id)))
  }
  for (const batch of [false, true]) {
    const reveal = value => batch ? revealStoryUntilQuiz(story, value) : value
    let session = reveal({ index: 0, answers: {}, mistakes: 0 })
    let answered = 0
    while (session.index < story.steps.length) {
      const step = story.steps[session.index]
      if (step.answer) {
        assert.equal(advanceStorySession(story, session), session)
        session.answers[step.id] = step.answer
        answered++
      }
      session = reveal(advanceStorySession(story, session))
    }
    assert.equal(answered, quizzes.length)
    assert.equal(visibleStorySteps(story, session).flatMap(step => step.lines ?? []).length, passages.length)
  }
})
