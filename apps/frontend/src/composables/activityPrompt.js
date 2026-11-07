export const demoAudioPrompt = 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3'

// Normalize legacy activity documents at their boundary; write only canonical keys.
export function normalizeActivityPrompt(question) {
  const result = { ...question }
  for (const key of ['sentence', 'prompt']) {
    if (Object.hasOwn(result, key) && Object.hasOwn(result, 'text-prompt') && result[key] !== result['text-prompt']) throw new Error('Conflicting legacy and text-prompt fields.')
  }
  if (!Object.hasOwn(result, 'text-prompt')) result['text-prompt'] = result.sentence ?? result.prompt ?? null
  if (!Object.hasOwn(result, 'text-prompt-available')) result['text-prompt-available'] = Boolean(result['text-prompt'])
  if (!Object.hasOwn(result, 'audio-prompt')) result['audio-prompt'] = null
  delete result.sentence
  delete result.prompt
  return result
}
export function audioPromptUrl(value) {
  if (typeof value !== 'string' || value.length > 4000 || /\s/.test(value)) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    // The supplied demo also supports HTTPS, avoiding mixed-content playback failures.
    if (url.hostname === 'commondatastorage.googleapis.com') url.protocol = 'https:'
    return url.href
  } catch { return null }
}
