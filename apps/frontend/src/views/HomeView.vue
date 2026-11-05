<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
const status = ref('Checking…')
async function checkHealth() {
  status.value = 'Checking…'
  try {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error('Request failed')
    const data = await response.json()
    status.value = data.status === 'ok' ? 'Connected' : 'Unexpected API response'
  } catch {
    status.value = 'API unavailable — start the backend and try again.'
  }
}
onMounted(checkHealth)
</script>

<template>
  <main class="page">
    <p>YOUR MONOREPO IS READY</p>
    <h1>FastAPI + Vue</h1>
    <p>A Python API and a Vue 3 frontend, working together.</p>
    <p><RouterLink :to="{ name: 'ideas' }">Browse ideas and activities →</RouterLink></p>
    <p>Deployment check: version 4</p>
    <p role="status">Backend: {{ status }}</p>
    <div class="cluster">
      <button class="button" @click="checkHealth">Check connection</button>
      <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API documentation</a>
    </div>
  </main>
</template>

