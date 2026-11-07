import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questions } from '../src/data/questions.js'
import { useQuiz } from '../src/composables/useQuiz.js'

test('each answer has feedback; wrong answers retry and correct answers advance', () => {
  assert.ok(questions.length > 0)
  for (const [index, question] of questions.entries()) {
    assert.equal(question.options.filter(option => option.id === question.answer).length, 1)
    assert.ok(question.translation)
    for (const option of question.options) {
      assert.ok(option.feedback)
      const quiz = useQuiz()
      quiz.index.value = index
      quiz.choose(option)
      assert.equal(quiz.correct.value, false)
      quiz.check()
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
    quiz.check()
    quiz.proceed()
  }
  assert.equal(quiz.complete.value, true)
  quiz.restart()
  assert.equal(quiz.complete.value, false)
  assert.equal(quiz.index.value, 0)
  assert.equal(quiz.selected.value, null)
})


test('all selections preview before checking, can change, and reset after feedback', () => {
  const quiz = useQuiz()
  for (const question of questions) {
    assert.ok(question['text-prompt'].includes('[[blank]]'))
    assert.equal(quiz.sentence.value, question['text-prompt'].replaceAll('[[blank]]', '___'))
    quiz.choose(question.options.find(option => option.id !== question.answer))
    assert.equal(quiz.checked.value, false)
    assert.ok(!quiz.sentence.value.includes('___'))
    quiz.proceed()
    assert.equal(quiz.question.value.id, question.id)
    const answer = question.options.find(option => option.id === question.answer)
    quiz.choose(answer)
    assert.equal(quiz.sentence.value, question['text-prompt'].replaceAll('[[blank]]', answer.fill ?? answer.label.toLowerCase()))
    assert.ok(!quiz.sentence.value.includes('[[blank]]'))
    quiz.check()
    quiz.proceed()
  }
  assert.equal(quiz.sentence.value, '')
  quiz.restart()
  assert.equal(quiz.sentence.value, questions[0]['text-prompt'].replaceAll('[[blank]]', '___'))
})

test('the supplied lesson order is preserved during play, results, and restart', () => {
  const items = questions.slice(0, 3).reverse()
  const expected = items.map(question => question.id)
  const quiz = useQuiz({ strict: true, items })
  for (const question of items) {
    assert.equal(quiz.question.value.id, question.id)
    quiz.choose(question.options.find(option => option.id === question.answer))
    quiz.check(); quiz.proceed()
  }
  assert.deepEqual(quiz.results.value.map(result => result.questionId), expected)
  assert.deepEqual(items.map(question => question.id), expected)
  quiz.restart()
  assert.equal(quiz.question.value.id, expected[0])
})

test('options shuffle once per attempt, preserve answer IDs and leave source data unchanged', () => {
  const original = JSON.stringify(questions)
  const random = Math.random
  try {
    Math.random = () => 0
    const quiz = useQuiz()
    const firstOrder = quiz.question.value.options.map(option => option.id)
    assert.notDeepEqual(firstOrder, questions[0].options.map(option => option.id))
    const answer = quiz.question.value.options.find(option => option.id === quiz.question.value.answer)
    quiz.choose(answer)
    quiz.check()
    assert.equal(quiz.correct.value, true)
    assert.deepEqual(quiz.question.value.options.map(option => option.id), firstOrder)
    Math.random = () => 0.999999
    quiz.restart()
    assert.deepEqual(quiz.question.value.options.map(option => option.id), questions[0].options.map(option => option.id))
    assert.equal(JSON.stringify(questions), original)
  } finally {
    Math.random = random
  }
})
