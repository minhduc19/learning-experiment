<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCorpusPage } from '../composables/useCorpusPage'
const sentences = useCorpusPage(20)
function refresh() { sentences.reset('/api/corpus/practice-sentences') }
function parts(sentence) {
  const marks = new Map(sentence.marks.map(mark => [mark.offset, mark]))
  return Array.from(sentence.raw_text, (text, offset) => {
    const mark = marks.get(offset)
    return { text, kind: mark ? mark.learned && mark.learning ? 'both' : mark.learned ? 'learned' : 'learning' : '' }
  })
}
onMounted(refresh)
</script>
<template>
  <main class="page corpus-page">
    <p class="corpus-eyebrow">YOUR VOCABULARY IN CONTEXT</p>
    <h1>Sentence practice</h1>
    <p>Sentences with the most marked characters appear first. Repeated characters count each time; revision characters count once.</p>
    <div class="cluster"><RouterLink to="/characters">Manage learning marks</RouterLink><RouterLink to="/my-stories">My stories</RouterLink><button class="corpus-text-button" :disabled="sentences.loading" @click="refresh">Refresh ranking</button></div>
    <p class="practice-legend"><span class="practice-mark is-learned">Learned</span><span class="practice-mark is-learning">Learning</span><span class="practice-mark is-both">Both · revision</span></p>
    <p v-if="sentences.error" class="corpus-error" role="alert">{{ sentences.error }} Refresh the ranking if your marks or stories have changed. <button class="corpus-text-button" @click="refresh">Refresh</button></p>
    <ol class="corpus-sentences">
      <li v-for="sentence in sentences.items" :key="`${sentence.story_id}:${sentence.sentence_position}`" class="corpus-sentence-card">
        <div class="corpus-sentence-meta"><RouterLink :to="`/my-stories/${sentence.story_id}`">{{ sentence.story_title }}</RouterLink><span>Sentence {{ sentence.sentence_position + 1 }}</span></div>
        <p class="practice-counts"><strong>{{ sentence.matched_count }} marked characters</strong> · {{ sentence.learned_count }} learned · {{ sentence.learning_count }} learning · {{ sentence.both_count }} both</p>
        <p v-if="sentence.is_excerpt" class="corpus-muted">Excerpt — counts cover the complete sentence. Open the story to read more.</p>
        <p class="corpus-sentence-text" lang="zh"><span v-for="(part, index) in parts(sentence)" :key="index" :class="part.kind ? ['practice-mark', `is-${part.kind}`] : undefined" :title="part.kind === 'both' ? 'Learned and Learning' : part.kind === 'learned' ? 'Learned' : part.kind === 'learning' ? 'Learning' : undefined">{{ part.text }}</span></p>
      </li>
    </ol>
    <p v-if="sentences.loading" role="status">Loading sentences…</p>
    <section v-else-if="sentences.loaded && !sentences.items.length" class="corpus-empty"><h2>No marked sentences yet</h2><p>Mark characters as Learned or Learning in your character explorer, then refresh this page.</p><RouterLink class="button" to="/characters">Choose characters</RouterLink></section>
    <div v-if="sentences.nextCursor" class="corpus-pagination"><button class="button" :disabled="sentences.loading" @click="sentences.load">Load more sentences</button></div>
  </main>
</template>
