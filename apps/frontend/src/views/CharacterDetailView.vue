<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CorpusSentences from '../components/CorpusSentences.vue'
import { characterLabel, fetchCorpus, formatCount, useCorpusPage } from '../composables/useCorpusPage'

const route = useRoute()
const character = ref(null)
const loading = ref(false)
const error = ref('')
const segments = useCorpusPage()
const sentences = useCorpusPage(20)
const selectedSegment = ref(null)
const sentencesHeading = ref(null)
const sentenceTotal = computed(() => selectedSegment.value?.sentence_count ?? character.value?.sentence_count ?? 0)
let revision = 0
let controller

async function loadCharacter() {
  const ticket = ++revision
  controller?.abort()
  const requestController = new AbortController()
  controller = requestController
  character.value = null
  loading.value = true
  error.value = ''
  selectedSegment.value = null
  segments.reset(null)
  sentences.reset(null)
  const identifier = String(route.params.characterId)
  if (!/^[1-9]\d*$/.test(identifier)) {
    error.value = 'This character is not available in the completed corpus.'
    loading.value = false
    return
  }
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; requestController.abort() }, 35000)
  try {
    const data = await fetchCorpus(`/api/corpus/characters/${identifier}`, requestController.signal)
    if (ticket !== revision) return
    if (typeof data?.value !== 'string' || Array.from(data.value).length !== 1 || !Number.isInteger(data.sentence_count)) {
      throw new Error('The corpus returned an unexpected response. Please try again.')
    }
    character.value = data
    segments.reset(`/api/corpus/characters/${identifier}/segments?include_non_words=true&include_sentence_counts=true`)
    sentences.reset(`/api/corpus/characters/${identifier}/sentences`)
  } catch (failure) {
    if (ticket === revision) error.value = timedOut ? 'The request took too long. Please try again.' : failure.message
  } finally {
    clearTimeout(timeout)
    if (ticket === revision) loading.value = false
  }
}

async function selectSegment(segment) {
  selectedSegment.value = segment
  sentences.reset(segment
    ? `/api/corpus/segments/${segment.id}/sentences`
    : `/api/corpus/characters/${character.value.id}/sentences`)
  await nextTick()
  sentencesHeading.value?.focus()
}

watch(() => route.params.characterId, loadCharacter, { immediate: true })
onUnmounted(() => { revision += 1; controller?.abort() })
</script>

<template>
  <main class="page corpus-page">
    <RouterLink class="corpus-back" :to="{ name: 'characters', query: route.query }">← All characters</RouterLink>
    <header class="corpus-heading">
      <p class="corpus-eyebrow">CHARACTER EXPLORER</p>
      <h1>Character details</h1>
    </header>
    <p v-if="loading" class="corpus-muted" role="status">Loading character associations…</p>
    <p v-if="error" class="corpus-error" role="alert">{{ error }} <button class="corpus-text-button" @click="loadCharacter">Try again</button></p>

    <template v-if="character">
      <section class="corpus-summary" aria-label="Character overview">
        <div class="corpus-summary-glyph" :class="{ 'is-named': characterLabel(character.value) !== character.value }" lang="zh-Hans">{{ characterLabel(character.traditional_value || character.value) }}<small v-if="character.simplified_value && character.simplified_value !== (character.traditional_value || character.value)" class="corpus-script-alternative" lang="zh-Hans">{{ characterLabel(character.simplified_value) }}</small></div>
        <div>
          <p class="corpus-summary-caption">Across all completed stories</p>
          <dl class="corpus-metrics">
            <div><dt>Character occurrences</dt><dd>{{ formatCount(character.occurrence_count) }}</dd></div>
            <div><dt>Different word segments</dt><dd>{{ formatCount(character.distinct_segment_count) }}</dd></div>
            <div><dt>Word segment appearances</dt><dd>{{ formatCount(character.segment_occurrence_count) }}</dd></div>
            <div><dt>Matching sentences</dt><dd>{{ formatCount(character.sentence_count) }}</dd></div>
          </dl>
        </div>
      </section>
      <p class="corpus-count-note">A repeated character counts each time it appears. For example, 谢谢 contains two occurrences of 谢 and one word segment.</p>

      <section class="corpus-section" aria-labelledby="segments-heading">
        <div class="corpus-section-heading"><h2 id="segments-heading">Associated segments</h2><span class="corpus-muted">{{ formatCount(segments.items.length) }} loaded</span></div>
        <p class="corpus-muted">Choose a segment to see its sentences.</p>
        <p v-if="segments.loading && !segments.items.length" class="corpus-muted" role="status">Loading segments…</p>
        <p v-if="segments.error" class="corpus-error" role="alert">{{ segments.error }} <button class="corpus-text-button" @click="segments.load">Try again</button></p>
        <p v-if="segments.loaded && !segments.items.length && !segments.error" class="corpus-muted">No associated segments.</p>
        <ul class="corpus-segment-grid" aria-label="Associated segments" :aria-busy="segments.loading">
          <li v-for="segment in segments.items" :key="segment.id">
            <button class="corpus-segment-card" :class="{ 'is-selected': selectedSegment?.id === segment.id }" :aria-pressed="selectedSegment?.id === segment.id" @click="selectSegment(segment)">
              <span class="corpus-segment-text" lang="zh-Hans">{{ characterLabel(segment.traditional_text || segment.text) }}<small v-if="segment.simplified_text && segment.simplified_text !== (segment.traditional_text || segment.text)" class="corpus-script-alternative" lang="zh-Hans">{{ characterLabel(segment.simplified_text) }}</small></span>
              <span class="corpus-segment-stats"><span><strong>{{ formatCount(segment.occurrence_count) }}</strong> {{ segment.occurrence_count === 1 ? 'appearance' : 'appearances' }}</span><span><strong>{{ formatCount(segment.sentence_count) }}</strong> {{ segment.sentence_count === 1 ? 'sentence' : 'sentences' }}</span></span>
              <span class="corpus-muted">{{ formatCount(segment.count_in_segment) }} × {{ characterLabel(character.value) }} per segment</span>
            </button>
          </li>
        </ul>
        <div v-if="segments.nextCursor" class="corpus-pagination"><button class="button" :disabled="segments.loading" @click="segments.load">{{ segments.loading ? 'Loading…' : 'Load more segments' }}</button></div>
      </section>

      <section class="corpus-section" aria-labelledby="sentences-heading">
        <div class="corpus-section-heading">
          <h2 id="sentences-heading" ref="sentencesHeading" tabindex="-1">{{ formatCount(sentenceTotal) }} matching {{ sentenceTotal === 1 ? 'sentence' : 'sentences' }}</h2>
          <button v-if="selectedSegment" class="corpus-text-button" @click="selectSegment(null)">Show all sentences for {{ characterLabel(character.value) }}</button>
        </div>
        <p class="corpus-muted">{{ selectedSegment ? `Containing ${characterLabel(selectedSegment.text)}` : `Containing ${characterLabel(character.value)}` }} · Matches are highlighted. Long sentences appear as ordered excerpts.</p>
        <CorpusSentences :resource="sentences" />
      </section>
    </template>
  </main>
</template>
