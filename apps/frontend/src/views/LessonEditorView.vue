<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter, RouterLink } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import { parseLesson, sampleLesson } from '../composables/lessonJson'
import LessonPreview from '../components/LessonPreview.vue'
const route = useRoute(), router = useRouter()
const text = ref(''), baseline = ref(''), revision = ref(null), busy = ref(false), error = ref(''), message = ref(''), confirmDelete = ref(false), loaded = ref(false)
const creating = computed(() => route.name === 'lesson-new')
const parsed = computed(() => { try { return { document: parseLesson(text.value), error: '' } } catch (failure) { return { document: null, error: failure.message } } })
const dirty = computed(() => text.value !== baseline.value)
let generation = 0, controller
async function api(path, options = {}) {
  const response = await authorizedFetch(path, { ...options, signal: controller?.signal })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Lesson request failed. Try again.')
  return data
}
function accept(data) { text.value = JSON.stringify(data.document, null, 2); baseline.value = text.value; revision.value = data.revision; loaded.value = true }
async function load() {
  const ticket = ++generation; controller?.abort(); controller = new AbortController(); busy.value = true; loaded.value = false; error.value = ''; message.value = ''; confirmDelete.value = false
  try {
    if (creating.value) { text.value = JSON.stringify(sampleLesson,null,2); baseline.value = text.value; revision.value = null; loaded.value = true }
    else { const data = await api('/api/lessons/' + encodeURIComponent(route.params.lessonId)); if (ticket === generation) accept(data) }
  } catch (failure) { if (ticket === generation && !controller.signal.aborted) error.value = failure.message }
  finally { if (ticket === generation) busy.value = false }
}
async function save() {
  if (busy.value || !parsed.value.document) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    const isNew = creating.value
    const data = await api(isNew ? '/api/lessons' : '/api/lessons/' + route.params.lessonId, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isNew ? parsed.value.document : { revision: revision.value, document: parsed.value.document }) })
    accept(data); message.value = 'Lesson saved.'
    if (isNew) await router.replace('/lessons/' + data.id)
  } catch (failure) { error.value = failure.message }
  finally { busy.value = false }
}
async function remove() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await api(`/api/lessons/${route.params.lessonId}?revision=${revision.value}`,{method:'DELETE'}); baseline.value = text.value; await router.push('/lessons') }
  catch (failure) { error.value = failure.message }
  finally { busy.value = false }
}
function leaving() { return !dirty.value || window.confirm('Discard unsaved lesson changes? Copy your JSON first if you want to keep it.') }
onBeforeRouteLeave(leaving)
onBeforeRouteUpdate((to, from) => to.path === from.path || leaving())
function unload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload',unload)
onUnmounted(() => { generation++; controller?.abort(); window.removeEventListener('beforeunload',unload) })
watch([() => route.name, () => route.params.lessonId], load, { immediate: true })
</script>
<template>
  <main class="page corpus-page lesson-editor"><RouterLink to="/lessons">← All lessons</RouterLink><h1>{{ creating ? 'Create a lesson' : 'Edit lesson' }}</h1>
    <p>Paste a lesson object or a JSON array from questions.js (without the JavaScript export declaration). Items stay in array order. Currently supported: multiple-choice.</p>
    <p v-if="error" class="corpus-error" role="alert">{{ error }} <button v-if="!loaded" class="corpus-text-button" @click="load">Retry</button></p><p v-if="message" role="status">{{ message }}</p><p v-if="busy" role="status">Loading or saving lesson…</p>
    <template v-if="loaded"><div class="cluster"><button class="button" :disabled="busy || !parsed.document" @click="save">{{ creating ? 'Create lesson' : 'Save changes' }}</button><button class="corpus-text-button" :disabled="busy || !parsed.document" @click="text = JSON.stringify(parsed.document,null,2)">Format JSON</button><button v-if="!creating" class="corpus-text-button" :disabled="busy" @click="leaving() && load()">Reload saved lesson</button><button v-if="!creating" class="corpus-text-button" :disabled="busy" @click="confirmDelete = !confirmDelete">Delete lesson</button><span>{{ dirty ? 'Unsaved changes' : creating ? 'Not saved yet' : `Saved · revision ${revision}` }}</span></div>
      <section v-if="confirmDelete" class="corpus-error" role="alert"><p>Permanently delete this lesson{{ dirty ? ' and discard unsaved changes' : '' }}?</p><button class="button" :disabled="busy" @click="remove">Confirm delete</button><button class="corpus-text-button" @click="confirmDelete=false">Cancel</button></section>
      <div class="lesson-editor-grid"><section><label for="lesson-json"><strong>Lesson JSON</strong></label><textarea id="lesson-json" v-model="text" :disabled="busy" spellcheck="false" :aria-invalid="Boolean(parsed.error)" aria-describedby="lesson-json-status" /><p id="lesson-json-status" :role="parsed.error ? 'alert' : 'status'">{{ parsed.error || 'Valid lesson JSON. Preview updates as you edit.' }}</p></section>
        <LessonPreview v-if="parsed.document" :key="text" :lesson="parsed.document" /><section v-else class="corpus-empty"><h2>Preview unavailable</h2><p>Fix the JSON errors to preview and save this lesson.</p></section>
      </div>
    </template>
  </main>
</template>
