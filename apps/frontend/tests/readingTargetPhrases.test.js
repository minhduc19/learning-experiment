import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdirSync } from 'node:fs'
import { readingTargetPhrases, loadLearnedPhrases } from '../src/utils/readingTargetPhrases.js'

test('every reading quiz has an explicit nonempty target phrase', async () => {
  const directory = new URL('../src/data/readingExercises/', import.meta.url)
  for (const file of readdirSync(directory).filter(file => file.endsWith('.js') && file !== 'index.js')) {
    const { story } = await import(new URL(file, directory))
    for (const step of story.steps.filter(step => step.answer)) {
      assert.equal(typeof step['target-phrase'], 'string', `${story.id}/${step.id}`)
      assert.ok(step['target-phrase'].trim(), `${story.id}/${step.id}`)
    }
  }
})
test('reviews distinct quiz targets in order and ignores reading steps', () => {
  assert.deepEqual(readingTargetPhrases([
    { type: 'read' }, { answer: ['a'], 'target-phrase': ' 天气 ' },
    { answer: ['b'], 'target-phrase': '散步' }, { answer: ['c'], 'target-phrase': '天气' },
  ]), ['天气', '散步'])
})
test('restores learned status and safely handles invalid or unavailable storage', () => {
  assert.deepEqual([...loadLearnedPhrases({ getItem: () => JSON.stringify(['天气', '散步']) }, 'reading')], ['天气', '散步'])
  for (const value of ['{}', 'null', 'broken']) assert.equal(loadLearnedPhrases({ getItem: () => value }, 'reading').size, 0)
  assert.equal(loadLearnedPhrases({ getItem() { throw new Error('blocked') } }, 'reading').size, 0)
})
