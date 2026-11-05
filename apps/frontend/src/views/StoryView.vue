<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import { useCorpusPage } from '../composables/useCorpusPage'
const route = useRoute()
const story = ref(null)
const error = ref('')
const script = ref('raw_text')
const pages = useCorpusPage(50)
let controller
let revision = 0
async function load() {
  const ticket = ++revision
  controller?.abort()
  controller = new AbortController()
  story.value = null
  error.value = ''
  pages.reset(null)
  try {
    const id = encodeURIComponent(route.params.storyId)
    const response = await authorizedFetch('/api/corpus/stories/' + id, { signal: controller.signal })
    if (!response.ok) throw new Error('This story is not available in your library.')
    const data = await response.json()
    if (ticket !== revision) return
    story.value = data
    if (data.status === 'completed') pages.reset(`/api/corpus/stories/${id}/sentences`)
  } catch (failure) { if (ticket === revision && !controller.signal.aborted) error.value = failure.message }
}
watch(() => route.params.storyId, load, { immediate: true })
onUnmounted(() => { revision++; controller?.abort() })
</script>
<template>
  <main class="page corpus-page story-reader">
    <RouterLink to="/my-stories">← My stories</RouterLink>
    <p v-if="error" class="corpus-error" role="alert">{{ error }}</p>
    <template v-if="story"><h1>{{ story.title }}</h1>
      <RouterLink v-if="story.status !== 'completed'" :to="{ path:'/corpus-upload',query:{import:story.import_id} }">View import status</RouterLink>
      <template v-else>
        <label>Writing system <select v-model="script"><option value="raw_text">Original</option><option value="traditional_text">Traditional</option><option value="simplified_text">Simplified</option></select></label>
        <article class="story-content" :lang="script === 'simplified_text' ? 'zh-Hans' : 'zh-Hant'"><span v-for="sentence in pages.items" :key="sentence.id">{{ sentence[script] || sentence.raw_text }}</span></article>
        <p v-if="pages.error" class="corpus-error" role="alert">{{ pages.error }} <button class="corpus-text-button" @click="pages.load">Try again</button></p>
        <p v-if="pages.loading" role="status">Loading text…</p>
        <button v-if="pages.nextCursor" class="button" :disabled="pages.loading" @click="pages.load">Read more</button>
      </template>
    </template>
  </main>
</template>
