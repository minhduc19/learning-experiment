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

test('Continue reveals one paragraph at a time and stops at unanswered checkpoints', async () => {
  const { visibleStorySteps, advanceStorySession } = await import('../src/composables/storySession.js')
  const story = { id: 'paragraph-test', steps: [
    { id: 'opening', type: 'read', lines: [{ id: 'narration' }, { id: 'dialogue' }, { id: 'reply' }] },
    { id: 'quiz', type: 'choice', answer: ['right'] },
    { id: 'ending', type: 'read', lines: [{ id: 'end-1' }, { id: 'end-2' }] },
  ] }
  let session = { index: 0, answers: {}, mistakes: 0 }
  assert.equal(visibleStorySteps(story, session)[0].lines.length, 1)
  session = advanceStorySession(story, session)
  assert.equal(session.index, 0)
  assert.equal(visibleStorySteps(story, session)[0].lines.length, 2)
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify(session) }), session)
  session = advanceStorySession(story, session)
  assert.equal(visibleStorySteps(story, session)[0].lines.length, 3)
  session = advanceStorySession(story, session)
  assert.equal(session.index, 1)
  assert.equal(visibleStorySteps(story, session).length, 2)
  assert.equal(advanceStorySession(story, session), session, 'cannot skip a quiz')
  session.answers.quiz = ['wrong']
  assert.equal(advanceStorySession(story, session), session)
  session.answers.quiz = ['right']
  session = advanceStorySession(story, session)
  assert.equal(visibleStorySteps(story, session)[2].lines.length, 1)
  session = advanceStorySession(story, session)
  assert.equal(session.index, 2, 'last paragraph must be revealed before completion')
  session = advanceStorySession(story, session)
  assert.equal(session.index, 3)
  assert.equal(visibleStorySteps(story, session)[2].lines.length, 2)
  for (const paragraph of [-1, 0.5, 3, '1']) {
    assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify({ index: 0, paragraph, answers: {}, mistakes: 0 }) }), { index: 0, answers: {}, mistakes: 0 })
  }
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify({ index: 0, answers: {}, mistakes: 0 }) }), { index: 0, answers: {}, mistakes: 0 })
})

test('all-paragraph mode reveals consecutive passages up to a quiz without skipping it', async () => {
  const { revealStoryUntilQuiz, visibleStorySteps, advanceStorySession } = await import('../src/composables/storySession.js')
  const story = { id: 'reading-modes', steps: [
    { id: 'first', type: 'read', lines: [{ id: 'a' }, { id: 'b' }] },
    { id: 'second', type: 'read', lines: [{ id: 'c' }] },
    { id: 'quiz', type: 'choice', answer: ['right'] },
    { id: 'final', type: 'read', lines: [{ id: 'd' }, { id: 'e' }] },
  ] }
  const original = { index: 0, paragraph: 1, answers: {}, mistakes: 2 }
  const batch = revealStoryUntilQuiz(story, original)
  assert.equal(batch.index, 2)
  assert.deepEqual(visibleStorySteps(story, batch).map(step => step.id), ['first', 'second', 'quiz'])
  assert.equal(visibleStorySteps(story, batch)[0].lines.length, 2)
  assert.equal(advanceStorySession(story, batch), batch, 'quiz remains gated')
  assert.equal(original.index, 0, 'does not mutate saved source progress')
  assert.equal(batch.mistakes, 2)
  assert.deepEqual(loadSession(story, { getItem: () => JSON.stringify(batch) }), batch)
  batch.answers.quiz = ['right']
  const ending = revealStoryUntilQuiz(story, advanceStorySession(story, batch))
  assert.equal(ending.index, 3, 'revealing the ending does not mark the story complete')
  assert.equal(ending.paragraph, 1)
  assert.equal(visibleStorySteps(story, ending).at(-1).lines.length, 2)
  const complete = advanceStorySession(story, ending)
  assert.equal(complete.index, 4)
  assert.equal(revealStoryUntilQuiz(story, complete), complete)
  assert.equal(visibleStorySteps(story, original)[0].lines.length, 2, 'single-paragraph behavior is unchanged')
})
