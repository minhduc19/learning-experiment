<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import MultipleChoiceActivity from '../components/MultipleChoiceActivity.vue'
import { useReadingProgress } from '../composables/useReadingProgress.js'

const route = useRoute()
const router = useRouter()
const reading = ref(null)
const blocks = computed(() => reading.value?.blocks ?? [])
const { passed, visibleBlocks, complete, unlock } = useReadingProgress(blocks)
const sentenceCount = computed(() => blocks.value.filter(block => block.type === 'sentence').length)
const hasPhraseDetails = computed(() => blocks.value.some(block => block.type === 'sentence' && block.segments.some(hasSegmentDetails)))
const sourceText = ref('')
const readingTitle = ref('')
const generating = ref(false)
const loading = ref(false)
const errorMessage = ref('')
let readingRequest
let generateRequest
let disposed = false

async function loadReading(id = route.query.reading) {
  readingRequest?.abort()
  errorMessage.value = ''
  reading.value = null
  selected.value = null
  if (popup.value?.matches(':popover-open')) popup.value.hidePopover()
  if (!id) { loading.value = false; return }
  if (typeof id !== 'string') { loading.value = false; errorMessage.value = 'Invalid reading link.'; return }
  const request = new AbortController()
  readingRequest = request
  loading.value = true
  try {
    const response = await fetch(`/api/readings/${encodeURIComponent(id)}`, { signal: request.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(response.status === 404 ? 'This saved reading was not found.' : 'Could not load the saved reading. Please try again.')
    const document = await response.json()
    if (!document.id || !Array.isArray(document.blocks) || !document.blocks.length) throw new Error('The reading response is invalid.')
    if (request !== readingRequest || disposed) return
    reading.value = document
  } catch (error) {
    if (!disposed && !request.signal.aborted) errorMessage.value = error.message || 'Could not load the reading.'
  } finally {
    if (request === readingRequest && !disposed) loading.value = false
  }
}

async function generateReading() {
  if (generating.value) return
  generating.value = true
  errorMessage.value = ''
  const request = new AbortController()
  generateRequest = request
  try {
    const response = await fetch('/api/readings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: request.signal,
      body: JSON.stringify({ title: readingTitle.value, text: sourceText.value }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(typeof error?.detail === 'string' ? error.detail : response.status === 422 ? 'Enter Chinese text, up to 100,000 characters.' : 'Could not save the reading. Please try again.')
    }
    const document = await response.json()
    if (!disposed) await router.replace({ query: { ...route.query, reading: document.id } })
  } catch (error) {
    if (!disposed && !request.signal.aborted) errorMessage.value = error.message || 'Could not generate the reading.'
  } finally {
    if (!disposed) generating.value = false
  }
}

const settingsDialog = ref(null)
const displayPinyin = ref(true)
const displayTranslation = ref(true)
const readingOnly = ref(false)
const blockElements = new Map()

function setBlockElement(id, element) {
  if (element) blockElements.set(id, element)
  else blockElements.delete(id)
}

async function passCheckpoint(id) {
  unlock(id)
  if (!readingOnly.value) return
  await nextTick()
  const nextBlock = reading.value.blocks[reading.value.blocks.findIndex(block => block.id === id) + 1]
  blockElements.get(nextBlock?.id)?.focus()
}
const languageSize = ref(32)
const translationSize = ref(16)
const sentenceSpacing = ref(24)
const translationSpacing = ref(8)

function openSettings() {
  if (popup.value?.matches(':popover-open')) popup.value.hidePopover()
  settingsDialog.value.showModal()
}

const selected = ref(null)
const popup = ref(null)
const popupHeading = ref(null)
let trigger = null

function positionPopup() {
  if (!trigger || !popup.value?.matches(':popover-open')) return
  const anchor = trigger.getBoundingClientRect()
  const box = popup.value.getBoundingClientRect()
  const gutter = 12
  const left = Math.max(gutter, Math.min(anchor.left, window.innerWidth - box.width - gutter))
  const below = anchor.bottom + 8
  const top = below + box.height <= window.innerHeight - gutter
    ? below
    : Math.max(gutter, anchor.top - box.height - 8)
  popup.value.style.left = `${left}px`
  popup.value.style.top = `${top}px`
}

function hasSegmentDetails(segment) {
  return Boolean(segment.details && (segment.details.translation || segment.details.partOfSpeech || segment.details.note))
}

async function openMeaning(segment, event) {
  if (selected.value?.id === segment.id && popup.value.matches(':popover-open')) {
    closeMeaning()
    return
  }
  trigger = event.currentTarget
  selected.value = segment
  await nextTick()
  popup.value.showPopover()
  positionPopup()
  popupHeading.value?.focus({ preventScroll: true })
}

function closeMeaning() {
  popup.value.hidePopover()
  trigger?.focus({ preventScroll: true })
}

function handleToggle(event) {
  if (event.newState === 'closed') selected.value = null
}

watch(() => route.query.reading, loadReading, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', positionPopup)
  window.addEventListener('scroll', positionPopup, true)
})
onUnmounted(() => {
  disposed = true
  readingRequest?.abort()
  generateRequest?.abort()
  window.removeEventListener('resize', positionPopup)
  window.removeEventListener('scroll', positionPopup, true)
})
</script>

<template>
  <main class="reading-app" :style="{ '--reading-language-size': `${languageSize / 16}rem`, '--reading-translation-size': `${translationSize / 16}rem`, '--reading-sentence-spacing': `${sentenceSpacing / 16}rem`, '--reading-translation-spacing': `${translationSpacing / 16}rem` }">
    <header class="reading-header">
      <RouterLink :to="{ name: 'home' }" class="reading-back">← Home</RouterLink>
      <span class="reading-eyebrow">MANDARIN READING</span>
      <div class="reading-header-actions">
        <span class="reading-level">Beginner</span>
        <button type="button" class="reading-settings-button" aria-label="Reading settings" aria-haspopup="dialog" aria-controls="reading-settings" @click="openSettings">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 3-.5 2a7.5 7.5 0 0 0-1.7 1L4.8 5.5l-3 5.2 1.5 1.4a7.5 7.5 0 0 0 0 2l-1.5 1.4 3 5.2 2-.5a7.5 7.5 0 0 0 1.7 1l.5 2h6l.5-2a7.5 7.5 0 0 0 1.7-1l2 .5 3-5.2-1.5-1.4a7.5 7.5 0 0 0 0-2l1.5-1.4-3-5.2-2 .5a7.5 7.5 0 0 0-1.7-1L15 3Z" transform="translate(1 0) scale(.92)" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>

    <section class="reading-import" aria-labelledby="reading-import-title">
      <h2 id="reading-import-title">Create a Chinese reading</h2>
      <form class="stack" :aria-busy="generating" @submit.prevent="generateReading">
        <label class="reading-import-label">Title (optional)
          <input v-model="readingTitle" maxlength="200" placeholder="Give your reading a title">
        </label>
        <label class="reading-import-label">Chinese text
          <textarea v-model="sourceText" rows="6" maxlength="100000" required placeholder="Paste Chinese text here…" />
        </label>
        <div class="cluster">
          <button class="button" :disabled="generating || loading || !sourceText.trim()">{{ generating ? 'Generating…' : 'Generate reading' }}</button>
          <span class="reading-help">{{ sourceText.length.toLocaleString() }} / 100,000 characters</span>
        </div>
      </form>
      <p v-if="generating" role="status">Segmenting text and generating pinyin. This may take a moment for long passages.</p>
      <p v-if="loading" role="status">Loading saved reading…</p>
      <div v-if="errorMessage" role="alert" class="reading-import-error">
        <p>{{ errorMessage }}</p>
        <button v-if="route.query.reading && !generating" type="button" class="button" :disabled="loading" @click="loadReading()">Retry loading</button>
      </div>
      <p v-if="!reading && !loading && !generating && !errorMessage" class="reading-help">Generate a reading to see word segmentation and pinyin. Its URL will let you reopen the saved document.</p>
    </section>

    <article v-if="reading" class="reading-article" aria-labelledby="reading-title">
      <div class="reading-intro">
        <p class="reading-eyebrow">A LITTLE EVERY DAY</p>
        <h1 id="reading-title" :lang="reading.language">{{ reading.title }}</h1>
        <p v-if="displayTranslation && reading.titleTranslation" class="reading-subtitle">{{ reading.titleTranslation }}</p>
        <p class="reading-help">{{ hasPhraseDetails ? 'Tap or click a word or phrase to explore its meaning. You can also use Tab and Enter.' : 'Read each sentence with pinyin above its words. Use the wheel to adjust the display.' }}</p>
      </div>

      <template v-for="block in visibleBlocks" :key="block.id">
      <section v-if="block.type === 'sentence'" class="reading-block" :ref="element => setBlockElement(block.id, element)" tabindex="-1" aria-label="Reading sentence">
        <p class="reading-sentence" :lang="reading.language"><template v-for="segment in block.segments" :key="segment.id"><button v-if="hasSegmentDetails(segment)" type="button" class="reading-phrase" :class="{ 'is-active': selected?.id === segment.id }" :aria-expanded="selected?.id === segment.id" aria-controls="phrase-meaning" aria-haspopup="dialog" @click="openMeaning(segment, $event)"><ruby>{{ segment.text }}<rt v-if="displayPinyin && segment.pinyin">{{ segment.pinyin }}</rt></ruby></button><span v-else :class="segment.pinyin ? 'reading-phrase' : 'reading-punctuation'"><ruby v-if="segment.pinyin">{{ segment.text }}<rt v-if="displayPinyin">{{ segment.pinyin }}</rt></ruby><template v-else>{{ segment.text }}</template></span></template></p>
        <p v-if="displayTranslation && block.translation" class="reading-translation" :lang="reading.translationLanguage">{{ block.translation }}</p>
      </section>
      <section v-else-if="block.type === 'Multiple-choice'" class="reading-checkpoint" v-show="!readingOnly || !passed.has(block.id)" :ref="element => setBlockElement(block.id, element)" tabindex="-1" :aria-label="`Reading checkpoint ${block.id}`">
        <MultipleChoiceActivity embedded :show-instructions="false" :items="[block.question]" :text-size="languageSize" :translation-size="translationSize" translation-label="English translation" @passed="passCheckpoint(block.id)" />
      </section>
      </template>
      <p v-if="complete" class="reading-end">End of reading · {{ sentenceCount }} sentences</p>
      <p v-else class="reading-end">Answer this checkpoint correctly to keep reading.</p>
    </article>

    <dialog id="reading-settings" ref="settingsDialog" class="reading-settings" aria-labelledby="reading-settings-title">
      <form method="dialog" class="stack">
        <div class="reading-settings-heading">
          <h2 id="reading-settings-title">Reading settings</h2>
          <button class="reading-settings-button" aria-label="Close settings" autofocus>×</button>
        </div>
        <label class="reading-setting-row">
          <span>Only display reading content</span>
          <input v-model="readingOnly" type="checkbox" aria-describedby="reading-only-help">
        </label>
        <p id="reading-only-help" class="reading-help">Hide completed quizzes. The current quiz stays visible until answered correctly.</p>
        <label class="reading-setting-row">
          <span>Display pinyin</span>
          <input v-model="displayPinyin" type="checkbox">
        </label>
        <label class="reading-setting-row">
          <span>Display translation</span>
          <input v-model="displayTranslation" type="checkbox">
        </label>
        <div class="reading-setting-size">
          <label for="reading-language-size">Text size of language</label>
          <output for="reading-language-size">{{ languageSize }} px</output>
          <input id="reading-language-size" v-model.number="languageSize" type="range" min="20" max="48" step="2">
        </div>
        <div class="reading-setting-size">
          <label for="reading-translation-size">Text size of translation</label>
          <output for="reading-translation-size">{{ translationSize }} px</output>
          <input id="reading-translation-size" v-model.number="translationSize" type="range" min="12" max="32" step="1">
        </div>
        <div class="reading-setting-size">
          <label for="reading-sentence-spacing">Spacing between sentences</label>
          <output for="reading-sentence-spacing">{{ sentenceSpacing }} px</output>
          <input id="reading-sentence-spacing" v-model.number="sentenceSpacing" type="range" min="0" max="64" step="4">
        </div>
        <div class="reading-setting-size">
          <label for="reading-translation-spacing">Spacing between sentence and translation</label>
          <output for="reading-translation-spacing">{{ translationSpacing }} px</output>
          <input id="reading-translation-spacing" v-model.number="translationSpacing" type="range" min="0" max="32" step="2">
        </div>
        <button class="button reading-settings-done">Done</button>
      </form>
    </dialog>

    <div id="phrase-meaning" ref="popup" popover="auto" role="dialog" class="reading-popup" aria-labelledby="phrase-heading" @toggle="handleToggle">
      <template v-if="selected">
        <button type="button" class="reading-popup-close" aria-label="Close meaning" @click="closeMeaning">×</button>
        <p class="reading-eyebrow">PHRASE MEANING</p>
        <h2 id="phrase-heading" ref="popupHeading" tabindex="-1" :lang="reading.language">{{ selected.text }}</h2>
        <p class="reading-popup-pinyin" lang="zh-Latn-pinyin">{{ selected.pinyin }}</p>
        <p v-if="selected.details.translation" class="reading-popup-meaning" :lang="reading.translationLanguage">{{ selected.details.translation }}</p>
        <span v-if="selected.details.partOfSpeech" class="reading-word-type">{{ selected.details.partOfSpeech }}</span>
        <p v-if="selected.details.note" class="reading-popup-note">{{ selected.details.note }}</p>
      </template>
    </div>
  </main>
</template>
