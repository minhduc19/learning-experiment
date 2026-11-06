import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildVocabularyPrompt } from '../src/composables/studyExport.js'
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
  assert.equal(example.items[0].data.sentence,'做人要有一颗好[[blank]]。')
})
