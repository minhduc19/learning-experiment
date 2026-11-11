import assert from 'node:assert/strict'
import { test } from 'node:test'
import { story } from '../src/data/readingExercises/old-mans-horse.js'

const passages = story.steps.filter(step => step.type === 'read').flatMap(step => step.lines)
const hasChinese = text => /\p{Script=Han}/u.test(text)

test('classic story keeps its full text in paragraphs with short, complete lookup annotations', () => {
  assert.equal(passages.length, 24)
  assert.equal(passages.filter(line => line.speaker).length, 15)
  const text = passages.flatMap(line => line.words).map(word => word.text).join('')
  assert.equal(text.match(/\p{Script=Han}/gu).length, 1385)
  for (const step of story.steps) {
    const groups = [
      ...(step.lines ?? []).map(line => line.words),
      ...(step.options ?? []).map(option => option.words),
      ...['before', 'between', 'after'].filter(key => step[key]).map(key => step[key]),
    ]
    for (const words of groups) {
      for (const word of words) {
        if (hasChinese(word.text)) {
          assert.ok(word.pinyin?.trim(), `${step.id}: missing pinyin for ${word.text}`)
          assert.ok(word.meaning?.trim(), `${step.id}: missing meaning for ${word.text}`)
          assert.ok(word.text.length <= 6, `${step.id}: oversized lookup ${word.text}`)
          assert.ok(!/[，。！？；、“”]/u.test(word.text), `${step.id}: punctuation inside lookup`)
        } else {
          assert.equal(word.pinyin, undefined, 'punctuation has no pronunciation')
          assert.equal(word.meaning, undefined, 'punctuation is not a lookup button')
        }
      }
    }
  }
})

test('lookups attach contextual meanings and pronunciation to individual phrases', () => {
  const find = (id, text) => passages.find(line => line.id === id).words.find(word => word.text === text)
  assert.deepEqual(find('village', '边塞'), { text: '边塞', pinyin: 'biān sài', meaning: 'the frontier' })
  assert.equal(find('village', '相依为命').meaning, 'to depend on each other for survival')
  assert.equal(find('village', '种').pinyin, 'zhòng')
  assert.equal(find('ambition', '更快地').pinyin, 'gèng kuài de')
  assert.equal(find('impatience', '马鞍').meaning, 'saddle')
  assert.equal(find('treatment', '大夫').pinyin, 'dài fu')
  assert.equal(find('war', '征召').meaning, 'a military call-up')
  assert.equal(find('compassion', '祸福难料').meaning, 'fortune and misfortune are hard to foresee')
  assert.equal(find('closing', '焉知非福').pinyin, 'yān zhī fēi fú')
})
