<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import { serializeVocabularyPrompt, vocabularyPromptRows } from '../composables/studyExport'
import VocabularyPromptEditor from './VocabularyPromptEditor.vue'
import { parseLesson } from '../composables/lessonJson'
import { defaultSystemPrompt } from '../data/aiSystemPrompt'
import LessonJsonWorkspace from './LessonJsonWorkspace.vue'
const props = defineProps({ selection: { type: Object, required: true }, sourceBusy: Boolean })
const emit = defineEmits(['busy'])
const router = useRouter()
const script = ref('traditional'), rows = ref([]), generatedPrompt = ref(''), systemPrompt = ref(defaultSystemPrompt)
const userPrompt = computed(() => serializeVocabularyPrompt(rows.value))
let nextRowId = 0
function resetVocabulary(selection) {
  rows.value = vocabularyPromptRows(selection, script.value).map(row => ({ ...row, id: nextRowId++ }))
  generatedPrompt.value = userPrompt.value
}
const text = ref(''), busy = ref(false), saving = ref(false), error = ref(''), warning = ref(''), saved = ref(false)
const modal = ref(null), promptButton = ref(null)
let controller
const blocked = computed(() => busy.value || saving.value || props.sourceBusy)
const canSend = computed(() => Boolean(rows.value.length && systemPrompt.value.trim() && userPrompt.value.length <= 100000 && systemPrompt.value.length <= 50000 && userPrompt.value.trim() !== 'Character|segment|sentence|sentence-id'))
const dirty = computed(() => !saved.value && (Boolean(text.value) || userPrompt.value !== generatedPrompt.value || systemPrompt.value !== defaultSystemPrompt))
watch(() => props.selection, value => { resetVocabulary(value); if (text.value) warning.value = 'Vocabulary changed. The existing lesson draft is unchanged; send the prompt again to generate new exercises.' }, { immediate:true })
watch([busy,saving], () => emit('busy',busy.value || saving.value))
watch(text, () => { saved.value = false })
function changeScript(event) {
  if (userPrompt.value !== generatedPrompt.value && !window.confirm('Replace your edited vocabulary prompt with the selected writing system?')) { event.target.value = script.value; return }
  script.value = event.target.value; resetVocabulary(props.selection)
}
async function showSystemPrompt() { await nextTick(); modal.value?.showModal() }
function closeSystemPrompt() { modal.value?.close(); promptButton.value?.focus() }
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
onUnmounted(()=>{controller?.abort();window.removeEventListener('beforeunload',unload);emit('busy',false)})
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
    <button class="button" :disabled="blocked || !canSend" @click="send">{{ busy ? 'Generating exercises…' : 'Send prompt' }}</button>
    <div><button ref="promptButton" class="corpus-text-button" :disabled="blocked" @click="showSystemPrompt">Edit system prompt</button></div>
    <p class="corpus-muted">Only Send prompt contacts AI. Creating a lesson is a separate step after reviewing the JSON.</p>
    <p v-if="busy" role="status">Waiting for DeepSeek. This may take up to two minutes.</p>
    <p v-if="error" class="corpus-error" role="alert">{{ error }}</p><p v-if="warning" class="corpus-resume-note" role="status">{{ warning }}</p>
    <dialog ref="modal" class="ai-prompt-dialog" aria-labelledby="ai-system-title" @click="$event.target === modal && closeSystemPrompt()"><h2 id="ai-system-title">System prompt</h2><p>The text below is sent as system_prompt, exactly as edited.</p><label for="ai-system-prompt">System prompt text</label><textarea id="ai-system-prompt" v-model="systemPrompt" maxlength="50000" class="ai-prompt-text" rows="20" :disabled="blocked" /><div class="cluster"><button class="button" @click="closeSystemPrompt">Done</button><button class="corpus-text-button" :disabled="blocked" @click="systemPrompt=defaultSystemPrompt">Restore default prompt</button></div></dialog>
  </section>
  <section v-if="text" class="corpus-sentence-card" aria-label="Generated lesson"><h2>Review generated exercises</h2><p>Edit the JSON and test the questions. Nothing is saved until you choose Create lesson.</p><LessonJsonWorkspace v-model="text" :busy="blocked" creating @save="createLesson" /></section>
</template>
