import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questions } from '../src/data/questions.js'
import { strictQuestions } from '../src/data/strictQuestions.js'

for (const [name, items] of [['questions', questions], ['strictQuestions', strictQuestions]]) {
  test(`${name} has valid multiple-choice data and stable unique question IDs`, () => {
    assert.ok(items.length > 0)
    assert.equal(new Set(items.map(item => item.id)).size, items.length)
    for (const question of items) {
      assert.ok(typeof question.id === 'string' && question.id.trim())
      assert.ok(typeof question.instruction === 'string' && question.instruction.trim())
      assert.equal(typeof question['text-prompt-available'], 'boolean')
      assert.ok(Object.hasOwn(question, 'audio-prompt'))
      assert.equal(Object.hasOwn(question, 'sentence'), false)
      assert.equal(question['text-prompt'].split('[[blank]]').length, 2, question.id)
      assert.ok(Array.isArray(question.options) && question.options.length >= 2, question.id)
      assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length, question.id)
      assert.equal(question.options.filter(option => option.id === question.answer).length, 1, question.id)
      for (const option of question.options) {
        assert.ok(typeof option.id === 'string' && option.id.trim(), question.id)
        assert.ok(typeof option.label === 'string' && option.label.trim(), question.id)
        assert.ok(typeof option.feedback === 'string' && option.feedback.trim(), question.id)
        if (option.fill !== undefined) assert.equal(typeof option.fill, 'string', question.id)
      }
    }
  })
}
