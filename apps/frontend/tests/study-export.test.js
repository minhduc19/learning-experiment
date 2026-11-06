import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildStudyExport, studyExportHeader } from '../src/composables/studyExport.js'

const segment = { id: 22, text: '学校', traditional_text: '學校', simplified_text: '学校' }
const sentence = { id: 333, raw_text: '我去学校。', traditional_text: '我去學校。', simplified_text: '我去学校。', segments: [segment, { id: 99, text: '我' }, segment] }
const character = { id: 11, value: '学', traditional_value: '學', simplified_value: '学', sentence }

test('new characters export source-matching segments with real IDs in both scripts', () => {
  assert.equal(buildStudyExport({ new: [character] }), studyExportHeader + '\n学|11|学校|22|我去学校。|333')
  assert.equal(buildStudyExport({ new: [character] }, 'traditional'), studyExportHeader + '\n學|11|學校|22|我去學校。|333')
})

test('learned popular segments retain their own example sentence IDs and duplicate associations collapse', () => {
  const row = { ...character, popular_segments: [{ ...segment, sentence }] }
  assert.equal(buildStudyExport({ learned: [row], new: [character] }).split('\n').length, 2)
  const other = { ...segment, id: 23, sentence: { ...sentence, id: 444 } }
  const output = buildStudyExport({ learned: [{ ...row, popular_segments: [...row.popular_segments, other] }] })
  assert.ok(output.includes('|23|我去学校。|444'))
})

test('empty selections keep the header and missing examples never invent IDs', () => {
  assert.equal(buildStudyExport(null), studyExportHeader)
  assert.equal(buildStudyExport({ learned: [{ ...character, popular_segments: [] }] }), studyExportHeader + '\n学|11||||')
})

test('pipes, backslashes and line breaks are escaped without changing IDs', () => {
  const output = buildStudyExport({ new: [{ ...character, sentence: { ...sentence, simplified_text: '甲|乙\\丙\r\n丁' } }] })
  assert.ok(output.endsWith('|甲\\|乙\\\\丙\\r\\n丁|333'))
  assert.equal(output.split('\n').length, 2)
})
