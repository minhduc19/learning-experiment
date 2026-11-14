// Use the clicked token's position, never a text search: phrases can repeat.
export function sentenceForWord(words, index) {
  if (words[index]?.sentence) return words[index].sentence
  let start = index, end = index
  const terminal = word => /[。！？!?]/u.test(word?.text || '')
  while (start > 0 && !terminal(words[start - 1])) start--
  // A closing quote belongs to the preceding sentence, not the next one.
  while (start < index && /^[”’」』]+$/u.test(words[start].text)) start++
  while (end < words.length - 1 && !terminal(words[end])) end++
  if (/^[”’」』]+$/u.test(words[end + 1]?.text || '')) end++
  return { text: words.slice(start, end + 1).map(word => word.text).join(''), translation: null }
}
