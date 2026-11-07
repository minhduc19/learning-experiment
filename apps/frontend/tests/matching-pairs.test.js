import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { useMatchingPairs } from '../src/composables/useMatchingPairs.js'

const activity = JSON.parse(readFileSync(new URL('../src/data/matchingPairs.json', import.meta.url)))

test('matching accepts 2–5 pairs and rejects invalid data', () => {
  assert.ok(activity.instruction)
  for (let count = 2; count <= 5; count++) {
    const game = useMatchingPairs(activity.pairs.slice(0, count))
    assert.deepEqual(game.columns.value.map(column => column.length), [count, count])
  }
  for (const pairs of [[], activity.pairs.slice(0, 1), [...activity.pairs, activity.pairs[0]], [activity.pairs[0], activity.pairs[0]]]) {
    assert.throws(() => useMatchingPairs(pairs))
  }
})

test('either column can start; selections toggle, change, mismatch, and recover', () => {
  const game = useMatchingPairs(activity.pairs)
  const [left, right] = game.columns.value
  game.choose(right[0])
  game.choose(right[0])
  assert.equal(game.selected.value, null)
  game.choose(left[0])
  game.choose(left[1])
  assert.equal(game.selected.value.id, left[1].id)
  game.choose(right.find(card => card.pairId !== left[1].pairId))
  assert.equal(game.mismatch.value.length, 2)
  game.choose(left[0])
  assert.equal(game.selected.value, null)
  game.clearMismatch()
  game.choose(right.find(card => card.pairId === left[1].pairId))
  game.choose(left[1])
  assert.deepEqual(game.matched.value, [left[1].pairId])
  game.choose(left[1])
  assert.equal(game.selected.value, null)
})

test('every pair must match to finish; restart clears the board without mutating JSON', () => {
  const original = JSON.stringify(activity)
  const game = useMatchingPairs(activity.pairs)
  for (const card of game.columns.value[1]) {
    assert.equal(game.complete.value, false)
    game.choose(card)
    game.choose(game.columns.value[0].find(other => other.pairId === card.pairId))
  }
  assert.equal(game.complete.value, true)
  game.restart()
  assert.equal(game.complete.value, false)
  assert.deepEqual(game.matched.value, [])
  assert.equal(game.selected.value, null)
  assert.deepEqual(game.mismatch.value, [])
  assert.equal(JSON.stringify(activity), original)
})
