import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useQuiz } from '../src/composables/useQuiz.js'
import { strictQuestions } from '../src/data/strictQuestions.js'

test('strict selection locks immediately and checking counts once', () => {
  const quiz = useQuiz({ strict: true, items: strictQuestions })
  const wrong = quiz.question.value.options.find(option => option.id !== quiz.question.value.answer)
  quiz.choose(wrong)
  quiz.choose(quiz.question.value.options.find(option => option.id === quiz.question.value.answer))
  assert.equal(quiz.selected.value.id, wrong.id)
  quiz.check()
  quiz.check()
  assert.equal(quiz.incorrectCount.value, 1)
  assert.equal(quiz.hearts.value, 4)
  quiz.proceed()
  assert.equal(quiz.index.value, 1)
})

test('five mistakes end the attempt and restart clears all session state', () => {
  const quiz = useQuiz({ strict: true, items: strictQuestions })
  for (let count = 0; count < 5; count++) {
    quiz.choose(quiz.question.value.options.find(option => option.id !== quiz.question.value.answer))
    quiz.check()
    assert.equal(quiz.hearts.value, 4 - count)
    assert.equal(quiz.complete.value, false, 'final answer feedback remains visible')
    quiz.proceed()
  }
  assert.equal(quiz.complete.value, true)
  assert.equal(quiz.failed.value, true)
  assert.equal(quiz.incorrectCount.value, 5)
  assert.equal(quiz.results.value.length, 5)
  quiz.restart()
  assert.equal(quiz.hearts.value, 5)
  assert.equal(quiz.index.value, 0)
  assert.equal(quiz.complete.value, false)
  assert.equal(quiz.results.value.length, 0)
})

test('mixed answers finish the whole quiz with accurate totals', () => {
  const quiz = useQuiz({ strict: true, items: strictQuestions })
  for (const [index, question] of strictQuestions.entries()) {
    quiz.choose(question.options.find(option => (option.id === question.answer) === (index % 2 === 0)))
    quiz.check()
    quiz.proceed()
  }
  assert.equal(quiz.complete.value, true)
  assert.equal(quiz.failed.value, false)
  assert.equal(quiz.correctCount.value, 4)
  assert.equal(quiz.incorrectCount.value, 3)
  assert.equal(quiz.hearts.value, 2)
})
