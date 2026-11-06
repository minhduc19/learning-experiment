<script setup>
import { onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import StudySentence from '../components/StudySentence.vue'
const learnedCount = ref(5), newCount = ref(5), loading = ref(false), error = ref(''), result = ref(null)
let controller
async function generate() {
  if (loading.value) return
  if (![learnedCount.value, newCount.value].every(n => Number.isInteger(n) && n >= 0 && n <= 50) || learnedCount.value + newCount.value === 0) {
    error.value = 'Choose whole numbers from 0 to 50, with at least one character in total.'; return
  }
  controller = new AbortController(); loading.value = true; error.value = ''
  try {
    const response = await authorizedFetch('/api/corpus/study-selection?' + new URLSearchParams({ learned_count: learnedCount.value, new_count: newCount.value }), { signal: controller.signal })
    if (!response.ok) throw new Error('Could not generate your selection. Please try again.')
    result.value = await response.json()
  } catch (failure) { if (!controller.signal.aborted) error.value = failure.message }
  finally { loading.value = false }
}
onUnmounted(() => controller?.abort())
</script>
<template>
  <main class="page corpus-page study-page">
    <p class="corpus-eyebrow">A STUDY SET FROM YOUR STORIES</p><h1>Build a study selection</h1>
    <div class="cluster"><RouterLink to="/characters">Learning marks</RouterLink><RouterLink to="/sentence-practice">Sentence practice</RouterLink></div>
    <form class="corpus-toolbar study-form" @submit.prevent="generate">
      <div><label for="study-learned">Learned characters to review</label><input id="study-learned" v-model.number="learnedCount" type="number" min="0" max="50" step="1" required aria-describedby="study-learned-help"><p id="study-learned-help" class="corpus-filter-description">A random sample of Learned characters, including revision. Each includes up to three popular word segments and a sentence for each.</p></div>
      <div><label for="study-new">Characters to learn</label><input id="study-new" v-model.number="newCount" type="number" min="0" max="50" step="1" required aria-describedby="study-new-help"><p id="study-new-help" class="corpus-filter-description">Start with sentences containing the most Learned character appearances, then choose their unfamiliar characters by corpus frequency. Learning-only characters are eligible. Sentences with no learned characters come last.</p></div>
      <button class="button" :disabled="loading">{{ loading ? 'Building selection…' : result ? 'Generate another selection' : 'Generate selection' }}</button><p class="corpus-muted">Up to 50 in each group. Suggestions do not change your marks. Traditional and simplified text are shown together.</p>
    </form>
    <p v-if="error" class="corpus-error" role="alert">{{ error }}</p><p v-if="loading" role="status">Finding characters and examples…</p>
    <template v-if="result">
      <p role="status">Selected {{ result.learned.length }} of {{ result.requested.learned }} learned characters and {{ result.new.length }} of {{ result.requested.new }} characters to learn.</p>
      <p v-if="result.learned.length < result.requested.learned || result.new.length < result.requested.new" class="corpus-resume-note">Your corpus cannot supply the full requested counts. Mark more characters as Learned or upload more stories to expand the selection.</p>
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
