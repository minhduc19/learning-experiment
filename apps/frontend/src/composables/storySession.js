export const sessionKey = story => `story-session:${story.id}`
export const isCorrect = (step, answer) => Array.isArray(answer) && answer.length === step.answer.length && answer.every((id, i) => id === step.answer[i])
export function loadSession(story, storage) {
  const empty = { index: 0, answers: {}, mistakes: 0 }
  try {
    const v = JSON.parse(storage?.getItem(sessionKey(story)) || 'null')
    if (!v || !Number.isInteger(v.index) || v.index < 0 || v.index > story.steps.length || !Number.isInteger(v.mistakes) || v.mistakes < 0 || !v.answers || typeof v.answers !== 'object') return empty
    for (const s of story.steps.slice(0, v.index)) if (s.answer && !isCorrect(s, v.answers[s.id])) return empty
    const current = story.steps[v.index]
    if (v.paragraph !== undefined && (!Number.isInteger(v.paragraph) || v.paragraph < 0 ||
        (current?.type === 'read' ? v.paragraph >= current.lines.length : v.paragraph !== 0))) return empty
    const answers = Object.fromEntries(story.steps.slice(0, v.index + 1).filter(s => s.answer && isCorrect(s, v.answers[s.id])).map(s => [s.id, v.answers[s.id]]))
    return { index: v.index, answers, mistakes: v.mistakes, ...(v.paragraph === undefined ? {} : { paragraph: v.paragraph }) }
  } catch { return empty }
}
export function saveSession(story, session, storage) {
  try { storage.setItem(sessionKey(story), JSON.stringify(session)); return true } catch { return false }
}

// Keep the source step indices stable so existing saved sessions still resume.
export function visibleStorySteps(story, session) {
  return story.steps.slice(0, session.index + 1).map((step, index) =>
    index === session.index && step.type === 'read'
      ? { ...step, lines: step.lines.slice(0, (session.paragraph ?? 0) + 1) }
      : step)
}

export function advanceStorySession(story, session) {
  const step = story.steps[session.index]
  if (!step || (step.answer && !isCorrect(step, session.answers[step.id]))) return session
  const paragraph = session.paragraph ?? 0
  if (step.type === 'read' && paragraph + 1 < step.lines.length) {
    return { ...session, paragraph: paragraph + 1 }
  }
  return { ...session, index: session.index + 1, paragraph: 0 }
}
