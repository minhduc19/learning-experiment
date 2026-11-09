import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildVocabularyPrompt, vocabularyPromptRows, serializeVocabularyPrompt } from '../src/composables/studyExport.js'
import { defaultSystemPrompt } from '../src/data/aiSystemPrompt.js'
import { parseLesson } from '../src/composables/lessonJson.js'

test('AI vocabulary uses four columns and stored sentence IDs in either script',()=>{
  const segment={id:20,text:'学校',traditional_text:'學校',simplified_text:'学校'}
  const sentence={id:333,raw_text:'学校。',traditional_text:'學校。',simplified_text:'学校。',segments:[segment,segment]}
  const character={id:10,value:'学',traditional_value:'學',simplified_value:'学',sentence,popular_segments:[{...segment,sentence}]}
  const data={learned:[character],new:[character]}
  assert.equal(buildVocabularyPrompt(data),'Character|segment|sentence|sentence-id\n學|學校|學校。|333')
  assert.equal(buildVocabularyPrompt(data,'simplified'),'Character|segment|sentence|sentence-id\n学|学校|学校。|333')
})

test('the default system prompt includes the supplied valid targeted lesson example',()=>{
  assert.ok(defaultSystemPrompt.startsWith('The user will send vocabulary data'))
  const example=JSON.parse(defaultSystemPrompt.split('EXAMPLE JSON OUTPUT:')[1].trim())
  assert.equal(parseLesson(JSON.stringify(example)).items[0].data['target-character'],'心')
  assert.equal(example.items[0].data['text-prompt'],'做人要有一颗好[[blank]]。')
})


test('editable vocabulary rows preserve field text, escape it once, and serialize the displayed order', () => {
  const selection = { learned: [
    { id: 1, value: '心', popular_segments: [{ id: 10, text: '開心', sentence: { id: 20, raw_text: '很開心。' } }] },
    { id: 2, value: '水' },
  ] }
  const original = JSON.stringify(selection)
  const rows = vocabularyPromptRows(selection)
  assert.deepEqual(rows[0], { character: '心', segment: '開心', sentence: '很開心。', sentenceId: '20' })
  assert.deepEqual(rows[1], { character: '水', segment: '', sentence: '', sentenceId: '' })
  rows[0].segment = 'A|B'
  rows[0].sentence = 'line 1\nline 2\\end'
  rows[0].sentenceId = '99'
  rows.reverse()
  const prompt = serializeVocabularyPrompt(rows)
  assert.equal(prompt, 'Character|segment|sentence|sentence-id\n水|||\n心|A\\|B|line 1\\nline 2\\\\end|99')
  rows.splice(1, 1)
  assert.equal(serializeVocabularyPrompt(rows), 'Character|segment|sentence|sentence-id\n水|||')
  assert.equal(serializeVocabularyPrompt([]), 'Character|segment|sentence|sentence-id')
  assert.equal(JSON.stringify(selection), original)
})

test('version 2 segment rows retain source IDs and both writing systems without a target character', () => {
  const segment = { id: 2, text: '出来', traditional_text: '出來', simplified_text: '出来', sentence: { id: 9, raw_text: '他出来。', traditional_text: '他出來。', simplified_text: '他出来。' } }
  const selection = { learned: [], new: [], segments: [segment, segment] }
  assert.equal(buildVocabularyPrompt(selection), 'Character|segment|sentence|sentence-id\n|出來|他出來。|9')
  assert.equal(buildVocabularyPrompt(selection, 'simplified'), 'Character|segment|sentence|sentence-id\n|出来|他出来。|9')
})
