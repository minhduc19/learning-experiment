<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const loading = ref(false)
const errorMessage = ref('')
const api = ref(null)
let controller
let timeout
let disposed = false

async function loadDocs() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  api.value = null
  controller = new AbortController()
  timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch('/api/openapi.json', { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`API documentation is unavailable (HTTP ${response.status}).`)
    const schema = await response.json()
    if (!schema.openapi || !schema.info?.title || !schema.paths) throw new Error('The API did not return a valid documentation schema.')
    if (!disposed) api.value = schema.info
  } catch (error) {
    if (!disposed) errorMessage.value = controller.signal.aborted ? 'The documentation request timed out. Please try again.' : error.message || 'Could not load API documentation.'
  } finally {
    clearTimeout(timeout)
    if (!disposed) loading.value = false
  }
}

onMounted(loadDocs)
onUnmounted(() => {
  disposed = true
  clearTimeout(timeout)
  controller?.abort()
})
</script>

<template>
  <main class="page api-docs">
    <h1>API documentation</h1>
    <p>Explore endpoints, request formats, and responses. Use <strong>Try it out</strong> to send requests to this app’s API.</p>
    <div class="cluster api-docs-links">
      <a href="/api/docs" target="_blank" rel="noreferrer">Open interactive docs ↗</a>
      <a href="/api/openapi.json" target="_blank" rel="noreferrer">View OpenAPI JSON ↗</a>
    </div>
    <p v-if="loading" role="status">Loading API documentation…</p>
    <section v-else-if="errorMessage" role="alert" class="api-docs-error">
      <p>{{ errorMessage }}</p>
      <button class="button" @click="loadDocs">Retry</button>
    </section>
    <template v-else-if="api">
      <p class="api-docs-caption">{{ api.title }} · Version {{ api.version }} · Generated from the live API</p>
      <iframe class="api-docs-frame" src="/api/docs" title="Interactive API documentation" />
      <p class="api-docs-caption">If the interactive reference does not appear, open the docs in a new tab or view the OpenAPI JSON above.</p>
    </template>
  </main>
</template>

<style scoped>
.api-docs { max-width: 1200px; margin-block: var(--space-4); }
.api-docs h1 { font-size: clamp(2rem, 5vw, 3rem); }
.api-docs-links { margin-block: var(--space-4); }
.api-docs-frame { display: block; width: 100%; height: 75dvh; min-height: 420px; border: 1px solid #dce6dc; border-radius: 12px; background: white; }
.api-docs-caption { color: #52665d; font-size: 0.85rem; }
.api-docs-error { padding: var(--space-4); border: 1px solid #ce9993; border-radius: 12px; background: #fff1ef; }
</style>
