import { authorizedFetch } from './useAuth.js'
import { getCurrentScope, onScopeDispose, reactive } from 'vue'

export async function fetchCorpus(path, signal, fetcher = authorizedFetch) {
  let response
  try {
    response = await fetcher(path, { signal, cache: 'no-store' })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach the corpus. Check your connection and try again.')
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error('This character is not available in the completed corpus.')
    throw new Error('The corpus service is unavailable. Please try again.')
  }
  try {
    return await response.json()
  } catch {
    throw new Error('The corpus returned an unexpected response. Please try again.')
  }
}

// The revision guards against stale responses even if a transport ignores abort.
export function useCorpusPage(pageSize = 30, fetcher = authorizedFetch) {
  const state = reactive({ items: [], nextCursor: null, loading: false, error: '', loaded: false })
  let endpoint = null
  let controller
  let revision = 0

  async function load() {
    if (!endpoint || state.loading) return
    const ticket = revision
    const requestController = new AbortController()
    controller = requestController
    const signal = requestController.signal
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; requestController.abort() }, 140000)
    state.loading = true
    state.error = ''
    const params = new URLSearchParams({ limit: String(pageSize) })
    if (state.nextCursor) params.set('cursor', state.nextCursor)
    try {
      const data = await fetchCorpus(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${params}`, signal, fetcher)
      if (ticket !== revision) return
      if (!Array.isArray(data?.items) || !(data.next_cursor === null || typeof data.next_cursor === 'string')) {
        throw new Error('The corpus returned an unexpected response. Please try again.')
      }
      state.items = [...new Map([...state.items, ...data.items].map(item => [item.id, item])).values()]
      state.nextCursor = data.next_cursor
      state.loaded = true
    } catch (error) {
      if (ticket === revision) state.error = timedOut ? 'The request took too long. Please try again.' : error.message
    } finally {
      clearTimeout(timeout)
      if (ticket === revision) state.loading = false
    }
  }

  function dispose() {
    revision += 1
    controller?.abort()
  }

  function reset(url) {
    dispose()
    endpoint = url
    Object.assign(state, { items: [], nextCursor: null, loading: false, error: '', loaded: false })
    return load()
  }

  if (getCurrentScope()) onScopeDispose(dispose)
  return Object.assign(state, { load, reset, dispose })
}

export function characterLabel(value) {
  const names = { ' ': 'Space', '\n': 'Line feed', '\r': 'Carriage return', '\t': 'Tab', '\ufeff': 'BOM', '\u3000': 'Full-width space' }
  if (Object.hasOwn(names, value)) return names[value]
  if (/^[\s\p{Cf}\p{Cc}]+$/u.test(value)) return Array.from(value).map(character => names[character] ?? `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' + ')
  return value
}

export function highlightedText(text, matches) {
  // API offsets are code points; String.slice would misplace astral characters.
  const characters = Array.from(text)
  const ranges = [...matches].sort((a, b) => a.start_offset - b.start_offset)
  const parts = []
  let offset = 0
  for (const match of ranges) {
    const start = Math.max(offset, Math.min(characters.length, match.start_offset))
    const end = Math.max(start, Math.min(characters.length, match.end_offset))
    if (start > offset) parts.push({ text: characters.slice(offset, start).join(''), match: false })
    if (end > start) parts.push({ text: characters.slice(start, end).join(''), match: true })
    offset = end
  }
  if (offset < characters.length) parts.push({ text: characters.slice(offset).join(''), match: false })
  return parts
}

export const formatCount = value => new Intl.NumberFormat().format(value)
