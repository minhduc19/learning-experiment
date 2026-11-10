<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import StudySentence from '../components/StudySentence.vue'
import AiExerciseFlow from '../components/AiExerciseFlow.vue'
import { buildStudyExport, copyStudyText } from '../composables/studyExport'
import StoryFilter from '../components/StoryFilter.vue'
const storyIds = ref([])
const props = defineProps({ aiMode: Boolean, version2: Boolean })
const historyPath = props.version2 ? '/api/corpus/study-history-v2' : '/api/corpus/study-history'
const aiBusy = ref(false)
const learnedCount = ref(5), newCount = ref(5), loading = ref(false), error = ref(''), result = ref(null)
const entries = ref([]), nextHistory = ref(null), historyBusy = ref(false), historyLoaded = ref(false), historyError = ref(''), savedAt = ref(null)
const exportScript = ref('simplified'), copyStatus = ref(''), copying = ref(false), manualCopy = ref(false), exportBox = ref(null), previewOpen = ref(false)
const exportText = computed(() => buildStudyExport(result.value, exportScript.value))
watch(result, () => { copyStatus.value = ''; manualCopy.value = false })
async function copySelection(script) {
  if (copying.value) return
  exportScript.value = script; copying.value = true; copyStatus.value = ''; manualCopy.value = false
  try {
    if (await copyStudyText(exportText.value)) copyStatus.value = `Copied ${script} Chinese with database IDs.`
    else {
      manualCopy.value = true; previewOpen.value = true
      copyStatus.value = 'Automatic copy was blocked. The export is selected below; press Ctrl+C or Command+C to copy.'
      await nextTick(); exportBox.value?.focus(); exportBox.value?.select()
    }
  } finally { copying.value = false }
}
async function loadHistory(more = false) {
  if (historyBusy.value) return
  historyBusy.value = true; historyError.value = ''
  try {
    const response = await authorizedFetch(historyPath + (more && nextHistory.value ? '?before=' + nextHistory.value : ''))
    if (!response.ok) throw new Error('Could not load history. Try again.')
    const data = await response.json()
    entries.value = more ? [...entries.value, ...data.items] : data.items
    nextHistory.value = data.next; historyLoaded.value = true
  } catch (failure) { historyError.value = failure.message }
  finally { historyBusy.value = false }
}
async function openSaved(id) {
  if (loading.value || aiBusy.value) return
  loading.value = true; error.value = ''; controller = new AbortController()
  try {
    const response = await authorizedFetch(historyPath + '/' + id, { signal: controller.signal })
    if (!response.ok) throw new Error('Could not open saved selection. Try again.')
    const saved = await response.json()
    result.value = saved.data; savedAt.value = saved.created_at
    learnedCount.value = saved.data.requested.learned; newCount.value = props.version2 ? saved.data.requested.segments : saved.data.requested.new
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { loading.value = false }
}
let controller
async function generate() {
  if (loading.value || aiBusy.value) return
  if (![learnedCount.value, newCount.value].every(n => Number.isInteger(n) && n >= 0 && n <= 50) || learnedCount.value + newCount.value === 0) {
    error.value = props.version2 ? 'Choose whole numbers from 0 to 50, with at least one character or segment in total.' : 'Choose whole numbers from 0 to 50, with at least one character in total.'; return
  }
  controller = new AbortController(); loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ learned_count: learnedCount.value, [props.version2 ? 'segment_count' : 'new_count']: newCount.value })
    storyIds.value.forEach(id => params.append('story_ids', id))
    const response = await authorizedFetch((props.version2 ? '/api/corpus/study-selection-v2?' : props.aiMode ? '/api/corpus/study-selection?' : '/api/corpus/study-history?') + params, { method: 'POST', signal: controller.signal })
    if (!response.ok) throw new Error('Could not generate your selection. Please try again.')
    const saved = await response.json()
    result.value = saved.data; savedAt.value = saved.created_at
    await loadHistory()
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { loading.value = false }
}
onUnmounted(() => controller?.abort())
</script>
<template>
  <main class="page corpus-page study-page">
    <p class="corpus-eyebrow">A STUDY SET FROM YOUR STORIES</p><h1>{{ version2 ? 'AI exercise generator version 2' : aiMode ? 'AI exercise generator' : 'Build a study selection' }}</h1>
    <div class="cluster"><RouterLink to="/characters">Learning marks</RouterLink><RouterLink to="/sentence-practice">Sentence practice</RouterLink><RouterLink to="/lessons">My lessons</RouterLink><RouterLink v-if="!aiMode" to="/AI-exercise-generator">AI exercise generator</RouterLink><RouterLink v-if="aiMode" :to="version2 ? '/AI-exercise-generator' : '/AI-exercise-generator-version-2'">{{ version2 ? 'Original generator' : 'Try generator version 2' }}</RouterLink></div>
    <details class="corpus-sentence-card" @toggle="$event.target.open && !historyLoaded && loadHistory()"><summary>History</summary>
      <p class="corpus-muted">Saved snapshots keep their original results even if your marks or stories change. Opening one does not run a new search.</p>
      <p v-if="historyError" role="alert">{{ historyError }} <button class="corpus-text-button" @click="loadHistory()">Retry</button></p>
      <p v-if="historyBusy" role="status">Loading history…</p><p v-if="historyLoaded && !entries.length">No saved selections yet.</p>
      <ul><li v-for="entry in entries" :key="entry.id"><button class="corpus-text-button" :disabled="loading || aiBusy" @click="openSaved(entry.id)">{{ new Date(entry.created_at).toLocaleString() }} · {{ entry.requested.learned }} learned / {{ version2 ? entry.requested.segments : entry.requested.new }} {{ version2 ? 'segments' : 'to learn' }}</button></li></ul>
      <button v-if="nextHistory" class="button" :disabled="historyBusy || aiBusy" @click="loadHistory(true)">Load more history</button>
    </details>
    <p v-if="savedAt" class="corpus-muted">Saved selection: {{ new Date(savedAt).toLocaleString() }}</p>
    <StoryFilter v-model="storyIds" :disabled="loading || aiBusy" />
    <form class="corpus-toolbar study-form" @submit.prevent="generate">
      <div><label for="study-learned">Learned characters to review</label><input :disabled="loading || aiBusy" id="study-learned" v-model.number="learnedCount" type="number" min="0" max="50" step="1" required aria-describedby="study-learned-help"><p id="study-learned-help" class="corpus-filter-description">A random sample of Learned characters, including revision. Each includes up to three popular word segments and a sentence for each.</p></div>
      <div><label for="study-new">{{ version2 ? 'Unlearned segments to fetch' : 'Characters to learn' }}</label><input :disabled="loading || aiBusy" id="study-new" v-model.number="newCount" type="number" min="0" max="50" step="1" required aria-describedby="study-new-help"><p v-if="version2" id="study-new-help" class="corpus-filter-description">Take distinct segments containing Chinese characters, excluding whitespace, punctuation, numbers, and symbol-only segments. Select segments not marked Learned from sentences with the most Learned character appearances, in sentence order. Segment popularity is not used.</p><p v-else id="study-new-help" class="corpus-filter-description">Start with sentences containing the most Learned character appearances, then choose their unfamiliar characters by corpus frequency. Learning-only characters are eligible. Sentences with no learned characters come last.</p></div>
      <button class="button" :disabled="loading || aiBusy">{{ loading ? (aiMode ? 'Generating vocabulary…' : 'Building selection…') : aiMode ? 'Generate vocabulary' : result ? 'Generate another selection' : 'Generate selection' }}</button><p class="corpus-muted">Up to 50 in each group. Suggestions do not change your marks. Traditional and simplified text are shown together.</p>
    </form>
    <p v-if="error" class="corpus-error" role="alert">{{ error }}</p><p v-if="loading" role="status">Loading your selection…</p>
    <template v-if="result && version2">
      <p role="status">Selected {{ result.learned.length }} of {{ result.requested.learned }} learned characters and {{ result.segments.length }} of {{ result.requested.segments }} unlearned segments.</p>
      <p v-if="result.segments.length < result.requested.segments || result.learned.length < result.requested.learned" class="corpus-resume-note">Your corpus cannot supply the full requested counts. Mark more characters as Learned or upload more stories to expand the selection.</p>
    </template>
    <template v-else-if="result">
      <p role="status">Selected {{ result.learned.length }} of {{ result.requested.learned }} learned characters and {{ result.new.length }} of {{ result.requested.new }} characters to learn.</p>
      <p v-if="result.learned.length < result.requested.learned || result.new.length < result.requested.new" class="corpus-resume-note">Your corpus cannot supply the full requested counts. Mark more characters as Learned or upload more stories to expand the selection.</p>
    </template>
    <AiExerciseFlow v-if="aiMode && result" :selection="result" :source-busy="loading" @busy="aiBusy=$event" />
    <template v-if="result && !aiMode">
      <section class="corpus-sentence-card" aria-label="Copy selection">
        <h2>Copy selection</h2><p>Copy both groups as pipe-separated text with a header. IDs identify the stored character, segment, and sentence records; they stay the same in either writing system.</p>
        <div class="cluster"><button class="button" :disabled="loading || copying" @click="copySelection('simplified')">Copy simplified</button><button class="button" :disabled="loading || copying" @click="copySelection('traditional')">Copy traditional</button></div>
        <p v-if="copyStatus" :role="manualCopy ? 'alert' : 'status'">{{ copyStatus }}</p>
        <details :open="previewOpen" @toggle="previewOpen = $event.target.open"><summary>Preview export · {{ exportScript }}</summary><p>One row per association. Literal pipes, backslashes and line breaks are escaped as \|, \\, \n and \r. Missing examples leave empty columns. Long-sentence examples retain their stored fragment IDs.</p><textarea ref="exportBox" class="study-export-text" readonly :value="exportText" aria-label="Selection export text" rows="8" /></details>
      </section>
      <section><h2>Learned · random review</h2><p v-if="!result.learned.length" class="corpus-muted">No learned characters selected.</p>
        <article v-for="character in result.learned" :key="character.id" class="corpus-sentence-card"><h3 class="study-character"><RouterLink :to="`/characters/${character.id}`"><span lang="zh-Hant">{{ character.traditional_value }}</span><small lang="zh-Hans">{{ character.simplified_value }}</small></RouterLink></h3><p class="corpus-muted">{{ character.occurrence_count }} corpus appearances</p>
          <p v-if="!character.popular_segments.length">No word-segment examples available.</p><div v-for="segment in character.popular_segments" :key="segment.id" class="study-example"><h4><span lang="zh-Hant">{{ segment.traditional_text }}</span> / <span lang="zh-Hans">{{ segment.simplified_text }}</span> <small>· {{ segment.occurrence_count }} appearances</small></h4><StudySentence :sentence="segment.sentence" :focus="segment.text" /></div>
        </article>
      </section>
      <section><h2>Characters to learn · from familiar sentences</h2><p v-if="!result.new.length" class="corpus-muted">No new characters selected.</p>
        <article v-for="character in result.new" :key="character.id" class="corpus-sentence-card"><h3 class="study-character"><RouterLink :to="`/characters/${character.id}`"><span lang="zh-Hant">{{ character.traditional_value }}</span><small lang="zh-Hans">{{ character.simplified_value }}</small></RouterLink></h3><p class="corpus-muted">{{ character.occurrence_count }} corpus appearances · {{ character.learned_sentence_count }} Learned character appearances in the complete source sentence</p><StudySentence :sentence="character.sentence" :focus="character.value" expanded /></article>
      </section>
    </template>
  </main>
</template>
