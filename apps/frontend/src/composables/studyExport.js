// Keep the requested header spelling for compatibility with pasted tables.
export const studyExportHeader = 'Character|chracter-id|segment|segment-id|sentence|sentence-id'

function cell(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('\r', '\\r').replaceAll('\n', '\\n')
}

export function studyExportRows(selection, script = 'simplified') {
  const rows = [], seen = new Set()
  const variant = (entry, suffix, source) => entry?.[`${script}_${suffix}`] ?? entry?.[source] ?? ''
  function add(character, segment, sentence) {
    const row = [variant(character, 'value', 'value'), character?.id,
      variant(segment, 'text', 'text'), segment?.id,
      variant(sentence, 'text', 'raw_text'), sentence?.id]
    const key = JSON.stringify(row)
    if (!seen.has(key)) { seen.add(key); rows.push(row) }
  }
  for (const character of selection?.learned ?? []) {
    if (!character.popular_segments?.length) add(character)
    for (const segment of character.popular_segments ?? []) add(character, segment, segment.sentence)
  }
  for (const character of selection?.new ?? []) {
    const sentence = character.sentence
    // Match source text, since conversions can merge different source characters.
    const segments = (sentence?.segments ?? []).filter(segment => character.value && segment.text?.includes(character.value))
    if (!segments.length) add(character, undefined, sentence)
    for (const segment of segments) add(character, segment, sentence)
  }
  for (const segment of selection?.segments ?? []) add(undefined, segment, segment.sentence)
  return rows
}

export function buildStudyExport(selection, script = 'simplified') {
  return [studyExportHeader, ...studyExportRows(selection, script).map(row => row.map(cell).join('|'))].join('\n')
}

export function vocabularyPromptRows(selection, script = 'traditional') {
  const rows = studyExportRows(selection, script).map(row => [row[0], row[2], row[4], row[5]])
  const unique = [...new Map(rows.map(row => [JSON.stringify(row), row])).values()]
  return unique.map(([character, segment, sentence, sentenceId]) => ({
    character: String(character ?? ''), segment: String(segment ?? ''),
    sentence: String(sentence ?? ''), sentenceId: String(sentenceId ?? ''),
  }))
}

export function serializeVocabularyPrompt(rows) {
  return ['Character|segment|sentence|sentence-id', ...rows.map(row =>
    [row.character, row.segment, row.sentence, row.sentenceId].map(cell).join('|'),
  )].join('\n')
}

export function buildVocabularyPrompt(selection, script = 'traditional') {
  return serializeVocabularyPrompt(vocabularyPromptRows(selection, script))
}

export async function copyStudyText(text) {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Try the HTTP-compatible copy path. */ }
  const previous = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.readOnly = true
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;'
  document.body.append(textarea)
  try {
    textarea.select()
    return Boolean(document.execCommand?.('copy'))
  } catch { return false }
  finally { textarea.remove(); previous?.focus?.() }
}
