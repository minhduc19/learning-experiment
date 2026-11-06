<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { characterLabel, formatCount, useCorpusPage } from '../composables/useCorpusPage'
import CharacterProgressControls from '../components/CharacterProgressControls.vue'

const route = useRoute()
const router = useRouter()
const characters = useCorpusPage(48)
const search = ref('')
const searchError = ref('')
const sort = computed(() => route.query.sort === 'distinct_segment_count' ? 'distinct_segment_count' : 'occurrence_count')
const includeOther = computed(() => route.query.all === '1')
const filtered = computed(() => Boolean(route.query.character) || includeOther.value)

function changeQuery(changes) {
  router.replace({ query: { ...route.query, ...changes } })
}

function searchCharacter() {
  if (Array.from(search.value).length > 1) {
    searchError.value = 'Enter one character, such as 学.'
    return
  }
  searchError.value = ''
  changeQuery({ character: search.value || undefined })
}

function reload() {
  const params = new URLSearchParams({ sort: sort.value, include_non_han: String(includeOther.value) })
  if (typeof route.query.character === 'string') params.set('character', route.query.character)
  characters.reset(`/api/corpus/characters?${params}`)
}

watch(() => [sort.value, includeOther.value, route.query.character], () => {
  search.value = typeof route.query.character === 'string' ? route.query.character : ''
  searchError.value = ''
  reload()
}, { immediate: true })
</script>

<template>
  <main class="page corpus-page">
    <header class="corpus-heading">
      <p class="corpus-eyebrow">YOUR CHINESE CORPUS</p>
      <h1>Character explorer</h1>
      <p>Discover characters, the words they form, and the sentences they appear in.</p>
      <div class="cluster"><RouterLink class="button" to="/corpus-upload">Upload a story</RouterLink><RouterLink to="/my-stories">My stories</RouterLink></div>
    </header>

    <section class="corpus-toolbar" aria-label="Character filters">
      <form class="corpus-search" @submit.prevent="searchCharacter">
        <label for="character-search">Find a character</label>
        <div class="corpus-search-input">
          <input id="character-search" v-model="search" placeholder="e.g. 学" autocomplete="off" :aria-invalid="Boolean(searchError)" :aria-describedby="searchError ? 'character-search-error' : undefined">
          <button class="button" type="submit">Search</button>
        </div>
        <p v-if="searchError" id="character-search-error" class="corpus-error" role="alert">{{ searchError }}</p>
      </form>
      <div class="corpus-sort">
        <label for="character-sort">Sort by</label>
        <select id="character-sort" :value="sort" @change="changeQuery({ sort: $event.target.value })">
          <option value="occurrence_count">Most frequent</option>
          <option value="distinct_segment_count">Most word segments</option>
        </select>
      </div>
      <label class="corpus-checkbox"><input type="checkbox" :checked="includeOther" @change="changeQuery({ all: $event.target.checked ? '1' : undefined })"> Include punctuation and other characters</label>
    </section>

    <div class="corpus-section-heading">
      <p class="corpus-muted" role="status">{{ characters.loaded ? `${formatCount(characters.items.length)} characters loaded` : characters.loading ? 'Loading characters…' : 'Characters' }}</p>
      <button class="corpus-text-button" :disabled="characters.loading" @click="reload">Refresh</button>
    </div>
    <p v-if="characters.error" class="corpus-error" role="alert">{{ characters.error }} <button class="corpus-text-button" @click="characters.load">Try again</button></p>
    <p v-if="characters.items.length" class="corpus-progress-help">Mark characters as Learned, Learning, or both for revision. Click a selected mark to remove it.</p>

    <ul v-if="characters.items.length" class="corpus-character-grid" aria-label="Characters" :aria-busy="characters.loading">
      <li v-for="character in characters.items" :key="character.id" class="corpus-character-item">
        <RouterLink class="corpus-character-card" :to="{ name: 'character-detail', params: { characterId: character.id }, query: route.query }" :aria-label="`${characterLabel(character.value)} — ${formatCount(character.occurrence_count)} occurrences, ${formatCount(character.distinct_segment_count)} word segments`">
          <span class="corpus-character-glyph" :class="{ 'is-named': characterLabel(character.value) !== character.value }" lang="zh-Hans">{{ characterLabel(character.traditional_value || character.value) }}<small v-if="character.simplified_value && character.simplified_value !== (character.traditional_value || character.value)" class="corpus-script-alternative" lang="zh-Hans">{{ characterLabel(character.simplified_value) }}</small></span>
          <span><strong>{{ formatCount(character.occurrence_count) }}</strong> {{ character.occurrence_count === 1 ? 'occurrence' : 'occurrences' }}</span>
          <span class="corpus-muted">{{ formatCount(character.distinct_segment_count) }} word {{ character.distinct_segment_count === 1 ? 'segment' : 'segments' }}</span>
          <svg class="corpus-card-arrow" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </RouterLink>
        <CharacterProgressControls :character="character" />
      </li>
    </ul>
    <section v-else-if="characters.loaded && !characters.error" class="corpus-empty" role="status">
      <h2>{{ filtered ? 'No matching characters' : 'Your corpus is ready for its first story' }}</h2>
      <p>{{ filtered ? 'Try another character or include punctuation and other characters.' : 'Import a Chinese story to explore its characters, segments, and sentences here.' }}</p>
      <button v-if="filtered" class="button" @click="router.replace({ query: {} })">Clear filters</button>
      <RouterLink v-else class="button" to="/corpus-upload">Upload your first story</RouterLink>
    </section>
    <div v-if="characters.nextCursor" class="corpus-pagination">
      <button class="button" :disabled="characters.loading" @click="characters.load">{{ characters.loading ? 'Loading…' : 'Load more characters' }}</button>
    </div>
  </main>
</template>
