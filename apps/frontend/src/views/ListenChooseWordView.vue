<script setup>
import { computed, nextTick, ref } from 'vue'
import data from '../data/listenChooseWord.json'
import { shuffle } from '../composables/shuffle.js'
const labels = data.labels
const index = ref(0), chosen = ref([]), feedback = ref(false), heading = ref(null), audioError = ref(false)
const exercise = computed(() => data.exercises[index.value])
const options = ref(shuffle(exercise.value.options))
const complete = computed(() => index.value >= data.exercises.length)
const correct = computed(() => exercise.value?.spokenIds.every(id => chosen.value.includes(id)))
const spoken = computed(() => exercise.value.spokenIds.map(id => exercise.value.options.find(option => option.id === id)))
function choose(id) { if (!chosen.value.includes(id)) chosen.value.push(id) }
async function advance() {
  if (!feedback.value) { feedback.value = true; return }
  index.value++; feedback.value = false; chosen.value = []; audioError.value = false
  if (!complete.value) options.value = shuffle(exercise.value.options)
  await nextTick(); heading.value?.focus()
}
async function restart() { index.value = 0; chosen.value = []; feedback.value = false; options.value = shuffle(exercise.value.options); await nextTick(); heading.value?.focus() }
</script>
<template>
  <main class="activity activity-screen listening-activity" :class="{ 'activity-has-feedback': feedback }">
    <div class="activity-screen-progress"><div class="activity-topline"><span class="activity-eyebrow">{{ labels.eyebrow }}</span><span>{{ Math.min(index + 1, data.exercises.length) }} / {{ data.exercises.length }}</span></div><progress class="activity-progress" :value="index" :max="data.exercises.length" :aria-label="labels.eyebrow" /></div>
    <section v-if="complete" class="activity-finish"><h1 ref="heading" tabindex="-1" class="activity-title">{{ labels.finish }}</h1><button class="button activity-action" @click="restart">{{ labels.restart }}</button></section>
    <section v-else class="activity-screen-question">
      <div class="activity-mascot" aria-hidden="true">♫</div>
      <h1 ref="heading" tabindex="-1" class="activity-title">{{ labels.title.replace('{count}', exercise.spokenIds.length) }}</h1>
      <p class="activity-hint">{{ labels.hint }}</p>
      <audio :key="exercise.id" controls preload="metadata" :src="exercise.audio" :aria-label="labels.play" @error="audioError = true" />
      <p v-if="audioError" role="alert">{{ labels.audioError }}</p>
      <div class="listening-options">
        <button v-for="(option, position) in options" :key="option.id" class="activity-option listening-option" :class="{ 'is-correct': chosen.includes(option.id) && exercise.spokenIds.includes(option.id), 'is-incorrect': chosen.includes(option.id) && !exercise.spokenIds.includes(option.id) }" :aria-pressed="chosen.includes(option.id)" :disabled="feedback" @click="choose(option.id)">
          <span class="listening-number">{{ position + 1 }}</span><span>{{ option.pinyin }}</span><strong :lang="exercise.language">{{ option.text }}</strong><small v-if="chosen.includes(option.id)">{{ exercise.spokenIds.includes(option.id) ? labels.correct : labels.incorrect }}</small>
        </button>
      </div>
      <p role="status" class="activity-hint">{{ chosen.filter(id => exercise.spokenIds.includes(id)).length }} / {{ exercise.spokenIds.length }} {{ labels.correct }}</p>
    </section>
    <section v-if="feedback && !complete" class="activity-feedback is-correct"><div class="activity-feedback-body"><h2>{{ labels.feedback }}</h2><p class="activity-translation">{{ spoken.map(option => option.text).join(' · ') }}<br>{{ spoken.map(option => option.translation).join(' · ') }}</p><p>{{ exercise.explanation }}</p><ul><li v-for="option in options" :key="option.id">{{ option.pinyin }} — {{ option.text }}: {{ option.translation }} ({{ exercise.spokenIds.includes(option.id) ? labels.correct : labels.incorrect }})</li></ul></div></section>
    <footer v-if="!complete" class="activity-screen-actions"><button class="button activity-action" :disabled="!correct" @click="advance">{{ labels.continue }}</button></footer>
  </main>
</template>
<style scoped>
.listening-options { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; width: 100%; margin-block: 1rem; }
.activity-screen .listening-option { position: relative; width: 150px; min-height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem; padding: 1rem; }
.listening-option strong { font-size: 2rem; }.listening-number { position: absolute; top: .3rem; left: .6rem; font-size: .8rem; }
.activity-screen .listening-option.is-correct { background: #dcfce7; border-color: #15803d; color: #14532d; }
.activity-screen .listening-option.is-incorrect { background: #fee2e2; border-color: #b91c1c; color: #7f1d1d; }
audio { max-width: 100%; }.listening-activity .activity-feedback { position: static; }.listening-activity { overflow-y: auto; }
</style>
