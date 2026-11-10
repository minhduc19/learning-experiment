export function readingTargetPhrases(steps) {
  return [...new Set(steps.filter(step => step.answer)
    .map(step => step['target-phrase']?.trim()).filter(Boolean))]
}

export function loadLearnedPhrases(storage, key) {
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter(value => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}
