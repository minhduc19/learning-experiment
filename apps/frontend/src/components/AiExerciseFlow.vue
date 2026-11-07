<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import { serializeVocabularyPrompt, vocabularyPromptRows } from '../composables/studyExport'
import VocabularyPromptEditor from './VocabularyPromptEditor.vue'
import { parseLesson } from '../composables/lessonJson'
import SystemPromptLibrary from './SystemPromptLibrary.vue'
import LessonJsonWorkspace from './LessonJsonWorkspace.vue'
import { useOptionAudio } from '../composables/useOptionAudio.js'
const props = defineProps({ selection: { type: Object, required: true }, sourceBusy: Boolean })
const emit = defineEmits(['busy'])
const router = useRouter()
const script = ref('traditional'), rows = ref([]), generatedPrompt = ref('')
const selectedSystemPrompt = ref(null), promptLibraryBusy = ref(false), promptLibraryDirty = ref(false)
const systemPrompt = computed(() => selectedSystemPrompt.value?.content ?? '')
const userPrompt = computed(() => serializeVocabularyPrompt(rows.value))
let nextRowId = 0
function resetVocabulary(selection) {
  rows.value = vocabularyPromptRows(selection, script.value).map(row => ({ ...row, id: nextRowId++ }))
  generatedPrompt.value = userPrompt.value
}
const text = ref(''), busy = ref(false), saving = ref(false), error = ref(''), warning = ref(''), saved = ref(false)
const { busy: audioBusy, progress: audioProgress, error: audioError, failures: audioFailures, canGenerate: canGenerateAudio, canRetry: canRetryAudio, generate: generateAudio, dispose: disposeAudio } = useOptionAudio(text)
let controller
const externallyBlocked = computed(() => busy.value || saving.value || audioBusy.value || props.sourceBusy)
const blocked = computed(() => externallyBlocked.value || promptLibraryBusy.value)
const canSend = computed(() => Boolean(!promptLibraryDirty.value && rows.value.length && systemPrompt.value.trim() && userPrompt.value.length <= 100000 && systemPrompt.value.length <= 50000 && userPrompt.value.trim() !== 'Character|segment|sentence|sentence-id'))
const dirty = computed(() => promptLibraryDirty.value || (!saved.value && (Boolean(text.value) || userPrompt.value !== generatedPrompt.value)))
watch(() => props.selection, value => { resetVocabulary(value); if (text.value) warning.value = 'Vocabulary changed. The existing lesson draft is unchanged; send the prompt again to generate new exercises.' }, { immediate:true })
watch([busy,saving,promptLibraryBusy,audioBusy], () => emit('busy',busy.value || saving.value || promptLibraryBusy.value || audioBusy.value))
watch(text, () => { saved.value = false })
function changeScript(event) {
  if (userPrompt.value !== generatedPrompt.value && !window.confirm('Replace your edited vocabulary prompt with the selected writing system?')) { event.target.value = script.value; return }
  script.value = event.target.value; resetVocabulary(props.selection)
}
async function send() {
  if (blocked.value || !canSend.value) return
  if (text.value && !window.confirm('Replace the current unsaved lesson draft with a new AI response?')) return
  controller = new AbortController(); busy.value=true; error.value=''; warning.value=''
  try {
    const response = await authorizedFetch('/api/ai/exercises',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({system_prompt:systemPrompt.value,user_prompt:userPrompt.value})})
    const data = await response.json().catch(()=>null)
    if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'AI generation failed. Your prompts are preserved; try again.')
    if (typeof data?.text !== 'string') throw new Error('The AI service returned an unexpected response.')
    text.value=data.text; warning.value=data.warning || ''
  } catch (failure) { if (!controller.signal.aborted) error.value=failure.message }
  finally { busy.value=false }
}
async function createLesson() {
  if (blocked.value) return
  let document
  try { document=parseLesson(text.value) } catch(failure) { error.value=failure.message; return }
  saving.value=true;error.value='';controller=new AbortController()
  try {
    const response=await authorizedFetch('/api/lessons',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(document)})
    const data=await response.json().catch(()=>null)
    if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not create the lesson. Your JSON is preserved.')
    saved.value=true;await router.push('/lessons/'+data.id)
  } catch(failure) { if (!controller.signal.aborted) error.value=failure.message }
  finally {saving.value=false}
}
function leaving() { return !dirty.value || window.confirm('Leave without saving the AI lesson draft or prompt edits? Copy your text first if you want to keep it.') }
onBeforeRouteLeave(leaving)
function unload(event) { if (dirty.value) {event.preventDefault();event.returnValue=''} }
window.addEventListener('beforeunload',unload)
onUnmounted(()=>{disposeAudio();controller?.abort();window.removeEventListener('beforeunload',unload);emit('busy',false)})
</script>
<template>
  <section class="corpus-sentence-card" aria-labelledby="ai-prompt-title">
    <h2 id="ai-prompt-title">Review vocabulary prompt</h2>
    <label for="ai-script">Vocabulary writing system</label><select id="ai-script" :value="script" :disabled="blocked" @change="changeScript"><option value="traditional">Traditional Chinese</option><option value="simplified">Simplified Chinese</option></select>
    <p id="ai-prompt-help" class="corpus-muted">Edit the vocabulary fields, move rows up or down, or delete rows before sending. The prompt preview below updates as you make changes.</p>
    <VocabularyPromptEditor v-model="rows" :disabled="blocked" />
    <h3 id="ai-user-prompt-title">User prompt preview</h3>
    <p class="corpus-muted">This is the exact text sent to AI. Pipes and line breaks inside fields are escaped to keep one association per line.</p>
    <pre class="ai-user-prompt-preview" tabindex="0" aria-labelledby="ai-user-prompt-title">{{ userPrompt }}</pre>
    <p class="corpus-muted">{{ userPrompt.length.toLocaleString() }} / 100,000 characters. Shorten the vocabulary if this limit is exceeded.</p>
    <SystemPromptLibrary :disabled="externallyBlocked" @selected="selectedSystemPrompt=$event" @busy="promptLibraryBusy=$event" @dirty="promptLibraryDirty=$event" />
    <p v-if="promptLibraryDirty" class="corpus-resume-note">Save or cancel your system prompt edits before sending.</p>
    <button class="button" :disabled="blocked || !canSend" @click="send">{{ busy ? 'Generating exercises…' : 'Send prompt' }}</button>
    <p class="corpus-muted">Only Send prompt contacts AI. Creating a lesson is a separate step after reviewing the JSON.</p>
    <p v-if="busy" role="status">Waiting for DeepSeek. This may take up to two minutes.</p>
    <p v-if="error" class="corpus-error" role="alert">{{ error }}</p><p v-if="warning" class="corpus-resume-note" role="status">{{ warning }}</p>

  </section>
  <section v-if="text" class="corpus-sentence-card" aria-label="Generated lesson"><h2>Review generated exercises</h2><p>Edit the JSON and test the questions. Nothing is saved until you choose Create lesson.</p><LessonJsonWorkspace v-model="text" :busy="blocked" creating @save="createLesson">
    <template #actions>
      <button class="button" :disabled="blocked || !canGenerateAudio" @click="generateAudio(false)">{{ audioBusy ? 'Generating option audio…' : 'Generate option audio' }}</button>
      <button v-if="canRetryAudio" class="button" :disabled="blocked" @click="generateAudio(true)">Retry failed audio once</button>
    </template>
    <template #after-actions>
      <p class="corpus-muted">Generate speech for every option’s visible text. Successful recordings are reused; failed recordings can be retried once. You can save the lesson with some options silent.</p>
      <p v-if="audioProgress" role="status">{{ audioProgress }}</p>
      <p v-if="audioError" class="corpus-error" role="alert">{{ audioError }}</p>
      <ul v-if="audioFailures.length"><li v-for="failure in audioFailures" :key="failure.label">{{ failure.label }} — {{ failure.can_retry ? 'Failed; one retry available.' : 'Failed; retry used.' }} {{ failure.message || '' }}</li></ul>
    </template>
  </LessonJsonWorkspace></section>
</template>
