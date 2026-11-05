import { reactive } from 'vue'

export const auth = reactive({ user: null, ready: false })
let token = null
let expiresAt = 0
let refreshTask
let initialized

function accept(data) {
  token = data.access_token
  expiresAt = Date.now() + 14 * 60 * 1000
  auth.user = data.user
  auth.ready = true
  return token
}

function clear(forgetUploads = false) {
  const previous = auth.user?.id
  token = null
  expiresAt = 0
  auth.user = null
  auth.ready = true
  try {
    localStorage.removeItem('corpus-upload-v1')
    if (forgetUploads && previous) localStorage.removeItem('corpus-upload-v1:' + previous)
  } catch {}
}

async function request(path, data) {
  const response = await fetch('/api/auth/' + path, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : 'Please check your details and try again.')
  return result
}

export async function refreshAuth() {
  if (!refreshTask) refreshTask = request('refresh').then(accept).catch(() => { clear(); return null }).finally(() => { refreshTask = null })
  return refreshTask
}

export async function initializeAuth() {
  if (auth.ready) return
  if (!initialized) initialized = refreshAuth()
  await initialized
}

export async function sessionToken() {
  if (token && Date.now() < expiresAt) return token
  return refreshAuth()
}

export async function authorizedFetch(path, options = {}) {
  const access = await sessionToken()
  const headers = new Headers(options.headers)
  if (access) headers.set('Authorization', 'Bearer ' + access)
  let response = await fetch(path, { cache: 'no-store', ...options, headers })
  if (response.status === 401 && access) {
    const refreshed = await refreshAuth()
    if (refreshed) {
      headers.set('Authorization', 'Bearer ' + refreshed)
      response = await fetch(path, { cache: 'no-store', ...options, headers })
    }
  }
  return response
}

export async function login(email, password) {
  accept(await request('login', { email, password }))
}

export async function register(data) {
  await request('register', data)
  await login(data.email, data.password)
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin',
    headers: token ? { Authorization: 'Bearer ' + token } : {} })
  if (!response.ok) throw new Error('Could not log out. Please try again.')
  clear(true)
}
