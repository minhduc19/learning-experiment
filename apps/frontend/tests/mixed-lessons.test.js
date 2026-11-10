import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parseLesson, lessonOptions } from '../src/composables/lessonJson.js'
const sample = JSON.parse(readFileSync(new URL('../src/data/sampleLesson.json', import.meta.url)))
test('mixed sample includes one of each playable type and preserves ordering', () => {
  const parsed = parseLesson(JSON.stringify(sample))
  assert.deepEqual(parsed.items.map(i=>i.type), ['multiple-choice','reading','sentence-jumble','matching-pairs','listence-choose-word'])
  assert.equal(lessonOptions(parsed).length, sample.items[0].data.options.length + sample.items[1].data.blocks[1].question.options.length)
})
test('invalid mixed lesson data cannot be saved or previewed', () => {
  for (const change of [
    d=>d.items[4].data.spokenIds.push('unknown'),
    d=>d.items[4].data.options[0].id=d.items[4].data.options[1].id,
    d=>d.items[4].data.audio='javascript:alert(1)',
    d=>d.items[2].data.answers.push(['unknown']),
    d=>d.items[2].data.tiles.push(d.items[2].data.tiles[0]),
    d=>d.items[3].data.pairs.pop(),
    d=>d.items[3].data.pairs.push(d.items[3].data.pairs[0]),
    d=>d.items[1].data.blocks.push(d.items[1].data.blocks[0]),
    d=>d.items[1].data.blocks[1].question.answer='unknown',
    d=>d.items[1].data.blocks[0].type='unknown',
  ]) { const document=structuredClone(sample);change(document);assert.throws(()=>parseLesson(JSON.stringify(document))) }
})


test('sample schema parses from plain JSON and a complete AI JSON code fence', () => {
  const json = JSON.stringify(sample)
  const expected = parseLesson(json)
  assert.deepEqual(parseLesson('```json\n' + json + '\n```'), expected)
  assert.deepEqual(parseLesson('```\n' + json + '\n```'), expected)
  assert.throws(() => parseLesson('Here is your lesson:\n' + json))
  const invalid = structuredClone(sample); invalid.items[0].type = 'unsupported'
  assert.throws(() => parseLesson('```json\n' + JSON.stringify(invalid) + '\n```'))
})
