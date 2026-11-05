import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questions } from '../src/data/questions.js'
import { useQuiz } from '../src/composables/useQuiz.js'

test('each answer has feedback; wrong answers retry and correct answers advance', () => {
  assert.ok(questions.length >= 3)
  for (const [index, question] of questions.entries()) {
    assert.equal(question.options.filter(option => option.id === question.answer).length, 1)
    assert.ok(question.translation)
    for (const option of question.options) {
      assert.ok(option.feedback)
      const quiz = useQuiz()
      quiz.index.value = index
      quiz.choose(option)
      assert.equal(quiz.correct.value, option.id === question.answer)
      quiz.choose(question.options.find(other => other !== option))
      assert.equal(quiz.selected.value.id, option.id, 'selection stays locked during feedback')
      quiz.proceed()
      assert.equal(quiz.index.value, index + Number(option.id === question.answer))
      assert.equal(quiz.selected.value, null)
    }
  }
})

test('unanswered questions cannot advance; lesson completes and restarts', () => {
  const quiz = useQuiz()
  quiz.proceed()
  assert.equal(quiz.index.value, 0)
  for (const question of questions) {
    quiz.choose(question.options.find(option => option.id === question.answer))
    quiz.proceed()
  }
  assert.equal(quiz.complete.value, true)
  quiz.restart()
  assert.equal(quiz.complete.value, false)
  assert.equal(quiz.index.value, 0)
  assert.equal(quiz.selected.value, null)
})
