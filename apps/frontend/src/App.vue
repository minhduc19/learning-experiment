<script setup>
import { ref, onMounted } from 'vue'
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
  <main>
    <p>YOUR MONOREPO IS READY</p>
    <h1>FastAPI + Vue</h1>
    <p>A Python API and a Vue 3 frontend, working together.</p>
    <p>Deployment check: version 3</p>
    <p role="status">Backend: {{ status }}</p>
    <button @click="checkHealth">Check connection</button>
    <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API documentation</a>
  </main>
</template>

<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #f2f6f5; color: #163b35; }
main { max-width: 640px; margin: 12vh auto; padding: 32px; }
h1 { font-size: clamp(36px, 7vw, 64px); }
button { padding: 12px 20px; border: 0; border-radius: 8px; background: #126c58; color: white; cursor: pointer; }
a { display: inline-block; margin: 20px; color: #126c58; }
</style>
