<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { formatBytes, importFailure, useCorpusUpload } from '../composables/useCorpusUpload'
import { formatCount } from '../composables/useCorpusPage'

const route = useRoute()
const router = useRouter()
const upload = useCorpusUpload()
const picker = ref(null)
const uploadBytes = computed(() => Math.min(upload.fileMeta?.size || 0, upload.uploaded + upload.inFlight))
const uploadPercent = computed(() => upload.fileMeta?.size ? Math.floor(uploadBytes.value / upload.fileMeta.size * 100) : 0)
const importPercent = computed(() => Math.floor(Math.max(0, Math.min(1, upload.job?.progress || 0)) * 100))
const inputVisible = computed(() => !upload.importId)
const canRetryImport = computed(() => upload.job?.status === 'failed' && !/utf-8|nul character/i.test(upload.job.error || ''))
const statusTitle = computed(() => ({ idle: 'Choose a story to begin', ready: 'Ready to upload', creating: 'Preparing your upload…',
  uploading: 'Uploading your story', paused: 'Upload paused', queuing: 'Preparing your import…', importing: upload.job?.status === 'queued' ? 'Waiting to start' : 'Processing your story',
  completed: 'Your story is ready', failed: 'The import could not finish' })[upload.phase])

function chooseFile(event) {
  upload.selectFile(event.target.files?.[0])
}

function startAnother() {
  upload.reset()
  if (picker.value) picker.value.value = ''
}

watch(() => upload.importId, id => {
  const wanted = id || undefined
  if ((route.query.import || undefined) !== wanted) router.replace({ name: 'corpus-upload', query: wanted ? { import: wanted } : {} })
})
watch(() => route.query.import, id => {
  if (typeof id === 'string' && id !== upload.importId) upload.monitor(id)
})
onMounted(() => upload.initialize(typeof route.query.import === 'string' ? route.query.import : undefined))
</script>

