<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSystemPrompts } from '../composables/useSystemPrompts.js'
const props = defineProps({ disabled: Boolean })
const emit = defineEmits(['selected', 'busy', 'dirty'])
const { items, selected, viewing, viewingId, busy, loaded, error, message, draft, dirty, canSave,
  load, edit, cancel, save, select, remove, dispose } = useSystemPrompts()
const titleInput = ref(null), newButton = ref(null), reading = ref(null)
watch(selected, prompt => emit('selected', prompt), { immediate: true })
watch(busy, value => emit('busy', value), { immediate: true })
watch(dirty, value => emit('dirty', value), { immediate: true })
onMounted(load)
onUnmounted(dispose)
async function startEditing(prompt = null) {
  edit(prompt)
  await nextTick()
  titleInput.value?.focus()
}
async function cancelEditing() {
  cancel()
  await nextTick()
  newButton.value?.focus()
}
async function read(prompt) {
  viewingId.value = prompt.id
  await nextTick()
  reading.value?.focus()
}
async function deletePrompt(prompt) {
  if (!window.confirm(`Delete “${prompt.title}”?${selected.value?.id === prompt.id ? ' This is the selected prompt. You will need to choose another before sending.' : ''}`)) return
  await remove(prompt)
  await nextTick()
  newButton.value?.focus()
}
</script>

<template>
  <section class="system-prompt-library" aria-labelledby="system-prompts-title">
    <div class="prompt-library-heading">
      <div><h3 id="system-prompts-title">System prompts</h3><p class="corpus-muted">Save instructions for different activities. Your library and selection are saved to your account.</p></div>
      <button ref="newButton" class="button" type="button" :disabled="disabled || busy || !loaded || !!draft" @click="startEditing()">New system prompt</button>
    </div>
    <p v-if="busy" role="status">{{ loaded ? 'Saving prompt changes…' : 'Loading system prompts…' }}</p>
    <p v-if="selected" class="prompt-selection"><span aria-hidden="true">✓</span> <strong>Selected for sending:</strong> {{ selected.title }}</p>
    <p v-else-if="loaded" class="corpus-resume-note">No system prompt selected. Choose “Use prompt” before sending.</p>
    <p v-if="error" class="corpus-error" role="alert">{{ error }} <button type="button" class="corpus-text-button" :disabled="disabled || busy" @click="load">Reload prompts</button></p>
    <p v-if="message" role="status" class="corpus-muted">{{ message }}</p>
    <ul v-if="loaded && items.length" class="system-prompt-list" aria-label="Saved system prompts">
      <li v-for="prompt in items" :key="prompt.id" :class="{ 'is-selected': selected?.id === prompt.id }">
        <div class="saved-prompt-title"><strong>{{ prompt.title }}</strong><span v-if="selected?.id === prompt.id" class="selected-prompt-badge">✓ Selected for sending</span></div>
        <p class="prompt-excerpt">{{ prompt.content.slice(0, 160) }}{{ prompt.content.length > 160 ? '…' : '' }}</p>
        <div class="prompt-card-actions">
          <button type="button" class="prompt-control" :aria-pressed="selected?.id === prompt.id" :disabled="disabled || busy || !!draft" :aria-label="`Use prompt: ${prompt.title}`" @click="select(prompt)">{{ selected?.id === prompt.id ? '✓ Selected' : 'Use prompt' }}</button>
          <button type="button" class="prompt-control" :disabled="disabled || busy || !!draft" :aria-label="`Read prompt: ${prompt.title}`" @click="read(prompt)">Read</button>
          <button type="button" class="prompt-control" :disabled="disabled || busy || !!draft" :aria-label="`Edit prompt: ${prompt.title}`" @click="startEditing(prompt)">Edit</button>
          <button type="button" class="prompt-control prompt-delete" :disabled="disabled || busy || !!draft" :aria-label="`Delete prompt: ${prompt.title}`" @click="deletePrompt(prompt)">Delete</button>
        </div>
      </li>
    </ul>
    <p v-else-if="loaded" class="corpus-muted">No saved system prompts. Create one to get started.</p>

    <form v-if="draft" class="system-prompt-editor" @submit.prevent="save">
      <h4>{{ draft.id ? 'Edit system prompt' : 'New system prompt' }}</h4>
      <label for="system-prompt-title">Prompt title</label>
      <input id="system-prompt-title" ref="titleInput" v-model="draft.title" type="text" maxlength="200" required :disabled="disabled || busy">
      <label for="system-prompt-content">Prompt instructions</label>
      <textarea id="system-prompt-content" v-model="draft.content" rows="14" maxlength="50000" required :disabled="disabled || busy" class="ai-prompt-text" />
      <p class="corpus-muted">{{ draft.content.length.toLocaleString() }} / 50,000 characters. Save or cancel your edits before sending a prompt.</p>
      <div class="prompt-card-actions"><button class="button" :disabled="disabled || busy || !canSave">Save prompt</button><button type="button" class="prompt-control" :disabled="disabled || busy" @click="cancelEditing">Cancel</button></div>
    </form>
    <div v-else-if="viewing" class="system-prompt-reader">
      <h4 ref="reading" tabindex="-1">{{ viewing.title }}</h4>
      <p class="corpus-muted">{{ selected?.id === viewing.id ? 'This saved prompt will be sent with your vocabulary.' : 'Reading this prompt does not change your selection. Choose “Use prompt” to send it.' }}</p>
      <pre tabindex="0" :aria-label="`Prompt text: ${viewing.title}`">{{ viewing.content }}</pre>
    </div>
  </section>
