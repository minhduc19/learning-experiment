<script setup>
import { computed, useId } from 'vue'
import { parseLesson } from '../composables/lessonJson'
import LessonPreview from './LessonPreview.vue'
const props = defineProps({ modelValue: { type: String, required: true }, busy: Boolean, creating: Boolean })
const emit = defineEmits(['update:modelValue', 'save'])
const fieldId = useId(), statusId = useId()
const parsed = computed(() => { try { return { document: parseLesson(props.modelValue), error: '' } } catch (failure) { return { document: null, error: failure.message } } })
</script>
<template>
  <div class="cluster"><slot name="before-actions" /><button class="button" :disabled="busy || !parsed.document" @click="emit('save')">{{ creating ? 'Create lesson' : 'Save changes' }}</button><button class="corpus-text-button" :disabled="busy || !parsed.document" @click="emit('update:modelValue', JSON.stringify(parsed.document,null,2))">Format JSON</button><slot name="actions" /></div>
  <slot name="after-actions" />
  <div class="lesson-editor-grid"><section><label :for="fieldId"><strong>Lesson JSON</strong></label><textarea :id="fieldId" class="lesson-json-input" :value="modelValue" @input="emit('update:modelValue', $event.target.value)" :disabled="busy" spellcheck="false" :aria-invalid="Boolean(parsed.error)" :aria-describedby="statusId" /><p :id="statusId" :role="parsed.error ? 'alert' : 'status'">{{ parsed.error || 'Valid lesson JSON. Preview updates as you edit.' }}</p></section>
    <LessonPreview v-if="parsed.document" :key="modelValue" :lesson="parsed.document" /><section v-else class="corpus-empty"><h2>Preview unavailable</h2><p>Fix the JSON errors to preview and save this lesson.</p></section>
  </div>
</template>
