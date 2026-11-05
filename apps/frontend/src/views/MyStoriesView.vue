<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authorizedFetch, auth, logout } from '../composables/useAuth'
const stories = ref([])
const next = ref(null)
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const controller = new AbortController()
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ limit: '30', include_pending: 'true' })
    if (next.value) params.set('after', next.value)
    const response = await authorizedFetch('/api/corpus/stories?' + params, { signal: controller.signal })
    if (!response.ok) throw new Error('Could not load your stories. Please try again.')
    const data = await response.json()
    stories.value.push(...data.items)
    next.value = data.next_after
    loaded.value = true
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { loading.value = false }
}
async function signOut() { try { await logout() } catch (failure) { error.value = failure.message } }
onMounted(load)
onUnmounted(() => controller.abort())
</script>
<template>
  <main class="page corpus-page">
    <p class="corpus-eyebrow">{{ auth.user?.username }}’S LIBRARY</p><h1>My stories</h1>
    <div class="cluster"><RouterLink class="button" to="/corpus-upload">Upload a story</RouterLink><RouterLink to="/characters">My vocabulary</RouterLink><button class="corpus-text-button" @click="signOut">Log out</button></div>
    <p v-if="error" class="corpus-error" role="alert">{{ error }} <button class="corpus-text-button" @click="load">Try again</button></p>
    <p v-if="loading" role="status">Loading stories…</p>
    <section v-if="loaded && !stories.length" class="corpus-empty"><h2>Your first story starts here</h2><p>Upload a Chinese text file to build your private library.</p><RouterLink class="button" to="/corpus-upload">Upload your first story</RouterLink></section>
    <ul class="route-list">
      <li v-for="story in stories" :key="story.id"><RouterLink :to="story.status === 'completed' ? `/my-stories/${story.id}` : { path: '/corpus-upload', query: { import: story.import_id } }"><span><strong>{{ story.title }}</strong><br><small>{{ story.status }} · {{ story.character_count.toLocaleString() }} characters</small></span><span>{{ story.status === 'completed' ? 'Read story →' : 'View import →' }}</span></RouterLink></li>
    </ul>
    <button v-if="next" class="button" :disabled="loading" @click="load">Load more stories</button>
  </main>
</template>
