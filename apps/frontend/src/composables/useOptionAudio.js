import { computed, ref, watch } from 'vue'
import { authorizedFetch } from './useAuth.js'
import { parseLesson } from './lessonJson.js'

export function useOptionAudio(text) {
  const provider = ref('piper')
  const voiceId = ref('MI36FIkp9wRP7cpWKPTl')
  const busy = ref(false), states = ref(new Map()), progress = ref(''), error = ref('')
  let controller, disposed = false
  const options = computed(() => {
    try { return parseLesson(text.value).items.flatMap(item => item.data.options) }
    catch { return [] }
  })
  const missing = computed(() => [...new Set(options.value.filter(option => !option.audio_id).map(option => option.label))])
  const failures = computed(() => missing.value.filter(label => states.value.get(label)?.status === 'failed').map(label => ({ label, ...states.value.get(label) })))
  const canGenerate = computed(() => missing.value.some(label => (!states.value.has(label) || states.value.get(label).status === 'ready')))
  const canRetry = computed(() => failures.value.some(item => item.can_retry))

  watch([provider, voiceId], () => {
    states.value = new Map(); progress.value = ''; error.value = ''
    try {
      const document = parseLesson(text.value)
      for (const item of document.items) for (const option of item.data.options) { delete option.audio_id; delete option.audio_text }
      text.value = JSON.stringify(document, null, 2)
    } catch { /* No valid draft to update yet. */ }
  })
  async function generate(retry = false) {
    if (busy.value) return
    const labels = retry ? failures.value.filter(item => item.can_retry).map(item => item.label) : missing.value.filter(label => (!states.value.has(label) || states.value.get(label).status === 'ready'))
    if (!labels.length) return
    busy.value = true; error.value = ''; controller = new AbortController()
    try {
      for (const [position, label] of labels.entries()) {
        if (disposed) break
        progress.value = `Generating audio ${position + 1} of ${labels.length}: ${label}`
        let result
        try {
          const response = await authorizedFetch('/api/ai/option-audio', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
            body: JSON.stringify({ text: label, retry: retry && states.value.get(label)?.retry_request !== false, provider: provider.value, voice_id: provider.value === 'elevenlabs' ? voiceId.value.trim() || null : null }),
          })
          const data = await response.json().catch(() => null)
          if (!response.ok) {
            const failure = new Error(typeof data?.detail === 'string' ? data.detail : 'Could not generate audio.')
            failure.notAttempted = [429, 503].includes(response.status)
            throw failure
          }
          if (!['ready', 'failed'].includes(data?.status) || (data.status === 'ready' && typeof data.audio_id !== 'string')) throw new Error('Unexpected audio response.')
          result = data
        } catch (failure) {
          if (disposed || controller.signal.aborted) break
          result = { status: 'failed', can_retry: !retry, retry_request: !failure.notAttempted, message: failure.message }
        }
        if (disposed) break
        if (retry && result.status === 'failed') result.can_retry = false
        states.value.set(label, result)
        if (result.status === 'ready') {
          const document = parseLesson(text.value)
          for (const item of document.items) for (const option of item.data.options) {
            if (option.label === label) { option.audio_id = result.audio_id; option.audio_text = label }
          }
          text.value = JSON.stringify(document, null, 2)
        }
      }
      if (!disposed) progress.value = failures.value.length
        ? `Audio generation finished. ${failures.value.length} option text(s) could not be recorded. Successful audio is kept.`
        : 'Audio is ready. Tap options in the quizzes below to test it.'
    } catch (failure) { if (!disposed) error.value = failure.message }
    finally { if (!disposed) busy.value = false }
  }
  function dispose() { disposed = true; controller?.abort() }
  return { provider, voiceId, busy, progress, error, failures, canGenerate, canRetry, generate, dispose }
}
