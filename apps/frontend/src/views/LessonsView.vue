<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
const items = ref([]), next = ref(null), busy = ref(false), loaded = ref(false), error = ref('')
const controller = new AbortController()
async function load() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const response = await authorizedFetch('/api/lessons?offset=' + (next.value || 0),{signal:controller.signal})
    if (!response.ok) throw new Error('Could not load lessons. Try again.')
    const data = await response.json(); items.value.push(...data.items); next.value = data.next; loaded.value = true
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { busy.value = false }
}
onMounted(load); onUnmounted(() => controller.abort())
</script>
<template><main class="page corpus-page"><h1>My lessons</h1><RouterLink class="button" to="/lessons/new">Create a lesson</RouterLink><p v-if="error" class="corpus-error" role="alert">{{ error }} <button @click="load">Retry</button></p><p v-if="busy" role="status">Loading lessons…</p><p v-if="loaded && !items.length">No lessons yet. Create one by pasting your JSON.</p><ul class="route-list"><li v-for="lesson in items" :key="lesson.id"><RouterLink :to="`/lessons/${lesson.id}/play`"><span><strong>{{ lesson.title }}</strong><br><small>Revision {{ lesson.revision }} · {{ new Date(lesson.updated_at).toLocaleString() }}</small></span><span>Play →</span></RouterLink><RouterLink class="button lesson-edit" :to="`/lessons/${lesson.id}`" :aria-label="`Edit ${lesson.title}`">Edit</RouterLink></li></ul><button v-if="next !== null" class="button" :disabled="busy" @click="load">Load more lessons</button></main></template>

<style scoped>
.route-list .lesson-edit { width:fit-content; margin:.5rem 1rem 1rem; padding:.5rem 1rem; background:var(--color-primary); color:white; border-radius:.5rem; }
</style>
