<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import reading from '../data/reading.json'
import MultipleChoiceActivity from '../components/MultipleChoiceActivity.vue'
import { useReadingProgress } from '../composables/useReadingProgress.js'

const { visibleBlocks, complete, unlock } = useReadingProgress(reading.blocks)
const sentenceCount = reading.blocks.filter(block => block.type === 'sentence').length

const settingsDialog = ref(null)
const displayPinyin = ref(true)
const displayTranslation = ref(true)
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

onMounted(() => {
  window.addEventListener('resize', positionPopup)
  window.addEventListener('scroll', positionPopup, true)
})
onUnmounted(() => {
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

    <article class="reading-article" aria-labelledby="reading-title">
      <div class="reading-intro">
        <p class="reading-eyebrow">A LITTLE EVERY DAY</p>
        <h1 id="reading-title" :lang="reading.language">{{ reading.title }}</h1>
        <p v-if="displayTranslation" class="reading-subtitle">{{ reading.titleTranslation }}</p>
        <p class="reading-help">Tap or click a word or phrase to explore its meaning. You can also use Tab and Enter.</p>
      </div>

      <template v-for="block in visibleBlocks" :key="block.id">
      <section v-if="block.type === 'sentence'" class="reading-block" aria-label="Reading sentence">
        <p class="reading-sentence" :lang="reading.language"><template v-for="segment in block.segments" :key="segment.id"><button v-if="segment.details" type="button" class="reading-phrase" :class="{ 'is-active': selected?.id === segment.id }" :aria-expanded="selected?.id === segment.id" aria-controls="phrase-meaning" aria-haspopup="dialog" @click="openMeaning(segment, $event)"><ruby>{{ segment.text }}<rt v-if="displayPinyin && segment.pinyin">{{ segment.pinyin }}</rt></ruby></button><span v-else class="reading-punctuation">{{ segment.text }}</span></template></p>
        <p v-if="displayTranslation" class="reading-translation" :lang="reading.translationLanguage">{{ block.translation }}</p>
      </section>
      <section v-else-if="block.type === 'Multiple-choice'" class="reading-checkpoint" :aria-label="`Reading checkpoint ${block.id}`">
        <p class="reading-eyebrow">READING CHECKPOINT</p>
        <MultipleChoiceActivity embedded :items="[block.question]" translation-label="English translation" @passed="unlock(block.id)" />
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
        <p class="reading-popup-meaning" :lang="reading.translationLanguage">{{ selected.details.translation }}</p>
        <span v-if="selected.details.partOfSpeech" class="reading-word-type">{{ selected.details.partOfSpeech }}</span>
        <p v-if="selected.details.note" class="reading-popup-note">{{ selected.details.note }}</p>
      </template>
    </div>
  </main>
</template>