<template>
  <main class="page corpus-page corpus-upload-page">
    <div class="cluster"><RouterLink class="corpus-back" to="/characters">← Character explorer</RouterLink><RouterLink class="corpus-back" to="/my-stories">My stories</RouterLink></div>
    <header class="corpus-heading">
      <p class="corpus-eyebrow">GROW YOUR CHINESE CORPUS</p>
      <h1>Upload a story</h1>
      <p>Add a Chinese text file to explore its characters, words, and sentences.</p>
    </header>

    <form v-if="inputVisible" class="corpus-upload-card" @submit.prevent="upload.start">
      <div v-if="upload.limitsLoading" class="corpus-muted" role="status">Checking the upload limit…</div>
      <p v-if="upload.limitsError" class="corpus-error" role="alert">{{ upload.limitsError }} <button class="corpus-text-button" type="button" @click="upload.loadLimits">Try again</button></p>
      <p v-if="upload.uploadId && !upload.file" class="corpus-resume-note">An unfinished upload was saved. Reselect <strong>{{ upload.fileMeta?.name }}</strong> to resume. Use the same, unchanged file.</p>
      <label for="corpus-file">Chinese story (.txt)</label>
      <div class="corpus-file-picker">
        <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 16V4m-4 4 4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>
        <p>Choose your Chinese story</p>
        <input id="corpus-file" ref="picker" type="file" accept=".txt,text/plain" :disabled="upload.working || !upload.limits" :aria-invalid="Boolean(upload.fileError)" :aria-describedby="upload.fileError ? 'corpus-file-help corpus-file-error' : 'corpus-file-help'" @change="chooseFile">
        <p id="corpus-file-help" class="corpus-muted">UTF-8 .txt files<span v-if="upload.limits"> · Up to {{ formatBytes(upload.limits.max_upload_bytes) }}</span></p>
      </div>
      <p v-if="upload.fileMeta" class="corpus-file-summary"><strong>{{ upload.fileMeta.name }}</strong><span>{{ formatBytes(upload.fileMeta.size) }}</span></p>
      <p v-if="upload.fileError" id="corpus-file-error" class="corpus-error" role="alert">{{ upload.fileError }}</p>
      <div class="corpus-upload-title">
        <label for="corpus-story-title">Story title <span class="corpus-muted">(optional)</span></label>
        <input id="corpus-story-title" v-model="upload.title" maxlength="300" :disabled="upload.working" placeholder="Defaults to the file name">
      </div>
      <div class="cluster">
        <button class="button" type="submit" :disabled="!upload.file || !upload.limits || upload.working || Boolean(upload.fileError)">{{ upload.phase === 'paused' ? 'Resume upload' : upload.working ? 'Uploading…' : 'Upload and import' }}</button>
        <button v-if="upload.phase === 'uploading'" class="corpus-text-button" type="button" @click="upload.pause">Pause upload</button>
        <button v-if="upload.uploadId && !upload.working" class="corpus-text-button" type="button" @click="startAnother">Start a different upload</button>
      </div>
      <p class="corpus-upload-hint">Keep this page open while the file uploads. You can pause and resume it.</p>
    </form>

    <section v-if="!['idle', 'ready'].includes(upload.phase) || upload.error" class="corpus-upload-status" :class="{ 'is-complete': upload.phase === 'completed' }" aria-labelledby="corpus-upload-status-title">
      <div class="corpus-upload-status-heading" aria-live="polite" aria-atomic="true">
        <span class="corpus-upload-status-icon" aria-hidden="true">{{ upload.phase === 'completed' ? '✓' : upload.phase === 'failed' ? '!' : '文' }}</span>
        <div><h2 id="corpus-upload-status-title">{{ statusTitle }}</h2><p v-if="upload.importId" class="corpus-muted">{{ upload.job?.title || upload.title || 'Chinese story' }}</p></div>
      </div>
      <template v-if="['creating', 'uploading', 'paused', 'queuing'].includes(upload.phase)">
        <div class="corpus-progress-label"><span>File upload</span><strong>{{ uploadPercent }}%</strong></div>
        <progress class="corpus-upload-progress" :value="uploadBytes" :max="upload.fileMeta?.size || 1" aria-label="File upload progress" />
        <p class="corpus-muted">{{ formatBytes(uploadBytes) }} of {{ formatBytes(upload.fileMeta?.size || 0) }}</p>
      </template>
      <template v-if="upload.phase === 'importing'">
        <div class="corpus-progress-label"><span>{{ upload.job?.status === 'queued' ? 'Waiting for processing' : 'Import progress' }}</span><strong>{{ importPercent }}%</strong></div>
        <progress class="corpus-upload-progress" :value="importPercent" max="100" aria-label="Import progress" />
        <p v-if="upload.job" class="corpus-muted">{{ formatCount(upload.job.character_count) }} characters processed · {{ formatCount(upload.job.completed_sentence_count) }} sentences</p>
        <p class="corpus-upload-hint">Your file is uploaded. Processing continues if you leave this page. Bookmark this page to return to its status.</p>
      </template>
      <p v-if="upload.phase === 'failed' && upload.job" class="corpus-error" role="alert">{{ importFailure(upload.job.error || '') }}</p>
      <p v-if="upload.error" class="corpus-error" role="alert">{{ upload.error }}</p>
      <div v-if="upload.importId && upload.error" class="cluster">
        <button class="button" :disabled="upload.checking || upload.working" @click="upload.monitor(upload.importId)">Check status again</button>
        <button class="corpus-text-button" :disabled="upload.checking || upload.working" @click="startAnother">Start a new upload</button>
      </div>
      <div v-if="upload.phase === 'completed'" class="corpus-upload-success">
        <p><strong>{{ formatCount(upload.job.character_count) }}</strong> characters across <strong>{{ formatCount(upload.job.completed_sentence_count) }}</strong> sentences have been added to your corpus.</p>
        <div class="cluster"><RouterLink class="button" to="/characters">Explore characters</RouterLink><button class="corpus-text-button" @click="startAnother">Upload another story</button></div>
      </div>
      <div v-if="upload.phase === 'failed'" class="cluster">
        <button v-if="canRetryImport" class="button" :disabled="upload.working" @click="upload.retryImport">{{ upload.working ? 'Retrying…' : 'Retry import' }}</button>
        <button class="corpus-text-button" :disabled="upload.working" @click="startAnother">Choose another file</button>
      </div>
    </section>
  </main>
</template>
