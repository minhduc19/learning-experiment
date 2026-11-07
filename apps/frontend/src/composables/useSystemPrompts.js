import { computed, ref } from 'vue'
import { authorizedFetch } from './useAuth.js'

export function useSystemPrompts() {
  const items = ref([]), selectedId = ref(null), viewingId = ref(null)
  const busy = ref(false), loaded = ref(false), error = ref(''), message = ref(''), draft = ref(null)
  const selected = computed(() => items.value.find(prompt => prompt.id === selectedId.value) ?? null)
  const viewing = computed(() => items.value.find(prompt => prompt.id === viewingId.value) ?? selected.value)
  const dirty = computed(() => Boolean(draft.value && (draft.value.id === null ||
    draft.value.title !== draft.value.originalTitle || draft.value.content !== draft.value.originalContent)))
  const canSave = computed(() => Boolean(dirty.value && draft.value.title.trim() && draft.value.title.length <= 200 &&
    draft.value.content.trim() && draft.value.content.length <= 50000))
  let controller
  let disposed = false

  function apply(data) {
    if (!Array.isArray(data?.items) || !data.items.every(item => typeof item.id === 'string' &&
      typeof item.title === 'string' && typeof item.content === 'string' && Number.isInteger(item.revision)) ||
      (data.selected_id !== null && !data.items.some(item => item.id === data.selected_id))) {
      throw new Error('Could not read the saved prompts. Reload prompts to try again.')
    }
    items.value = data.items
    selectedId.value = data.selected_id
    loaded.value = true
  }

  async function request(path = '', options = {}) {
    if (busy.value || disposed) return null
    controller = new AbortController()
    busy.value = true; error.value = ''; message.value = ''
    try {
      const response = await authorizedFetch('/api/ai/system-prompts' + path, {
        ...options, signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not save or load prompts. Your edits are preserved; try again.')
      if (disposed) return null
      apply(data)
      return data
    } catch (failure) {
      if (!disposed) error.value = failure.message
      return null
    } finally { if (!disposed) busy.value = false }
  }

  async function load() {
    const data = await request()
    if (data && !viewingId.value) viewingId.value = selectedId.value ?? items.value[0]?.id ?? null
  }
  function edit(prompt = null) {
    if (busy.value) return
    draft.value = { id: prompt?.id ?? null, revision: prompt?.revision,
      title: prompt?.title ?? '', content: prompt?.content ?? '',
      originalTitle: prompt?.title ?? '', originalContent: prompt?.content ?? '' }
    error.value = ''; message.value = ''
  }
  function cancel() { if (!busy.value) draft.value = null }
  async function save() {
    if (!canSave.value || busy.value) return
    const current = draft.value
    const previousIds = new Set(items.value.map(item => item.id))
    const body = { title: current.title, content: current.content }
    if (current.id) body.revision = current.revision
    const data = await request(current.id ? '/' + current.id : '', { method: current.id ? 'PUT' : 'POST', body: JSON.stringify(body) })
    if (!data) return
    viewingId.value = current.id ?? items.value.find(item => !previousIds.has(item.id))?.id ?? null
    draft.value = null
    message.value = current.id ? 'Prompt saved.' : 'Prompt created. Choose “Use prompt” to select it for sending.'
  }
  async function select(prompt) {
    if (draft.value || busy.value) return
    if (await request('/' + prompt.id + '/select', { method: 'PUT' })) {
      viewingId.value = prompt.id
      message.value = `“${selected.value.title}” is selected for sending.`
    }
  }
  async function remove(prompt) {
    if (draft.value || busy.value) return
    if (await request('/' + prompt.id + '?revision=' + prompt.revision, { method: 'DELETE' })) {
      if (viewingId.value === prompt.id) viewingId.value = selectedId.value ?? items.value[0]?.id ?? null
      message.value = selected.value ? 'Prompt deleted.' : 'Prompt deleted. Choose a prompt before sending.'
    }
  }
  function dispose() { disposed = true; controller?.abort() }
  return { items, selected, viewing, viewingId, busy, loaded, error, message, draft, dirty, canSave, load, edit, cancel, save, select, remove, dispose }
}
