import assert from 'node:assert/strict'
import { test } from 'node:test'
import { story } from '../src/data/storyQuiz.js'
import { isCorrect, loadSession, saveSession } from '../src/composables/storySession.js'

test('story session resumes completed checkpoints and rejects skipped or corrupt progress', () => {
  let raw
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value } }
  const empty = { index: 0, answers: {}, mistakes: 0 }
  assert.deepEqual(loadSession(story, storage), empty)
  const session = { index: 3, answers: { understand: ['tea'] }, mistakes: 1 }
  assert.equal(saveSession(story, session, storage), true)
  assert.deepEqual(loadSession(story, storage), session)
  for (const invalid of [
    { ...session, answers: {} }, { ...session, answers: { understand: ['buy'] } },
    { ...session, index: 999 }, { ...session, index: -1 }, { ...session, index: 1.5 },
    { ...session, mistakes: -1 }, { ...session, answers: null },
  ]) { raw = JSON.stringify(invalid); assert.deepEqual(loadSession(story, storage), empty) }
  raw = '{broken'; assert.deepEqual(loadSession(story, storage), empty)
  assert.equal(saveSession(story, session, undefined), false)
  assert.deepEqual(loadSession(story, { getItem() { throw Error('blocked') } }), empty)
})

test('checkpoint grading respects blank and event order and restores a solved current step', () => {
  const quizzes = story.steps.filter(s => s.answer)
  assert.equal(quizzes.length, 5)
  for (const step of quizzes) {
    assert.equal(isCorrect(step, step.answer), true)
    assert.equal(isCorrect(step, []), false)
    assert.equal(isCorrect(step, null), false)
    assert.equal(isCorrect(step, [...step.answer, step.answer[0]]), false)
    assert.ok(step.answer.every(id => step.options.some(o => o.id === id)))
    if (step.answer.length > 1) assert.equal(isCorrect(step, [...step.answer].reverse()), false)
  }
  const answers = Object.fromEntries(quizzes.map(s => [s.id, s.answer]))
  const full = { index: story.steps.length, answers, mistakes: 2 }
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify(full) }), full)
  const current = { index: 1, answers: { understand: ['tea'] }, mistakes: 0 }
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify(current) }), current)
  const future = { index: 0, answers, mistakes: 0 }
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify(future) }).answers, {})
})
