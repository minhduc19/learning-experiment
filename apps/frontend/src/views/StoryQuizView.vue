<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowReactive, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { readingExercises } from '../data/readingExercises/index.js'
const route = useRoute()
const story = readingExercises.find(item => item.id === route.params.storyId) || readingExercises[0]
const speakerPalette = ['#9dd9c5', '#c4b5e8', '#eab99b', '#9fcbea', '#e4b0c4', '#d7cf96']
const speakerColors = Object.fromEntries(Object.keys(story.characters).map((id, index) => [id, speakerPalette[index % speakerPalette.length]]))
import { loadSession, saveSession } from '../composables/storySession.js'
import { readingTargetPhrases, loadLearnedPhrases } from '../utils/readingTargetPhrases.js'
import StoryWords from '../components/story/StoryWords.vue'
import StoryCheckpoint from '../components/story/StoryCheckpoint.vue'
let storage
try { storage = window.localStorage } catch {}
const session = ref(loadSession(story, storage))
const targetPhrases = readingTargetPhrases(story.steps)
const phraseStorageKey = `reading-exercises-learned-phrases:${story.id}`
const learnedPhrases = ref(loadLearnedPhrases(storage, phraseStorageKey))
const phraseSaveError = ref('')
function markPhraseLearned(phrase) {
  const updated = new Set(learnedPhrases.value).add(phrase)
  try {
    storage.setItem(phraseStorageKey, JSON.stringify([...updated]))
    learnedPhrases.value = updated
    phraseSaveError.value = ''
  } catch {
    phraseSaveError.value = 'Could not save your learned phrases in this browser. Please try again.'
  }
}
let savedPinyin = true
try { savedPinyin = storage?.getItem('reading-exercises-show-pinyin') !== 'false' } catch {}
const pinyin = ref(savedPinyin), settings = ref(false), definition = ref(null), storageError = ref(false), audioMessage = ref(''), playing = ref(null), endHeading = ref(null), continueAction = ref(null)
watch(pinyin, value => {
  try { storage?.setItem('reading-exercises-show-pinyin', String(value)) } catch {}
})
let savedInstructions = false
try { savedInstructions = storage?.getItem('reading-exercises-show-instructions') === 'true' } catch {}
const showInstructions = ref(savedInstructions)
watch(showInstructions, value => {
  try { storage?.setItem('reading-exercises-show-instructions', String(value)) } catch {}
})
const fontSizes = [
  { label: 'Small', value: '1.15rem' },
  { label: 'Medium', value: '1.35rem' },
  { label: 'Large', value: '1.6rem' },
  { label: 'Extra large', value: '1.85rem' },
]
let savedFontSize = '1.35rem'
try {
  const saved = storage?.getItem('reading-exercises-font-size')
  if (fontSizes.some(size => size.value === saved)) savedFontSize = saved
} catch {}
const fontSize = ref(savedFontSize)
watch(fontSize, value => {
  try { storage?.setItem('reading-exercises-font-size', value) } catch {}
})
const active = computed(() => story.steps[session.value.index])
const complete = computed(() => session.value.index === story.steps.length)
const visible = computed(() => story.steps.slice(0, Math.min(session.value.index + 1, story.steps.length)))
const canContinue = computed(() => active.value?.type === 'read' || !!session.value.answers[active.value?.id])
const checkpoints = shallowReactive({})
const needsAnswer = computed(() => !!active.value?.answer && !canContinue.value)
const actionEnabled = computed(() => canContinue.value || (needsAnswer.value && !!checkpoints[active.value.id]?.canCheck))
function setCheckpoint(id, instance) {
  if (instance) checkpoints[id] = instance
  else delete checkpoints[id]
}
function primaryAction() {
  if (needsAnswer.value) checkpoints[active.value.id]?.check()
  else advance()
}
const quizCount = story.steps.filter(s => s.answer).length
const solved = computed(() => Object.keys(session.value.answers).length)
watch(session, value => { storageError.value = !saveSession(story, value, storage) }, { deep: true })
async function passed(step, answer) { session.value.answers[step.id] = answer; await nextTick(); continueAction.value?.focus({ preventScroll: true }) }
let audioGeneration = 0
let pendingAutoplay = false
function stopAudio() { audioGeneration++; pendingAutoplay = false; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); playing.value = null }
function dismissDefinition(event) { if (!event.target.closest('.word-definition, .word-help')) definition.value = null }
function dismissOnEscape(event) { if (event.key === 'Escape') definition.value = null }
const storyFeed = ref(null)
const showScrollToBottom = ref(false)
let feedObserver
function updateScrollPosition() {
  showScrollToBottom.value = document.documentElement.scrollHeight - window.scrollY - window.innerHeight > 48
}
function scrollToBottom() {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
async function focusCurrent() {
  await nextTick()
  const target = complete.value ? endHeading.value : document.getElementById(`step-${active.value.id}`)
  const heading = target?.querySelector('h2') || target
  heading?.focus({ preventScroll: true })
  scrollToBottom()
}
async function advance() { if (!canContinue.value) return; stopAudio(); definition.value = null; session.value.index++; await focusCurrent() }
async function restart() { const wasOpening = session.value.index === 0; stopAudio(); session.value = { index: 0, answers: {}, mistakes: 0 }; definition.value = null; await focusCurrent(); if (wasOpening) autoplay() }
function playLines(lines, automatic = false) {
  stopAudio(); audioMessage.value = ''
  if (!lines.length) return
  if (!('speechSynthesis' in window)) { audioMessage.value = 'Audio is unavailable in this browser.'; return }
  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find(v => /^zh[-_]CN/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang))
  if (!voice) { pendingAutoplay = automatic; audioMessage.value = 'No Chinese voice is available on this device. You can still read the story.'; return }
  const generation = audioGeneration
  function play(index) {
    if (generation !== audioGeneration || index >= lines.length) return
    const line = lines[index]
    const utterance = new SpeechSynthesisUtterance(line.words.map(w => w.text).join(''))
    utterance.lang = 'zh-CN'; utterance.voice = voice; utterance.rate = .85
    utterance.onend = () => { if (generation !== audioGeneration) return; playing.value = null; play(index + 1) }
    utterance.onerror = event => {
      if (generation !== audioGeneration) return
      playing.value = null
      if (event.error === 'not-allowed' && automatic) { pendingAutoplay = true; audioMessage.value = 'Audio will start after your next interaction.' }
      else if (!['canceled', 'interrupted'].includes(event.error)) audioMessage.value = 'Audio could not play. Please try again.'
    }
    playing.value = line.id; window.speechSynthesis.speak(utterance)
  }
  play(0)
}
function speak(line) { playLines([line]) }
function autoplay() { playLines(active.value?.type === 'read' ? active.value.lines.filter(line => line.speaker) : [], true) }
function retryAutoplay() { if (pendingAutoplay) autoplay() }
watch(() => session.value.index, autoplay, { flush: 'sync' })
onMounted(() => {
  document.addEventListener('click', dismissDefinition)
  document.addEventListener('keydown', dismissOnEscape)
  document.addEventListener('pointerdown', retryAutoplay)
  document.addEventListener('keydown', retryAutoplay)
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', retryAutoplay)
  autoplay()
  focusCurrent()
  // Follow new passages, answer feedback, and text reflow without locking manual scrolling.
  feedObserver = new ResizeObserver(() => {
    if (!showScrollToBottom.value) scrollToBottom()
    else updateScrollPosition()
  })
  feedObserver.observe(storyFeed.value)
  window.addEventListener('scroll', updateScrollPosition, { passive: true })
  window.addEventListener('resize', updateScrollPosition)
})
onBeforeUnmount(() => {
  feedObserver?.disconnect()
  window.removeEventListener('scroll', updateScrollPosition)
  window.removeEventListener('resize', updateScrollPosition)
  stopAudio()
  document.removeEventListener('click', dismissDefinition)
  document.removeEventListener('keydown', dismissOnEscape)
  document.removeEventListener('pointerdown', retryAutoplay)
  document.removeEventListener('keydown', retryAutoplay)
  if ('speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', retryAutoplay)
})
</script>
<template>
  <main class="story-player" :class="{ 'without-pinyin': !pinyin }" :style="{ '--story-font-size': fontSize }">
    <header class="story-topbar"><div class="topbar-inner">
      <RouterLink :to="{ name: 'reading-exercises' }" class="exit" aria-label="Exit story">×</RouterLink>
      <div class="progress-wrap"><div class="progress-meta"><span>STORY · BEGINNER</span><span>{{ Math.round(session.index / story.steps.length * 100) }}%</span></div><progress :value="session.index" :max="story.steps.length" aria-label="Story progress" /></div>
      <button class="settings-button" :aria-expanded="settings" aria-controls="story-settings" aria-label="Story settings" @click="settings = !settings">⚙︎</button>
    </div>
    <div v-if="settings" id="story-settings" class="story-settings"><label><input v-model="pinyin" type="checkbox"> Show pinyin</label><label><input v-model="showInstructions" type="checkbox"> Show instructions</label><div class="font-size-setting"><label for="story-font-size">Font size</label><select id="story-font-size" v-model="fontSize"><option v-for="size in fontSizes" :key="size.value" :value="size.value">{{ size.label }}</option></select></div><p v-if="showInstructions">Tap underlined story words for meanings. Audio uses your device’s Chinese voice.</p><button @click="restart(); settings = false">Restart story</button></div>
    </header>
    <div ref="storyFeed" class="story-feed">
      <section class="story-cover" aria-labelledby="story-title"><span class="cover-art" aria-hidden="true">☂<span>茶</span></span><p class="story-kicker">{{ story.tagline || 'A SMALL ACT OF KINDNESS' }}</p><p v-if="pinyin" class="title-pinyin">{{ story.pinyin }}</p><h1 id="story-title">{{ story.title }}</h1><p class="story-subtitle">{{ story.translation }}</p><span class="story-meta">{{ quizCount }} checkpoints · Read & listen</span></section>
      <p v-if="storageError" class="notice" role="status">Progress could not be saved. Keep this page open to continue your session.</p>
      <section v-for="(step, index) in visible" :id="`step-${step.id}`" :key="step.id" class="story-step" tabindex="-1" :aria-label="step.type === 'read' ? `Story passage ${index + 1}` : step.label">
        <template v-if="step.type === 'read'">
          <h2 v-if="step.title" class="act-title">{{ step.title }}</h2>
          <article v-for="line in step.lines" :key="line.id" class="story-line" :class="{ dialogue: line.speaker }" :style="line.speaker ? { '--speaker-color': speakerColors[line.speaker] } : undefined">
            <span v-if="line.speaker" class="avatar"  aria-hidden="true">{{ story.characters[line.speaker].avatar }}</span>
            <div class="line-body"><span v-if="line.speaker" class="speaker-name">{{ story.characters[line.speaker].name }}</span><div class="line-content"><button class="audio-button" :aria-label="`Listen to ${line.speaker ? story.characters[line.speaker].name : 'narrator'}: ${line.words.map(w => w.text).join('')}`" :aria-pressed="playing === line.id" @click="playing === line.id ? stopAudio() : speak(line)">{{ playing === line.id ? '■' : '▶︎' }}</button><StoryWords :words="line.words" :pinyin="pinyin" interactive @define="definition = $event" /></div></div>
          </article>
        </template>
        <div v-else-if="session.answers[step.id]" class="solved-checkpoint" role="status"><span class="success-mark">✓</span><div><p class="checkpoint-caption">{{ step.label }} · Complete</p><p>{{ step.explanation }}</p></div></div>
        <StoryCheckpoint v-else :ref="instance => setCheckpoint(step.id, instance)" :step="step" :pinyin="pinyin" :show-instructions="showInstructions" @passed="passed(step, $event)" @mistake="session.mistakes++" />
      </section>
      <section v-if="complete" ref="endHeading" class="story-summary" tabindex="-1"><span class="end-mark" aria-hidden="true">✦</span><p class="story-kicker">THE END</p><h2>Story complete!</h2><p>You followed the story and completed {{ solved }} of {{ quizCount }} checkpoints.</p><p>{{ session.mistakes === 0 ? 'Every answer correct on the first try.' : `${session.mistakes} ${session.mistakes === 1 ? 'retry' : 'retries'} — you kept learning along the way.` }}</p><section v-if="targetPhrases.length" class="target-phrases" aria-labelledby="target-phrases-heading">
        <h3 id="target-phrases-heading">Target phrases</h3>
        <p>Review what you practiced. Learned status is saved in this browser.</p>
        <ul><li v-for="phrase in targetPhrases" :key="phrase">
          <span lang="zh">{{ phrase }}</span>
          <button class="learn-phrase" :disabled="learnedPhrases.has(phrase)" :aria-label="`${learnedPhrases.has(phrase) ? 'Learned' : 'Mark as learned'}: ${phrase}`" @click="markPhraseLearned(phrase)">{{ learnedPhrases.has(phrase) ? '✓ Learned' : 'Mark as learned' }}</button>
        </li></ul>
        <p v-if="phraseSaveError" role="alert">{{ phraseSaveError }}</p>
        <p role="status">{{ targetPhrases.filter(phrase => learnedPhrases.has(phrase)).length }} / {{ targetPhrases.length }} phrases learned</p>
      </section><button class="primary-action" @click="restart">Read again</button><RouterLink :to="{ name: 'reading-exercises' }">Explore activities →</RouterLink></section>
    </div>
    <aside v-if="definition" class="word-definition" aria-label="Word meaning"><div><strong lang="zh">{{ definition.text }}</strong><span><template v-if="definition.pinyin">{{ definition.pinyin }} · </template>{{ definition.meaning }}</span></div><button aria-label="Close word meaning" @click="definition = null">×</button></aside>
    <aside v-if="audioMessage && !definition" class="word-definition" role="status"><span>{{ audioMessage }}</span><button aria-label="Dismiss audio message" @click="audioMessage = ''">×</button></aside>
    <footer v-if="!complete || showScrollToBottom" class="story-bottom"><div class="bottom-inner"><button v-if="showScrollToBottom" class="scroll-to-bottom" aria-label="Scroll to bottom of story" @click="scrollToBottom"><span aria-hidden="true">↓</span></button><span v-else class="bottom-status">{{ active?.type === 'read' ? 'Read at your own pace' : canContinue ? '✓ Nicely done' : 'A quick story check' }}</span><button v-if="!complete" ref="continueAction" class="primary-action" :disabled="!actionEnabled" @click="primaryAction">{{ needsAnswer ? 'Check answer' : session.index === story.steps.length - 1 ? 'Finish story' : 'Continue' }} <span v-if="!needsAnswer" aria-hidden="true">→</span></button></div></footer>
  </main>
