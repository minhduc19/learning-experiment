<script setup>
import { formatCount, highlightedText } from '../composables/useCorpusPage'

defineProps({ resource: { type: Object, required: true } })
</script>

<template>
  <p v-if="resource.loading && !resource.items.length" class="corpus-muted" role="status">Loading sentences…</p>
  <p v-if="resource.error" class="corpus-error" role="alert">{{ resource.error }} <button class="corpus-text-button" @click="resource.load">Try again</button></p>
  <p v-if="resource.loaded && !resource.items.length && !resource.error" class="corpus-muted">No matching sentences.</p>
  <ol class="corpus-sentences" :aria-busy="resource.loading" aria-label="Matching sentences">
    <li v-for="sentence in resource.items" :key="sentence.id" class="corpus-sentence-card">
      <div class="corpus-sentence-meta">
        <span>{{ sentence.story_title }} · Sentence {{ formatCount(sentence.sentence_position + 1) }}<template v-if="sentence.part_position || !sentence.is_final"> · Part {{ sentence.part_position + 1 }}</template></span>
        <span>{{ formatCount(sentence.matches.length) }} {{ sentence.matches.length === 1 ? 'occurrence' : 'occurrences' }} in this excerpt</span>
      </div>
      <p class="corpus-sentence-text" lang="zh-Hant"><template v-for="(part, index) in highlightedText(sentence.traditional_text || sentence.raw_text, (!sentence.traditional_text || sentence.traditional_text === sentence.raw_text) ? sentence.matches : [])" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></p>
      <p v-if="sentence.simplified_text && sentence.simplified_text !== (sentence.traditional_text || sentence.raw_text)" class="corpus-sentence-simplified" lang="zh-Hans">{{ sentence.simplified_text }}</p>
    </li>
  </ol>
  <div v-if="resource.nextCursor" class="corpus-pagination">
    <button class="button" :disabled="resource.loading" @click="resource.load">{{ resource.loading ? 'Loading…' : 'Load more sentences' }}</button>
  </div>
</template>
