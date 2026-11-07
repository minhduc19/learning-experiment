import { authorizedFetch } from './useAuth.js'

// One player across all previews prevents overlapping recordings between quizzes.
let current = null
export function stopOptionAudio(owner) {
  if (current && (!owner || current.owner === owner)) {
    current.controller.abort()
    current.player?.pause()
    if (current.url) URL.revokeObjectURL(current.url)
    current = null
  }
}
export async function playOptionAudio(option, owner, onError = () => {}) {
  stopOptionAudio()
  if (!option.audio_id || option.audio_text !== option.label) return
  const state = { owner, controller: new AbortController(), player: null, url: null }
  current = state
  try {
    const response = await authorizedFetch('/api/ai/option-audio/' + encodeURIComponent(option.audio_id), { signal: state.controller.signal })
    if (!response.ok) throw new Error('Audio is unavailable. You can still answer the question.')
    const blob = await response.blob()
    if (current !== state) return
    state.url = URL.createObjectURL(blob)
    state.player = new Audio(state.url)
    state.player.onended = () => { if (current === state) stopOptionAudio(owner) }
    state.player.onerror = () => { if (current === state) { stopOptionAudio(owner); onError('Could not play audio. You can still answer the question.') } }
    await state.player.play()
  } catch (failure) {
    if (current !== state || state.controller.signal.aborted) return
    stopOptionAudio(owner)
    throw new Error('Could not play audio. Try Replay audio; you can still answer the question.')
  }
}
