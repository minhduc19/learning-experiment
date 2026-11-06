// Keep the requested header spelling for compatibility with pasted tables.
export const studyExportHeader = 'Character|chracter-id|segment|segment-id|sentence|sentence-id'

function cell(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('\r', '\\r').replaceAll('\n', '\\n')
}

export function buildStudyExport(selection, script = 'simplified') {
  const rows = [], seen = new Set()
  const variant = (entry, suffix, source) => entry?.[`${script}_${suffix}`] ?? entry?.[source] ?? ''
  function add(character, segment, sentence) {
    const row = [variant(character, 'value', 'value'), character.id,
      variant(segment, 'text', 'text'), segment?.id,
      variant(sentence, 'text', 'raw_text'), sentence?.id]
    const key = JSON.stringify(row)
    if (!seen.has(key)) { seen.add(key); rows.push(row.map(cell).join('|')) }
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
  return [studyExportHeader, ...rows].join('\n')
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
