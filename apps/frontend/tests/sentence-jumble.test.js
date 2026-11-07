import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { useSentenceJumble } from '../src/composables/useSentenceJumble.js'
const items = JSON.parse(readFileSync(new URL('../src/data/sentenceJumble.json', import.meta.url)))
test('tiles return to the bank, distractors fail, and retries preserve editable answers', () => {
  const game = useSentenceJumble(items)
  game.check(); assert.equal(game.checked.value, false)
  game.choose('drink'); game.choose('drink'); assert.deepEqual(game.selected.value, ['drink'])
  game.check(); assert.equal(game.correct.value, false)
  game.choose('eat'); game.remove('drink'); assert.deepEqual(game.selected.value, ['drink'])
  game.proceed(); assert.equal(game.index.value, 0)
  game.remove('drink'); assert.deepEqual(game.selected.value, [])
})
test('every declared alternative is constructible and accepted; completion and replay reset state', () => {
  for (const [index, item] of items.entries()) {
    assert.equal(new Set(item.tiles.map(tile => tile.id)).size, item.tiles.length)
    for (const answer of item.answers) {
      const game = useSentenceJumble(items); game.index.value = index
      for (const id of answer) game.choose(id)
      assert.deepEqual(game.selected.value, answer)
      game.check(); assert.equal(game.correct.value, true)
    }
  }
  assert.ok(items.some(item => !item.prompt))
  const game = useSentenceJumble(items)
  for (const item of items) {
    item.answers[0].forEach(game.choose); game.check(); game.proceed()
  }
  assert.equal(game.complete.value, true)
  game.restart(); assert.equal(game.complete.value, false); assert.deepEqual(game.selected.value, [])
})

test('drag moves insert, reorder, return and reject changes during feedback', () => {
  const game = useSentenceJumble(items)
  game.move('apple', 'answer', 0)
  game.move('eat', 'answer', 0)
  game.move('an', 'answer', 1)
  assert.deepEqual(game.selected.value, ['eat', 'an', 'apple'])
  game.move('apple', 'answer', 0)
  assert.deepEqual(game.selected.value, ['apple', 'eat', 'an'])
  game.move('apple', 'bank', 0)
  assert.deepEqual(game.selected.value, ['eat', 'an'])
  assert.equal(game.bank.value[0].id, 'apple')
  game.move('invalid', 'answer', 0)
  assert.deepEqual(game.selected.value, ['eat', 'an'])
  game.check(); game.move('apple', 'answer', 0)
  assert.deepEqual(game.selected.value, ['eat', 'an'])
})
