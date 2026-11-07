<script setup>
import { onUnmounted, ref } from 'vue'
import { authorizedFetch } from '../composables/useAuth.js'
const providers = ref([
  { id: 'deepseek', name: 'DeepSeek', body: JSON.stringify({ model: 'deepseek-flash', messages: [{role:'system',content:'Reply briefly.'},{role:'user',content:'Say hello.'}], max_tokens: 64 }, null, 2), result: '', error: '', busy: false },
  { id: 'elevenlabs', name: 'ElevenLabs', body: JSON.stringify({text:'Hello, world!',model_id:'eleven_multilingual_v2'}, null, 2), result: '', error: '', busy: false },
])
const controllers = new Set()
onUnmounted(() => controllers.forEach(controller => controller.abort()))
async function test(provider) {
  if (provider.busy) return
  let body
  try { body = JSON.parse(provider.body) } catch { provider.error = 'Request body must be valid JSON.'; return }
  const controller = new AbortController(); controllers.add(controller)
  provider.busy = true; provider.error = ''; provider.result = ''
  try {
    const response = await authorizedFetch('/api/ai/diagnostics/' + provider.id, {method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const data = await response.json()
    provider.result = JSON.stringify(data, null, 2)
    if (!response.ok) provider.error = `Diagnostic endpoint returned HTTP ${response.status}.`
  } catch (error) { if (!controller.signal.aborted) provider.error = error.message }
  finally { provider.busy = false; controllers.delete(controller) }
}
</script>
<template>
  <main class="page corpus-page">
    <h1>External API diagnostics</h1>
    <p>This page calls your backend, which makes the real request to DeepSeek or ElevenLabs. Requests may consume provider credits. Keys stay on the server and are masked in diagnostics.</p>
    <section v-for="provider in providers" :key="provider.id" class="corpus-sentence-card">
      <h2>{{ provider.name }}</h2>
      <p class="corpus-muted">Backend endpoint: <code>POST /api/ai/diagnostics/{{ provider.id }}</code>. Responses below come from the backend and the external provider.</p>
      <label :for="provider.id">Request JSON body</label>
      <textarea :id="provider.id" v-model="provider.body" class="ai-prompt-text" rows="12" :disabled="provider.busy" spellcheck="false" />
      <button class="button" :disabled="provider.busy" @click="test(provider)">{{ provider.busy ? 'Waiting for response…' : `Test ${provider.name}` }}</button>
      <p v-if="provider.error" role="alert" class="corpus-error">{{ provider.error }}</p>
      <p v-if="provider.busy" role="status">Sending request. Provider timeout is 45 seconds.</p>
      <template v-if="provider.result"><h3>Request and response details</h3><pre tabindex="0" :aria-label="`${provider.name} diagnostics`">{{ provider.result }}</pre></template>
    </section>
  </main>
</template>
<style scoped>
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f7faf8; padding: 1rem; border: 1px solid #bacdc4; border-radius: .6rem; max-height: 40rem; overflow: auto; }
</style>
