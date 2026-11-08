import { validateMixed } from './mixedLessonValidation.js'
import { normalizeActivityPrompt, audioPromptUrl } from './activityPrompt.js'

export const sampleLesson = { schemaVersion: 1, title: 'Chinese practice', items: [{ id: 'item-1', type: 'multiple-choice', data: { id: 'study', instruction: 'Fill in the blank', 'text-prompt': '我[[blank]]中文。', 'text-prompt-available': true, 'audio-prompt': null, answer: 'learn', translation: 'I study Chinese.', options: [{ id: 'learn', label: '学习', feedback: 'Correct! 学习 means study or learn.' }, { id: 'walk', label: '走路', feedback: '走路 means walk.' }] } }] }

export function parseLesson(text) {
  if (new TextEncoder().encode(text).length > 1048576) throw new Error('Lesson JSON must be at most 1 MiB.')
  let value
  try { value = JSON.parse(text) } catch (error) { throw new Error('Invalid JSON: ' + error.message) }
  if (Array.isArray(value)) value = { schemaVersion: 1, title: 'Imported lesson', items: value.map((data, index) => ({ id: `item-${index + 1}`, type: 'multiple-choice', data })) }
  const object = (v, path, keys) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${path} must be an object.`)
    for (const key of Object.keys(v)) if (!keys.includes(key)) throw new Error(`${path}.${key} is unsupported.`)
  }
  const string = (v, path, max = 20000) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${path} must be nonempty text, at most ${max} characters.`) }
  object(value, 'Lesson', ['schemaVersion', 'title', 'items'])
  if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1.')
  string(value.title, 'title', 200)
  if (!Array.isArray(value.items) || !value.items.length || value.items.length > 200) throw new Error('items must contain 1–200 ordered items.')
  const ids = new Set()
  for (const [i, item] of value.items.entries()) {
    const path = `items[${i}]`
    object(item, path, ['id', 'type', 'data']); string(item.id, path + '.id', 200)
    if (ids.has(item.id)) throw new Error(`${path}.id must be unique.`)
    ids.add(item.id)
    if (item.type !== 'multiple-choice') {
      validateMixed(item, question => parseLesson(JSON.stringify({schemaVersion:1,title:'Checkpoint',items:[{id:'checkpoint',type:'multiple-choice',data:question}]})).items[0].data)
      continue
    }
    const q = normalizeActivityPrompt(item.data)
    item.data = q
    object(q, path + '.data', ['id','instruction','text-prompt','text-prompt-available','audio-prompt','answer','translation','options','target-character','target-segment'])
    for (const [key, max] of [['target-character', 1], ['target-segment', 256]]) {
      if (q[key] != null && (typeof q[key] !== 'string' || !q[key].trim() || Array.from(q[key]).length > max)) throw new Error(`${path}.${key} must be nonempty text, at most ${max} characters.`)
    }
    string(q.id, path + '.data.id', 200); string(q['text-prompt'], path + '.data.text-prompt')
    if (q['text-prompt'].split('[[blank]]').length !== 2) throw new Error(`${path}.data.text-prompt needs exactly one [[blank]].`)
    if (typeof q['text-prompt-available'] !== 'boolean') throw new Error(`${path}.data.text-prompt-available must be a boolean.`)
    if (q['audio-prompt'] !== null && !audioPromptUrl(q['audio-prompt'])) throw new Error(`${path}.data.audio-prompt must be an HTTP(S) audio URL or null.`)
    if (q.instruction !== undefined && typeof q.instruction !== 'string') throw new Error(`${path}.data.instruction must be text.`)
    if (q.instruction === undefined) q.instruction = 'Fill in the blank'
    if (q.translation != null && typeof q.translation !== 'string') throw new Error(`${path}.data.translation must be text.`)
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 20) throw new Error(`${path}.data.options needs 2–20 options.`)
    const options = new Set()
    for (const option of q.options) {
      object(option, path + '.option', ['id','label','feedback','fill','audio_id','audio_text'])
      string(option.id, path + '.option.id', 200); string(option.label, path + '.option.label', 2000); string(option.feedback, path + '.option.feedback', 10000)
      if (option.audio_id != null && (typeof option.audio_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(option.audio_id))) throw new Error(`${path}.option.audio_id must be a valid audio ID.`)
      if (option.audio_text != null && (typeof option.audio_text !== 'string' || option.audio_text.length > 2000)) throw new Error(`${path}.option.audio_text must be text, at most 2000 characters.`)
      if (option.audio_text !== option.label) { delete option.audio_id; delete option.audio_text }
      if (options.has(option.id)) throw new Error(`${path} has duplicate option IDs.`)
      options.add(option.id)
      if (option.fill != null && typeof option.fill !== 'string') throw new Error(`${path}.option.fill must be text.`)
    }
    if (!options.has(q.answer)) throw new Error(`${path}.data.answer must reference an option ID.`)
  }
  return value
}

export function lessonOptions(document) {
  return document.items.flatMap(item => item.type==='multiple-choice' ? item.data.options : item.type==='reading' ? item.data.blocks.filter(b=>b.type==='Multiple-choice').flatMap(b=>b.question.options) : [])
}
