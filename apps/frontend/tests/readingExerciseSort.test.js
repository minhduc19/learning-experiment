import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdirSync } from 'node:fs'
import { sortReadingExercises } from '../src/utils/sortReadingExercises.js'

test('creation date sort defaults to latest, supports earliest, and leaves registry order intact', () => {
  const stories = [
    { title: 'A', createdAt: '2026-11-10T12:00:00Z' },
    { title: 'Z', createdAt: '2026-11-12T12:00:00Z' },
    { title: 'B', createdAt: '2026-11-11T12:00:00Z' },
  ]
  assert.deepEqual(sortReadingExercises(stories).map(story => story.title), ['Z', 'B', 'A'])
  assert.deepEqual(sortReadingExercises(stories, 'earliest').map(story => story.title), ['A', 'B', 'Z'])
  assert.deepEqual(stories.map(story => story.title), ['A', 'Z', 'B'])
  assert.deepEqual(sortReadingExercises([]), [])
})

test('all discovered exercises have valid creation dates and newest story comes first', async () => {
  const directory = new URL('../src/data/readingExercises/', import.meta.url)
  const stories = []
  for (const file of readdirSync(directory).filter(file => file.endsWith('.js') && file !== 'index.js')) {
    const { story } = await import(new URL(file, directory))
    assert.ok(Number.isFinite(Date.parse(story.createdAt)), `${file} needs a creation date`)
    stories.push(story)
  }
  assert.equal(Date.parse(sortReadingExercises(stories)[0].createdAt), Math.max(...stories.map(story => Date.parse(story.createdAt))))
})