</template>
<style scoped>
.story-player { --story-bg: #142229; --story-border: #344a53; --story-accent: #b5db7d; min-height: 100dvh; color: #e8eff0; background: var(--story-bg); padding-bottom: calc(110px + env(safe-area-inset-bottom)); }
.story-player :deep(button:focus-visible), .story-player :deep(a:focus-visible) { outline: 2px solid #b5db7d; outline-offset: 4px; }.story-step:focus, .story-summary:focus { outline: none; }
.story-topbar { position: sticky; top: 0; z-index: 10; background: #142229f5; border-bottom: 1px solid var(--story-border); backdrop-filter: blur(8px); }.topbar-inner { max-width: 43rem; display: flex; align-items: center; gap: 1.25rem; padding: 1rem 1.25rem; margin: auto; }
.exit, .settings-button { background: transparent; border: 0; color: #b5c6cb; text-decoration: none; font-size: 1.6rem; cursor: pointer; min-width: 44px; text-align: center; }.progress-wrap { flex: 1; }.progress-meta { display: flex; justify-content: space-between; font-size: .6rem; letter-spacing: .12em; color: #a1b5bc; margin-bottom: .45rem; }
progress { display: block; width: 100%; height: .45rem; border: 0; border-radius: 1rem; overflow: hidden; background: #344a53; accent-color: var(--story-accent); }progress::-webkit-progress-bar { background: #344a53; }progress::-webkit-progress-value { background: var(--story-accent); border-radius: 1rem; }progress::-moz-progress-bar { background: var(--story-accent); }
.story-settings { max-width: 39rem; margin: 1rem auto; padding: 1rem 1.5rem; background: #20343d; border-radius: .75rem; font-size: .85rem; }.story-settings label { display: flex; align-items: center; gap: .65rem; min-height: 44px; cursor: pointer; }.story-settings input { width: 20px; height: 20px; accent-color: var(--story-accent); }.story-settings p { color: #a1b5bc; }.story-settings button { background: transparent; color: var(--story-accent); border: 1px solid var(--story-border); padding: .5rem; border-radius: .5rem; cursor: pointer; }
.story-feed { max-width: 39rem; margin: auto; padding: 0 1.5rem; }.story-cover { text-align: center; padding: 2.5rem 0 2rem; }.cover-art { width: 88px; height: 88px; background: #314e4c; border: 1px solid #56746a; border-radius: 1.5rem; display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #b5db7d; position: relative; transform: rotate(-5deg); }.cover-art span { font-size: .9rem; position: absolute; right: 12px; bottom: 8px; color: #d5e8cb; }
.story-kicker { font-size: .6rem; letter-spacing: .17em; color: var(--story-accent); margin-top: 1.5rem; }.title-pinyin { color: #a1b5bc; font-size: .85rem; margin: 1rem 0 .25rem; }h1 { font-size: clamp(1.8rem, 6vw, 2.5rem); margin: .25rem 0; letter-spacing: .04em; }.story-subtitle { color: #a1b5bc; margin: .5rem 0; font-size: .9rem; }.story-meta { font-size: .7rem; color: #a1b5bc; }
.story-step { scroll-margin-top: 110px; margin-bottom: 1rem; }.story-line { display: flex; gap: .7rem; margin-bottom: 1rem; align-items: flex-start; }.line-body { min-width: 0; flex: 1; }.dialogue .line-body { border: 1px solid var(--story-border); background: #192b33; border-radius: .9rem; padding: .8rem 1rem; }.avatar { flex-shrink: 0; width: 36px; height: 40px; display: grid; place-items: center; border-radius: 40% 40% 35% 35%; color: #10231c; margin-top: .5rem; font-weight: 700; }.speaker-name { display: block; font-size: .65rem; color: #a1b5bc; margin-bottom: .5rem; }.line-content { display: flow-root; }.audio-button { float: left; min-width: 32px; min-height: 44px; margin-right: .4rem; margin-top: .15rem; padding: 0; border: 0; background: none; color: #75cbee; cursor: pointer; font-size: 1rem; }
.solved-checkpoint { display: flex; gap: .75rem; border-block: 0; padding: .85rem 0; font-size: .8rem; color: #bacbd1; }.solved-checkpoint p { margin: .2rem 0; }.checkpoint-caption { font-size: .65rem; color: var(--story-accent); }.success-mark { color: var(--story-accent); }.notice { padding: .75rem; border: 1px solid var(--story-border); border-radius: .5rem; font-size: .8rem; color: #f3cf91; }
.story-bottom { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; background: #1b2f38f7; border-top: 1px solid var(--story-border); padding: .75rem 1.25rem calc(.75rem + env(safe-area-inset-bottom)); }.bottom-inner { max-width: 36rem; margin: auto; display: flex; align-items: center; gap: 1rem; justify-content: space-between; }.bottom-status { font-size: .75rem; color: #b5c6cb; }.primary-action { white-space: nowrap; flex-shrink: 0; background: var(--story-accent); border: 0; border-radius: .65rem; color: #18251a; padding: .8rem 1.25rem; font-weight: 750; cursor: pointer; min-height: 44px; }.primary-action:disabled { opacity: .35; cursor: not-allowed; }.primary-action span { margin-left: 1rem; }.story-summary { text-align: center; border-top: 1px solid var(--story-border); padding: 2rem 0; scroll-margin-top: 110px; }.story-summary h2 { font-size: 1.8rem; }.story-summary p { color: #b5c6cb; }.story-summary a { display: block; color: var(--story-accent); margin-top: 1.5rem; }.end-mark { color: var(--story-accent); font-size: 3rem; }
.scroll-to-bottom { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--story-accent); border-radius: 50%; background: transparent; color: var(--story-accent); font-size: 1.5rem; cursor: pointer; }
.word-definition { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(90px + env(safe-area-inset-bottom)); z-index: 12; width: min(90%, 34rem); border: 1px solid #658483; background: #2b454c; box-shadow: 0 8px 20px #0004; padding: .8rem 1rem; border-radius: .75rem; display: flex; gap: 1rem; justify-content: space-between; }.word-definition strong { margin-right: .75rem; }.word-definition span { font-size: .85rem; color: #d0dfe2; }.word-definition button { color: white; background: none; border: 0; font-size: 1.3rem; cursor: pointer; min-width: 32px; }
@media (max-width: 420px) { .story-feed { padding: 0 1rem; }.topbar-inner { gap: .5rem; padding-inline: .75rem; }.dialogue .line-body { padding: .65rem; }.story-line { gap: .5rem; }.bottom-status { max-width: 8rem; }.story-cover { padding-top: 2rem; } }
.act-title { font-size: 1rem; color: var(--story-accent); margin: 2rem 0 1.25rem; }
/* Continuous transcript: speaker identity sits above an open dialogue rail. */
.dialogue .line-body { border: 0; background: transparent; border-radius: 0; padding: 0; }
.dialogue .line-content { border-left: 2px solid var(--speaker-color, var(--story-accent)); padding-left: .7rem; }
.avatar { width: 38px; height: 42px; border-radius: .55rem; background: #20343d; color: #b5c6cb; margin-top: 0; }
.speaker-name { font-size: 1rem; font-weight: 750; color: var(--speaker-color, var(--story-accent)); margin-bottom: .25rem; }
.story-line:not(.dialogue) { padding-left: 3.05rem; }
.story-line :deep(.story-words) { font-size: var(--story-font-size); line-height: 1.85; }
@media (max-width: 420px) { .story-line:not(.dialogue) { padding-left: 2.875rem; } }
.story-settings select { min-height: 44px; padding: .4rem .65rem; border: 1px solid #658483; border-radius: .5rem; background: #142229; color: #e8eff0; font: inherit; }
.story-settings .font-size-setting { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.target-phrases { text-align: left; margin: 2rem 0; padding-block: 1rem; border-block: 1px solid var(--story-border); }
.target-phrases h3 { margin-top: 0; }
.target-phrases p { font-size: .85rem; }
.target-phrases ul { list-style: none; padding: 0; }
.target-phrases li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding: .75rem 0; }
.target-phrases li > span { min-width: 0; overflow-wrap: anywhere; font-size: 1.2rem; }
.learn-phrase { min-height: 44px; padding: .6rem .8rem; border: 1px solid var(--story-accent); border-radius: .65rem; background: transparent; color: var(--story-accent); cursor: pointer; }
.learn-phrase:disabled { border-color: var(--story-border); color: #b5c6cb; cursor: default; }
</style>
