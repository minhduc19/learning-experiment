import { reactive } from 'vue'
import { authorizedFetch } from './useAuth.js'

// Each flag has its own request state so both can be selected in quick succession.
export function useVocabularyProgress(entry, resource, idField, fetcher = authorizedFetch) {
  const state = reactive({
    learned: Boolean(entry.learned),
    learning: Boolean(entry.learning),
    busy: { learned: false, learning: false },
    errors: { learned: '', learning: '' },
  })

  async function toggle(flag) {
    if (!Object.hasOwn(state.busy, flag) || state.busy[flag]) return
    const previous = state[flag]
    const desired = !previous
    state[flag] = desired
    state.busy[flag] = true
    state.errors[flag] = ''
    try {
      const response = await fetcher(`/api/corpus/${resource}/${entry.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: desired }),
      })
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (result[idField] !== entry.id || typeof result[flag] !== 'boolean') throw new Error()
      // The other flag may have a newer pending request. Never overwrite it
      // with a snapshot from this response.
      state[flag] = result[flag]
    } catch {
      state[flag] = previous
      state.errors[flag] = `Could not save “${flag === 'learned' ? 'Learned' : 'Learning'}”. Try again.`
    } finally {
      state.busy[flag] = false
    }
  }

  return Object.assign(state, { toggle })
}
