// Textarea editing is independent of the DOM so multi-line selections are testable.
export function indentCode(value, start, end, outdent = false) {
  if (!outdent && !value.slice(start, end).includes('\n')) {
    const column = start - (start ? value.lastIndexOf('\n', start - 1) : -1) - 1
    const spaces = ' '.repeat(4 - column % 4)
    return { value: value.slice(0, start) + spaces + value.slice(end), start: start + spaces.length, end: start + spaces.length }
  }
  const first = start ? value.lastIndexOf('\n', start - 1) + 1 : 0
  // A selection ending at the next line's start does not select that line.
  const lastSelected = end > start && value[end - 1] === '\n' ? end - 1 : end
  const changes = []
  for (let pos = first; pos <= lastSelected;) {
    const remove = outdent ? (value[pos] === '\t' ? 1 : value.slice(pos).match(/^ {0,4}/)[0].length) : 0
    changes.push({ pos, remove, insert: outdent ? '' : '    ' })
    const next = value.indexOf('\n', pos)
    if (next < 0) break
    pos = next + 1
  }
  let text = value
  for (const change of [...changes].reverse()) text = text.slice(0, change.pos) + change.insert + text.slice(change.pos + change.remove)
  function map(position) {
    let offset = 0
    for (const change of changes) {
      if (position < change.pos) break
      offset += position < change.pos + change.remove
        ? change.insert.length - (position - change.pos) : change.insert.length - change.remove
    }
    return position + offset
  }
  return { value: text, start: map(start), end: map(end) }
}
