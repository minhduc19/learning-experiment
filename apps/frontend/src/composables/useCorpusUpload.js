import { auth, authorizedFetch, sessionToken } from './useAuth.js'
import { getCurrentScope, markRaw, onScopeDispose, reactive } from 'vue'

const SESSION_KEY = 'corpus-upload-v1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const aborted = () => new DOMException('Request stopped', 'AbortError')

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const unit = bytes ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1) : 0
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unit ? 1 : 0 }).format(bytes / 1024 ** unit)} ${units[unit]}`
}

export function importFailure(message = '') {
  if (/utf-8|nul character/i.test(message)) {
    return 'The file could not be read as UTF-8 text. Save it as UTF-8 without NUL characters, then upload it again.'
  }
  return 'The import could not finish. You can retry it from its last saved checkpoint.'
}

export async function sendCorpusChunk({ path, offset, chunk, signal, onProgress }) {
  const token = await sessionToken()
  if (!token) throw new Error('Please log in again to resume your upload.')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false
    function finish(error, result) {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', stop)
      if (error) reject(error)
      else resolve(result)
    }
    const stop = () => { xhr.abort(); finish(aborted()) }
    if (signal.aborted) { finish(aborted()); return }
    xhr.open('PATCH', path)
    xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('Upload-Offset', String(offset))
    xhr.timeout = 120000
    xhr.upload.onprogress = event => onProgress(Math.min(event.loaded, chunk.size))
    xhr.onload = () => {
      if (xhr.status === 204) {
        const header = xhr.getResponseHeader('Upload-Offset')
        finish(null, header === null ? NaN : Number(header))
      } else {
        const error = new Error(xhr.status === 413 ? 'The server rejected the upload size. Check the file limit and try again.' : 'The upload was interrupted. Resume to continue from the server’s saved position.')
        error.status = xhr.status
        finish(error)
      }
    }
    xhr.onerror = () => finish(new Error('The connection was interrupted. Resume the upload to continue.'))
    xhr.ontimeout = () => finish(new Error('The upload timed out. Resume to continue from its saved position.'))
    xhr.onabort = () => finish(aborted())
    signal.addEventListener('abort', stop, { once: true })
    try { xhr.send(chunk) } catch (error) { finish(error) }
  })
}

export function useCorpusUpload({ fetcher = (...args) => authorizedFetch(...args), patch = sendCorpusChunk,
  storage, pollDelay = 2000 } = {}) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage } catch { /* Storage may be disabled. */ }
  }
  const sessionKey = auth.user ? `${SESSION_KEY}:${auth.user.id}` : SESSION_KEY
  const state = reactive({ phase: 'idle', file: null, fileMeta: null, title: '', uploadId: null,
    importId: null, uploaded: 0, inFlight: 0, limits: null, limitsLoading: false,
    limitsError: '', fileError: '', error: '', job: null, working: false, checking: false })
  let revision = 0
  let disposed = false
  let operation
  let pollTimer
  const requests = new Set()

  function save() {
    if (!state.uploadId && !state.importId) return
    try {
      storage?.setItem(sessionKey, JSON.stringify({ version: 1, fileMeta: state.fileMeta,
        title: state.title, uploadId: state.uploadId, importId: state.importId }))
    } catch { /* Uploads still work when browser storage is unavailable. */ }
  }

  async function api(path, { method = 'GET', body, signal } = {}) {
    const request = new AbortController()
    requests.add(request)
    const stop = () => request.abort()
    if (disposed || signal?.aborted) { requests.delete(request); throw aborted() }
    signal?.addEventListener('abort', stop, { once: true })
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; request.abort() }, 35000)
    try {
      const response = await fetcher(`/api/corpus${path}`, { method, signal: request.signal, cache: 'no-store',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
      if (!response.ok) {
        const message = response.status === 404 ? 'This saved upload or import was not found. Start a new upload.'
          : response.status === 413 ? 'This file exceeds the server’s upload limit.'
          : response.status === 409 ? 'The upload state changed. Resume or check its status again.'
          : 'The corpus service is unavailable. Please try again.'
        throw new Error(message)
      }
      return await response.json()
    } catch (error) {
      if (timedOut) throw new Error('The request took too long. Please try again.')
      if (error.name === 'AbortError') throw error
      if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('Could not reach the corpus service. Check your connection and try again.')
      throw error
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', stop)
      requests.delete(request)
    }
  }

  function stopOperation() {
    revision += 1
    operation?.abort()
    clearTimeout(pollTimer)
    state.working = false
    state.checking = false
    state.inFlight = 0
  }

  async function loadLimits() {
    state.limitsLoading = true
    state.limitsError = ''
    try {
      const limits = await api('/limits')
      if (disposed) return
      if (!Number.isSafeInteger(limits?.max_upload_bytes) || limits.max_upload_bytes <= 0
        || !Number.isSafeInteger(limits.max_chunk_bytes) || limits.max_chunk_bytes <= 0) throw new Error('The server returned invalid upload limits. Please try again.')
      state.limits = limits
    } catch (error) {
      if (!disposed) state.limitsError = error.message
    } finally {
      if (!disposed) state.limitsLoading = false
    }
  }

  function selectFile(file) {
    if (state.working || state.importId) return
    state.fileError = ''
    state.error = ''
    state.file = null
    if (!file) return
    const meta = { name: file.name, size: file.size, lastModified: file.lastModified }
    if (state.uploadId && ['name', 'size', 'lastModified'].some(key => meta[key] !== state.fileMeta?.[key])) {
      state.fileError = 'Reselect the same, unchanged file to resume, or start a different upload.'
      return
    }
    if (!/\.txt$/i.test(file.name)) state.fileError = 'Choose a .txt file saved as UTF-8.'
    else if (!file.size) state.fileError = 'This file is empty. Choose a file containing your story.'
    else if (state.limits && file.size > state.limits.max_upload_bytes) state.fileError = `This file exceeds the ${formatBytes(state.limits.max_upload_bytes)} upload limit.`
    if (state.fileError) {
      if (!state.uploadId) { state.fileMeta = null; state.phase = 'idle' }
      return
    }
    const oldDefault = state.fileMeta?.name.replace(/\.txt$/i, '')
    if (!state.title || state.title === oldDefault) state.title = file.name.replace(/\.txt$/i, '').slice(0, 300) || 'Untitled story'
    state.fileMeta = meta
    state.file = markRaw(file)
    state.phase = state.uploadId ? 'paused' : 'ready'
  }

  async function poll(ticket, signal) {
    if (disposed || ticket !== revision) return
    state.checking = true
    try {
      const job = await api(`/imports/${state.importId}`, { signal })
      if (disposed || ticket !== revision) return
      if (!UUID.test(job.id) || job.id !== state.importId || !['queued', 'processing', 'completed', 'failed'].includes(job.status)) throw new Error('The server returned an unexpected import status. Please try again.')
      state.job = job
      state.title = job.title
      state.phase = job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : 'importing'
      if (state.phase === 'completed') state.file = null
      state.error = ''
      save()
      if (state.phase === 'importing') pollTimer = setTimeout(() => poll(ticket, signal), pollDelay)
    } catch (error) {
      if (!disposed && ticket === revision) state.error = error.message
    } finally {
      if (!disposed && ticket === revision) state.checking = false
    }
  }

  async function monitor(importId) {
    stopOperation()
    state.error = ''
    state.job = null
    if (!UUID.test(importId)) {
      state.phase = 'idle'
      state.error = 'This import link is invalid. Start a new upload.'
      return
    }
    state.importId = importId
    state.phase = 'importing'
    operation = new AbortController()
    save()
    await poll(revision, operation.signal)
  }

  async function start() {
    if (state.working || state.importId) return
    if (!state.file || !state.limits) { state.fileError = 'Choose your .txt file before starting.'; return }
    if (state.file.size > state.limits.max_upload_bytes) { state.fileError = 'This file exceeds the server’s upload limit.'; return }
    if (state.title.trim().length > 300) { state.fileError = 'Keep the story title within 300 characters.'; return }
    stopOperation()
    const ticket = revision
    const active = () => { if (disposed || ticket !== revision) throw aborted() }
    operation = new AbortController()
    const signal = operation.signal
    state.working = true
    state.error = ''
    state.fileError = ''
    state.title = state.title.trim() || state.fileMeta.name.replace(/\.txt$/i, '') || 'Untitled story'
    save()
    try {
      if (!state.uploadId) {
        state.phase = 'creating'
        const upload = await api('/uploads', { method: 'POST', body: { filename: state.fileMeta.name, size: state.file.size }, signal })
        active()
        if (!UUID.test(upload.id)) throw new Error('The server returned an invalid upload. Please try again.')
        state.uploadId = upload.id
        save()
      }
      state.phase = 'uploading'
      const saved = await api(`/uploads/${state.uploadId}`, { signal })
      active()
      if (saved.size !== state.file.size || !Number.isSafeInteger(saved.offset_bytes)
        || saved.offset_bytes < 0 || saved.offset_bytes > saved.size) throw new Error('The saved upload does not match this file. Start a different upload.')
      state.uploaded = saved.offset_bytes
      // Keep browser memory bounded even if a future server allows larger chunks.
      const chunkSize = Math.min(state.limits.max_chunk_bytes, 8 * 1024 ** 2)
      while (state.uploaded < state.file.size) {
        const offset = state.uploaded
        const chunk = state.file.slice(offset, offset + chunkSize)
        let nextOffset
        try {
          nextOffset = await patch({ path: `/api/corpus/uploads/${state.uploadId}`, offset, chunk, signal,
            onProgress: bytes => { if (!disposed && ticket === revision) state.inFlight = Math.max(0, Math.min(bytes, chunk.size)) } })
        } catch (error) {
          active()
          if (error.status !== 409) throw error
          // An aborted request or another tab may already have committed this
          // chunk. Reconcile with the server rather than sending it twice.
          const latest = await api(`/uploads/${state.uploadId}`, { signal })
          active()
          if (latest.size !== state.file.size || !Number.isSafeInteger(latest.offset_bytes)
            || latest.offset_bytes <= offset || latest.offset_bytes > latest.size) throw error
          state.uploaded = latest.offset_bytes
          state.inFlight = 0
          continue
        }
        active()
        if (nextOffset !== offset + chunk.size) throw new Error('The upload position changed. Resume to check the server’s saved position.')
        state.uploaded = nextOffset
        state.inFlight = 0
      }
      state.phase = 'queuing'
      const job = await api('/imports', { method: 'POST', body: { upload_id: state.uploadId, title: state.title }, signal })
      active()
      if (!UUID.test(job.id)) throw new Error('The server returned an invalid import. Resume to check again.')
      state.importId = job.id
      state.phase = 'importing'
      save()
      state.working = false
      await poll(ticket, signal)
    } catch (error) {
      if (!disposed && ticket === revision) {
        state.error = error.message
        state.phase = state.uploadId ? 'paused' : 'ready'
        state.inFlight = 0
      }
    } finally {
      if (!disposed && ticket === revision) state.working = false
    }
  }

  function pause() {
    if (state.phase !== 'uploading') return
    stopOperation()
    state.phase = 'paused'
    state.error = ''
    save()
  }

  async function retryImport() {
    if (state.working || state.job?.status !== 'failed' || /utf-8|nul character/i.test(state.job.error || '')) return
    stopOperation()
    const ticket = revision
    operation = new AbortController()
    const signal = operation.signal
    state.working = true
    state.error = ''
    try {
      await api(`/imports/${state.importId}/retry`, { method: 'POST', signal })
      if (disposed || ticket !== revision) return
      state.phase = 'importing'
      state.job = null
      await poll(ticket, signal)
    } catch (error) {
      if (!disposed && ticket === revision) state.error = error.message
    } finally {
      if (!disposed && ticket === revision) state.working = false
    }
  }

  function reset() {
    stopOperation()
    Object.assign(state, { phase: 'idle', file: null, fileMeta: null, title: '', uploadId: null,
      importId: null, uploaded: 0, inFlight: 0, fileError: '', error: '', job: null })
    try { storage?.removeItem(sessionKey) } catch { /* Optional browser storage. */ }
  }

  async function initialize(importId) {
    let cached
    try { cached = JSON.parse(storage?.getItem(sessionKey) || 'null') } catch { /* Ignore invalid saved data. */ }
    if (cached?.version === 1 && (!importId || cached.importId === importId)
      && (!cached.uploadId || UUID.test(cached.uploadId)) && (!cached.importId || UUID.test(cached.importId))
      && (cached.importId || (cached.fileMeta && typeof cached.fileMeta.name === 'string' && Number.isSafeInteger(cached.fileMeta.size) && cached.fileMeta.size > 0))) {
      Object.assign(state, { fileMeta: cached.fileMeta, title: typeof cached.title === 'string' ? cached.title.slice(0, 300) : '',
        uploadId: cached.uploadId, importId: cached.importId, phase: 'paused' })
    }
    const restoreOffset = async () => {
      const ticket = revision
      try {
        const saved = await api(`/uploads/${state.uploadId}`)
        if (disposed || ticket !== revision) return
        if (saved.size !== state.fileMeta.size || !Number.isSafeInteger(saved.offset_bytes)
          || saved.offset_bytes < 0 || saved.offset_bytes > saved.size) throw new Error('The saved upload does not match this file. Start a different upload.')
        state.uploaded = saved.offset_bytes
      } catch (error) {
        if (!disposed && ticket === revision) state.error = error.message
      }
    }
    await Promise.allSettled([loadLimits(), ...(importId || state.importId
      ? [monitor(importId || state.importId)] : state.uploadId ? [restoreOffset()] : [])])
  }

  function dispose() {
    disposed = true
    stopOperation()
    for (const request of requests) request.abort()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return Object.assign(state, { initialize, loadLimits, selectFile, start, pause, monitor, retryImport, reset, dispose })
}
