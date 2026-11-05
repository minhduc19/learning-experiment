<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import reading from '../data/reading.json'

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
  <main class="reading-app">
    <header class="reading-header">
      <RouterLink :to="{ name: 'home' }" class="reading-back">← Home</RouterLink>
      <span class="reading-eyebrow">MANDARIN READING</span>
      <span class="reading-level">Beginner</span>
    </header>

    <article class="reading-article" aria-labelledby="reading-title">
      <div class="reading-intro">
        <p class="reading-eyebrow">A LITTLE EVERY DAY</p>
        <h1 id="reading-title" :lang="reading.language">{{ reading.title }}</h1>
        <p class="reading-subtitle">{{ reading.titleTranslation }}</p>
        <p class="reading-help">Tap or click a word or phrase to explore its meaning. You can also use Tab and Enter.</p>
      </div>

      <section v-for="(block, index) in reading.blocks" :key="block.id" class="reading-block" :aria-label="`Sentence ${index + 1}`">
        <p class="reading-sentence" :lang="reading.language"><template v-for="segment in block.segments" :key="segment.id"><button v-if="segment.details" type="button" class="reading-phrase" :class="{ 'is-active': selected?.id === segment.id }" :aria-expanded="selected?.id === segment.id" aria-controls="phrase-meaning" aria-haspopup="dialog" @click="openMeaning(segment, $event)"><ruby>{{ segment.text }}<rt v-if="segment.pinyin">{{ segment.pinyin }}</rt></ruby></button><span v-else class="reading-punctuation">{{ segment.text }}</span></template></p>
        <p class="reading-translation" :lang="reading.translationLanguage">{{ block.translation }}</p>
      </section>
      <p class="reading-end">End of reading · {{ reading.blocks.length }} sentences</p>
    </article>

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
