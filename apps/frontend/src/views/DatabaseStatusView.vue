<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const checking = ref(false)
const result = ref({ state: 'checking', title: 'Checking connection…', message: 'Contacting the database through the API.' })
const checkedAt = ref(null)
let controller
let timeout
let disposed = false

async function checkConnection() {
  if (checking.value) return
  checking.value = true
  result.value = { state: 'checking', title: 'Checking connection…', message: 'Contacting the database through the API.' }
  controller = new AbortController()
  timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch('/api/health/db', { cache: 'no-store', signal: controller.signal })
    const data = await response.json().catch(() => null)
    if (disposed) return
    if (response.ok && data?.status === 'ok' && data?.database === 'connected') {
      result.value = { state: 'healthy', title: 'Database connected', message: 'PostgreSQL is reachable through the API and frontend proxy.' }
    } else if (response.status === 503 && data?.database === 'unavailable') {
      result.value = { state: 'error', title: 'Database unavailable', message: 'The API is reachable, but it cannot connect to PostgreSQL. Check the database service and connection settings.' }
    } else if (!response.ok) {
      result.value = { state: 'error', title: 'Service unavailable', message: `The server returned HTTP ${response.status}. The database connection could not be verified.` }
    } else {
      result.value = { state: 'error', title: 'Unexpected response', message: 'The server did not return a valid database health result. Try again or check the API deployment.' }
    }
  } catch {
    if (!disposed) {
      result.value = controller.signal.aborted
        ? { state: 'error', title: 'Check timed out', message: 'The check took longer than 10 seconds. Try again.' }
        : { state: 'error', title: 'Connection failed', message: 'The server could not be reached. Check your connection and try again.' }
    }
  } finally {
    clearTimeout(timeout)
    if (!disposed) {
      checking.value = false
      checkedAt.value = new Date()
    }
  }
}

onMounted(checkConnection)
onUnmounted(() => {
  disposed = true
  clearTimeout(timeout)
  controller?.abort()
})
</script>

<template>
  <main class="page database-status">
    <p class="database-status-eyebrow">SYSTEM STATUS</p>
    <h1>Database status</h1>
    <p>Check whether this app can connect to PostgreSQL.</p>

    <section class="database-status-card" :data-state="result.state" role="status" aria-live="polite" aria-atomic="true">
      <span class="database-status-icon" aria-hidden="true">{{ checking ? '…' : result.state === 'healthy' ? '✓' : '!' }}</span>
      <div>
        <h2>{{ result.title }}</h2>
        <p>{{ result.message }}</p>
      </div>
    </section>

    <p v-if="checkedAt" class="database-status-timestamp">
      Last checked: <time :datetime="checkedAt.toISOString()">{{ checkedAt.toLocaleString() }}</time>
    </p>
    <div class="cluster">
      <button class="button" :disabled="checking" @click="checkConnection">{{ checking ? 'Checking…' : 'Check again' }}</button>
      <a href="/api/health/db" target="_blank" rel="noreferrer">View API response ↗</a>
    </div>
    <p class="database-status-note">This shows the result of the latest check. Use Check again to refresh it.</p>
  </main>
</template>

<style scoped>
.database-status-eyebrow { font-size: 0.75rem; letter-spacing: 0.12em; font-weight: 700; color: var(--color-primary); }
.database-status h1 { font-size: clamp(2rem, 6vw, 3rem); }
.database-status-card { display: flex; align-items: flex-start; gap: var(--space-3); margin-block: var(--space-4); padding: var(--space-4); border: 1px solid #cbd6ce; border-radius: 16px; background: white; }
.database-status-card h2 { margin: 0 0 var(--space-1); font-size: 1.3rem; }
.database-status-card p { margin: 0; }
.database-status-card[data-state="healthy"] { border-color: #89b78c; background: #eef8ec; }
.database-status-card[data-state="error"] { border-color: #ce9993; background: #fff1ef; }
.database-status-icon { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: #e9efeb; font-size: 1.5rem; font-weight: 700; }
[data-state="healthy"] .database-status-icon { background: #d0edc9; color: #245800; }
[data-state="error"] .database-status-icon { background: #f7d9d5; color: #9c2525; }
.database-status-timestamp, .database-status-note { color: #52665d; font-size: 0.85rem; }
</style>
