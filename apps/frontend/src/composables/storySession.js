export const sessionKey = story => `story-session:${story.id}`
export const isCorrect = (step, answer) => Array.isArray(answer) && answer.length === step.answer.length && answer.every((id, i) => id === step.answer[i])
export function loadSession(story, storage) {
  const empty = { index: 0, answers: {}, mistakes: 0 }
  try {
    const v = JSON.parse(storage?.getItem(sessionKey(story)) || 'null')
    if (!v || !Number.isInteger(v.index) || v.index < 0 || v.index > story.steps.length || !Number.isInteger(v.mistakes) || v.mistakes < 0 || !v.answers || typeof v.answers !== 'object') return empty
    for (const s of story.steps.slice(0, v.index)) if (s.answer && !isCorrect(s, v.answers[s.id])) return empty
    const answers = Object.fromEntries(story.steps.slice(0, v.index + 1).filter(s => s.answer && isCorrect(s, v.answers[s.id])).map(s => [s.id, v.answers[s.id]]))
    return { index: v.index, answers, mistakes: v.mistakes }
  } catch { return empty }
}
export function saveSession(story, session, storage) {
  try { storage.setItem(sessionKey(story), JSON.stringify(session)); return true } catch { return false }
}
