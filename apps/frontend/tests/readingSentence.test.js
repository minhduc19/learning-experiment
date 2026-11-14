import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sentenceForWord } from '../src/utils/readingSentence.js'
import { story } from '../src/data/readingExercises/crow-and-fox.js'

test('uses authored sentence translations and the clicked occurrence of a repeated phrase', () => {
  const first = { text: '乌鸦唱歌。', translation: 'The crow sings.' }
  const second = { text: '乌鸦不唱歌。', translation: 'The crow does not sing.' }
  const words = [{ text: '乌鸦', sentence: first }, { text: '乌鸦', sentence: second }]
  assert.equal(sentenceForWord(words, 1), second)
})
test('legacy paragraphs return only the containing sentence without inventing a translation', () => {
  const words = ['他说', '：', '“', '你好', '！', '”', '乌鸦', '没有回答', '。'].map(text => ({ text }))
  assert.deepEqual(sentenceForWord(words, 3), { text: '他说：“你好！”', translation: null })
  assert.deepEqual(sentenceForWord(words, 6), { text: '乌鸦没有回答。', translation: null })
})
test('every demo phrase has its own complete sentence translation, not the paragraph gloss', () => {
  for (const step of story.steps.filter(step => step.type === 'read')) {
    for (const line of step.lines) {
      assert.ok(new Set(line.words.map(word => word.sentence)).size > 1)
      for (const [index, word] of line.words.entries()) {
        const context = sentenceForWord(line.words, index)
        assert.ok(context.text.includes(word.text))
        assert.ok(context.translation?.trim())
        assert.notEqual(context.text, line.words.map(word => word.text).join(''))
      }
    }
  }
})
