<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { authorizedFetch } from '../composables/useAuth'
defineProps({ modelValue: { type: Array, default: () => [] }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const stories = ref([]), error = ref(''), loading = ref(false)
const controller = new AbortController()
async function load() {
  loading.value = true; error.value = ''
  try {
    const items = []; let after = null
    do {
      const params = new URLSearchParams({ limit: '100' })
      if (after) params.set('after', after)
      const response = await authorizedFetch('/api/corpus/stories?' + params, { signal: controller.signal })
      if (!response.ok) throw new Error('Could not load stories.')
      const data = await response.json(); items.push(...data.items); after = data.next_after
    } while (after)
    stories.value = items
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { loading.value = false }
}
onMounted(load)
onUnmounted(() => controller.abort())
</script>
<template>
  <fieldset class="story-filter" :disabled="disabled || loading">
    <legend>Filter by stories</legend>
    <p class="corpus-filter-description">Choose any number of stories. No selection includes all stories.</p>
    <label v-for="story in stories" :key="story.id" class="corpus-checkbox"><input type="checkbox" :checked="modelValue.includes(story.id)" @change="emit('update:modelValue', $event.target.checked ? [...modelValue, story.id] : modelValue.filter(id => id !== story.id))">{{ story.title }}</label>
    <button v-if="modelValue.length" type="button" class="corpus-text-button" @click="emit('update:modelValue', [])">Clear story filter</button>
    <p v-if="loading" role="status">Loading stories…</p>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">Retry</button></p>
    <p v-if="!loading && !error && !stories.length">No completed stories available.</p>
  </fieldset>
</template>
<style scoped>.story-filter { border: 1px solid var(--activity-border, #d5ded8); border-radius: 12px; padding: 1rem; margin-block: 1rem; max-height: 20rem; overflow: auto; }.story-filter label { display: flex; gap: .5rem; margin-block: .5rem; }</style>
