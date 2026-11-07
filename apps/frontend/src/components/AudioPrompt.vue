<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { audioPromptUrl, demoAudioPrompt } from '../composables/activityPrompt.js'
import { playPromptAudio, stopOptionAudio } from '../composables/optionPlayback.js'
const props = defineProps({ src: { type: String, default: null } })
const url = computed(() => audioPromptUrl(props.src))
const error = ref(''), playing = ref(false)
const owner = Symbol('prompt-audio')
function stop() { stopOptionAudio(owner); playing.value = false }
watch(() => props.src, () => { stop(); error.value = '' })
onUnmounted(stop)
async function play() {
  stop(); error.value = ''; playing.value = true
  try { await playPromptAudio(url.value, owner, message => { error.value = message; playing.value = false }, () => { playing.value = false }) }
  catch { error.value = 'Could not play the audio prompt. Try again.'; playing.value = false }
}
</script>
<template>
  <div v-if="url" class="audio-prompt">
    <div class="audio-prompt-controls">
      <button type="button" class="audio-prompt-button" aria-label="Play audio prompt" @click="play"><span aria-hidden="true">🔊</span> {{ playing ? 'Replay audio prompt' : 'Play audio prompt' }}</button>
      <button v-if="playing" type="button" class="audio-prompt-button" aria-label="Stop audio prompt" @click="stop">Stop</button>
    </div>
    <p v-if="url === demoAudioPrompt" class="audio-prompt-note">Demo audio: music sample, not a recording of this question.</p>
    <p v-if="error" role="status" class="audio-prompt-note">{{ error }}</p>
  </div>
</template>
<style scoped>
.audio-prompt-controls { display: flex; flex-wrap: wrap; gap: .5rem; }
.audio-prompt-button { min-height: 44px; padding: .6rem 1rem; color: var(--color-primary); background: white; border: 2px solid var(--activity-border); border-radius: 12px; cursor: pointer; font-weight: 700; }
.audio-prompt-note { margin: .5rem 0 0; font-size: .85rem; color: #52665d; }
</style>