</template>

<style scoped>
.system-prompt-library { border-block: 1px solid #dce6e0; margin-block: 1.5rem; padding-block: 1.25rem; }
.prompt-library-heading { display: flex; align-items: start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.prompt-library-heading h3 { margin: 0; }
.prompt-library-heading p { margin-bottom: 0; max-width: 38rem; }
.prompt-selection { padding: .8rem 1rem; background: #e9f5e7; border: 1px solid #4e8658; border-radius: .6rem; color: #235b2c; overflow-wrap: anywhere; }
.system-prompt-list { list-style: none; display: grid; gap: .75rem; padding: 0; max-height: 32rem; overflow-y: auto; }
.system-prompt-list li { padding: 1rem; border: 1px solid #bacdc4; border-radius: .8rem; min-width: 0; }
.system-prompt-list li.is-selected { border: 2px solid #4e8658; background: #f5faf2; }
.saved-prompt-title { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: space-between; overflow-wrap: anywhere; }
.selected-prompt-badge { font-size: .75rem; font-weight: 700; color: #235b2c; }
.prompt-excerpt { color: #52665d; font-size: .85rem; overflow-wrap: anywhere; }
.prompt-card-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.prompt-control { padding: .5rem .8rem; min-height: 2.75rem; border: 1px solid #bacdc4; border-radius: .5rem; background: white; color: var(--color-primary); cursor: pointer; }
.prompt-control:hover:not(:disabled) { background: #e9f3ed; }
.prompt-control:disabled { opacity: .5; cursor: default; }
.prompt-control[aria-pressed=true] { background: #e9f5e7; border-color: #4e8658; color: #235b2c; }
.prompt-delete { color: #972c23; }
.system-prompt-editor, .system-prompt-reader { margin-top: 1rem; padding: 1rem; border: 1px solid #bacdc4; border-radius: .8rem; background: #f7faf8; }
.system-prompt-editor h4, .system-prompt-reader h4 { margin-top: 0; overflow-wrap: anywhere; }
.system-prompt-editor label { display: block; font-weight: 600; margin-bottom: .4rem; }
.system-prompt-editor input { width: 100%; min-width: 0; padding: .7rem; border: 1px solid #bacdc4; border-radius: .5rem; margin-bottom: 1rem; }
.system-prompt-reader pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 28rem; overflow: auto; font: .9rem/1.6 var(--font-body); }
</style>
