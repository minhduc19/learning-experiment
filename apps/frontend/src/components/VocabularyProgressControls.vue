<script setup>
import { watch } from 'vue'
import { useVocabularyProgress } from '../composables/useVocabularyProgress'

const props = defineProps({ entry: { type: Object, required: true }, resource: { type: String, required: true }, idField: { type: String, required: true }, label: { type: String, required: true } })
const emit = defineEmits(['saved'])
const progress = useVocabularyProgress(props.entry, props.resource, props.idField)
const options = [{ key: 'learned', label: 'Learned' }, { key: 'learning', label: 'Learning' }]
watch(() => progress.busy.learned || progress.busy.learning, (busy, previous) => {
  if (previous && !busy && !progress.errors.learned && !progress.errors.learning) emit('saved')
})
watch(() => [props.entry.learned, props.entry.learning], () => {
  for (const { key } of options) {
    if (!progress.busy[key]) progress[key] = Boolean(props.entry[key])
  }
})
</script>

<template>
  <div class="corpus-progress-controls" role="group" :aria-label="label">
    <button v-for="option in options" :key="option.key" type="button"
      class="corpus-progress-toggle" :class="[`is-${option.key}`, { 'is-active': progress[option.key] }]"
      :aria-pressed="progress[option.key]" :disabled="progress.busy[option.key]"
      @click="progress.toggle(option.key)">
      <span class="corpus-progress-check" aria-hidden="true">{{ progress[option.key] ? '✓' : '+' }}</span>
      {{ option.label }}
    </button>
    <span class="corpus-progress-caption" aria-live="polite">{{ progress.busy.learned || progress.busy.learning ? 'Saving…' : progress.learned && progress.learning ? 'Marked for revision' : '' }}</span>
    <p v-for="option in options" v-show="progress.errors[option.key]" :key="option.key" class="corpus-progress-error" role="alert">{{ progress.errors[option.key] }}</p>
  </div>
</template>
