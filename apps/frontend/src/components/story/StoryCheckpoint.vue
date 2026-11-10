<script setup>
import { computed, nextTick, ref } from 'vue'
import StoryWords from './StoryWords.vue'
import { isCorrect } from '../../composables/storySession.js'
const props = defineProps({ step: Object, pinyin: Boolean })
const emit = defineEmits(['passed', 'mistake'])
const selected = ref([]), order = ref(props.step.options.map(o => o.id)), feedback = ref(''), dragged = ref(null), moveMessage = ref('')
const getOption = id => props.step.options.find(o => o.id === id)
const ready = computed(() => props.step.type === 'order' || selected.value.filter(Boolean).length === props.step.answer.length)
function select(id) {
  feedback.value = ''
  if (props.step.type !== 'blanks') selected.value = [id]
  else if (selected.value.includes(id)) selected.value[selected.value.indexOf(id)] = null
  else { const slot = selected.value.findIndex(v => !v); if (slot >= 0) selected.value[slot] = id; else if (selected.value.length < props.step.answer.length) selected.value.push(id) }
}
function check() {
  if (!ready.value) return
  const answer = props.step.type === 'order' ? [...order.value] : [...selected.value]
  if (isCorrect(props.step, answer)) emit('passed', answer)
  else { feedback.value = props.step.hint; emit('mistake') }
}
async function move(from, to, keyboard = false) {
  if (to < 0 || to >= order.value.length || from === to) return
  const [id] = order.value.splice(from, 1); order.value.splice(to, 0, id)
  feedback.value = ''; moveMessage.value = `Moved to position ${to + 1}`
  if (keyboard) { await nextTick(); document.getElementById(`move-${id}-${to === 0 ? 'down' : 'up'}`)?.focus() }
}
function drop(to) { if (dragged.value !== null) move(dragged.value, to); dragged.value = null }
</script>
<template>
  <section class="checkpoint" :aria-labelledby="`prompt-${step.id}`">
    <p class="checkpoint-label">{{ step.label }}</p>
    <h2 :id="`prompt-${step.id}`" tabindex="-1">{{ step.prompt }}</h2>
    <div v-if="step.type === 'blanks'" class="sentence-blanks">
      <StoryWords :words="step.before" :pinyin="pinyin" />
      <button class="blank" :aria-label="selected[0] ? 'Clear first blank' : 'First blank, choose a word below'" @click="selected[0] = null; feedback = ''"><StoryWords v-if="selected[0]" :words="getOption(selected[0]).words" :pinyin="pinyin" /><span v-else>1 ___</span></button>
      <StoryWords :words="step.between" :pinyin="pinyin" />
      <button class="blank" :aria-label="selected[1] ? 'Clear second blank' : 'Second blank, choose a word below'" @click="selected[1] = null; feedback = ''"><StoryWords v-if="selected[1]" :words="getOption(selected[1]).words" :pinyin="pinyin" /><span v-else>2 ___</span></button>
      <StoryWords :words="step.after" :pinyin="pinyin" />
    </div>
    <template v-if="step.type === 'order'">
      <p class="micro-hint">Drag to reorder, or use the arrow buttons.</p>
      <ol class="event-list">
        <li v-for="(id, i) in order" :key="id" draggable="true" @dragstart="dragged = i; $event.dataTransfer.setData('text/plain', id)" @dragend="dragged = null" @dragover.prevent @drop.prevent="drop(i)">
          <span class="event-number">{{ i + 1 }}</span><StoryWords :words="getOption(id).words" :pinyin="pinyin" />
          <span class="move-buttons"><button :id="`move-${id}-up`" :disabled="i === 0" :aria-label="`Move event ${i + 1} up`" @click="move(i, i - 1, true)">↑</button><button :id="`move-${id}-down`" :disabled="i === order.length - 1" :aria-label="`Move event ${i + 1} down`" @click="move(i, i + 1, true)">↓</button></span>
        </li>
      </ol>
      <span class="sr-only" role="status">{{ moveMessage }}</span>
    </template>
    <div v-else class="options" :class="{ compact: ['word', 'blanks'].includes(step.type) }" role="group" :aria-label="step.prompt">
      <button v-for="option in step.options" :key="option.id" class="choice" :class="{ selected: selected.includes(option.id) }" :aria-pressed="selected.includes(option.id)" @click="select(option.id)"><StoryWords :words="option.words" :pinyin="pinyin" /></button>
    </div>
    <p v-if="feedback" class="retry-feedback" role="status">Not quite. {{ feedback }}</p>
    <button class="check-answer" :disabled="!ready" @click="check">Check answer</button>
  </section>
</template>
<style scoped>
.checkpoint { padding: 1.1rem 0 1.25rem; border-top: 0; }
.checkpoint-label { text-transform: uppercase; letter-spacing: .12em; font-size: .65rem; color: var(--story-accent); margin: 0 0 .35rem; font-weight: 700; }
h2 { font-size: 1.05rem; line-height: 1.5; margin: 0 0 1rem; }
.options { display: grid; grid-template-columns: minmax(0, 1fr); gap: .5rem; }.options.compact { display: flex; flex-wrap: wrap; }
.choice, .blank { color: inherit; background: transparent; border: 1px solid var(--story-border); border-radius: .7rem; padding: .3rem .8rem; text-align: left; cursor: pointer; min-height: 44px; max-width: 100%; min-width: 0; }
.choice:hover, .blank:hover { border-color: var(--story-accent); }.choice.selected { background: #a8cf6a1a; border-color: var(--story-accent); color: var(--story-accent); }
.blank { border-style: dashed; margin: .2rem; min-width: 4rem; color: var(--story-accent); }
.sentence-blanks { margin-bottom: .8rem; }.micro-hint { font-size: .75rem; color: #a1b5bc; }
.event-list { padding: 0; list-style: none; display: grid; gap: .5rem; }
.event-list li { min-width: 0; display: flex; gap: .65rem; align-items: center; border: 1px solid var(--story-border); border-radius: .7rem; padding: .5rem; cursor: grab; }
.event-list :deep(.story-words) { font-size: 1rem; flex: 1; min-width: 0; }.event-number { color: #a1b5bc; font-size: .75rem; }
.move-buttons { display: flex; flex-direction: column; }.move-buttons button { background: transparent; color: inherit; border: 0; min-width: 44px; min-height: 32px; cursor: pointer; }.move-buttons button:disabled { opacity: .25; cursor: default; }
.check-answer { margin-top: .85rem; border: 0; background: var(--story-accent); color: #18251a; border-radius: .6rem; padding: .65rem 1.2rem; font-weight: 700; cursor: pointer; }
.check-answer:disabled { opacity: .4; cursor: not-allowed; }.retry-feedback { color: #f3cf91; font-size: .85rem; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
