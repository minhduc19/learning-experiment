<script setup>
import { nextTick, ref } from 'vue'
const props = defineProps({ modelValue: { type: Array, required: true }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const fields = [
  { key: 'character', label: 'Character' },
  { key: 'segment', label: 'Segment' },
  { key: 'sentence', label: 'Sentence' },
  { key: 'sentenceId', label: 'Sentence ID' },
]
const message = ref('')
const list = ref(null)
const empty = ref(null)
function edit(id, key, value) {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.map(row => row.id === id ? { ...row, [key]: value } : row))
}
async function move(index, direction) {
  const destination = index + direction
  if (props.disabled || destination < 0 || destination >= props.modelValue.length) return
  const rows = [...props.modelValue]
  const [row] = rows.splice(index, 1)
  rows.splice(destination, 0, row)
  emit('update:modelValue', rows)
  message.value = `Row ${index + 1} moved to position ${destination + 1}.`
  await nextTick()
  // Focus the row itself so a boundary button becoming disabled does not lose focus.
  list.value?.children[destination]?.querySelector('input')?.focus()
}
async function remove(index) {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.filter((_, position) => position !== index))
  message.value = `Row ${index + 1} deleted.`
  await nextTick()
  const remaining = list.value?.children
  if (remaining?.length) remaining[Math.min(index, remaining.length - 1)]?.querySelector('input')?.focus()
  else empty.value?.focus()
}
</script>

<template>
  <div class="vocabulary-editor" role="group" aria-label="Vocabulary rows" aria-describedby="ai-prompt-help">
    <p class="corpus-muted">{{ modelValue.length }} {{ modelValue.length === 1 ? 'row' : 'rows' }}</p>
    <ol v-if="modelValue.length" ref="list" class="vocabulary-rows">
      <li v-for="(row, index) in modelValue" :key="row.id" class="vocabulary-row">
        <div class="vocabulary-row-heading">
          <strong>Row {{ index + 1 }}</strong>
          <div class="vocabulary-row-actions">
            <button type="button" :disabled="disabled || index === 0" :aria-label="`Move row ${index + 1} up`" @click="move(index, -1)">↑ <span>Move up</span></button>
            <button type="button" :disabled="disabled || index === modelValue.length - 1" :aria-label="`Move row ${index + 1} down`" @click="move(index, 1)">↓ <span>Move down</span></button>
            <button type="button" class="vocabulary-delete" :disabled="disabled" :aria-label="`Delete row ${index + 1}`" @click="remove(index)">Delete</button>
          </div>
        </div>
        <div class="vocabulary-fields">
          <label v-for="field in fields" :key="field.key" :class="`vocabulary-field-${field.key}`">
            <span>{{ field.label }}</span>
            <textarea v-if="field.key === 'sentence'" :value="row[field.key]" rows="2" :disabled="disabled" :aria-label="`${field.label}, row ${index + 1}`" @input="edit(row.id, field.key, $event.target.value)" />
            <input v-else type="text" :value="row[field.key]" :disabled="disabled" :aria-label="`${field.label}, row ${index + 1}`" @input="edit(row.id, field.key, $event.target.value)">
          </label>
        </div>
      </li>
    </ol>
    <p v-else ref="empty" tabindex="-1" class="corpus-resume-note">No vocabulary rows. Generate vocabulary again to start a new selection.</p>
    <p class="vocabulary-status" role="status">{{ message }}</p>
  </div>
</template>

<style scoped>
.vocabulary-rows { list-style: none; padding: 0; display: grid; gap: 1rem; }
.vocabulary-row { min-width: 0; padding: 1rem; border: 1px solid #dce6e0; border-radius: .8rem; background: #f7faf8; }
.vocabulary-row-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; margin-bottom: .8rem; }
.vocabulary-row-actions { display: flex; gap: .4rem; flex-wrap: wrap; }
.vocabulary-row-actions button { min-height: 2.75rem; padding: .4rem .65rem; background: white; color: var(--color-primary); border: 1px solid #bacdc4; border-radius: .5rem; cursor: pointer; }
.vocabulary-row-actions button:hover:not(:disabled) { background: #e9f3ed; }
.vocabulary-row-actions button:disabled { opacity: .45; cursor: default; }
.vocabulary-row-actions .vocabulary-delete { color: #972c23; }
.vocabulary-fields { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: .75rem; }
.vocabulary-fields label { min-width: 0; font-size: .85rem; font-weight: 600; }
.vocabulary-fields label > span { display: block; margin-bottom: .3rem; }
.vocabulary-fields input, .vocabulary-fields textarea { width: 100%; min-width: 0; padding: .6rem; border: 1px solid #bacdc4; border-radius: .5rem; color: var(--color-text); background: white; }
.vocabulary-fields textarea { resize: vertical; }
.vocabulary-field-sentence { grid-column: 1 / -1; grid-row: 2; }
.vocabulary-status { min-height: 1.5em; margin-bottom: 0; font-size: .85rem; color: #52665d; }
@media (max-width: 560px) {
  .vocabulary-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vocabulary-field-sentence { grid-row: auto; }
  .vocabulary-field-sentenceId { grid-column: 1 / -1; }
  .vocabulary-row { padding: .75rem; }
}
</style>
