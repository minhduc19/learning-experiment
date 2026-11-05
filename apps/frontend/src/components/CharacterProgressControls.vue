<script setup>
import { watch } from 'vue'
import { characterLabel } from '../composables/useCorpusPage'
import { useCharacterProgress } from '../composables/useCharacterProgress'

const props = defineProps({ character: { type: Object, required: true } })
const progress = useCharacterProgress(props.character)
const options = [{ key: 'learned', label: 'Learned' }, { key: 'learning', label: 'Learning' }]
watch(() => [props.character.learned, props.character.learning], () => {
  for (const { key } of options) {
    if (!progress.busy[key]) progress[key] = Boolean(props.character[key])
  }
})
</script>

<template>
  <div class="corpus-progress-controls" role="group" :aria-label="`Learning marks for ${characterLabel(character.traditional_value || character.value)}`">
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
