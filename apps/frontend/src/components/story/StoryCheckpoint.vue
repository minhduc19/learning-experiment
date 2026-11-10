<script setup>
import { computed, nextTick, ref } from 'vue'
import Draggable from 'vuedraggable'
import StoryWords from './StoryWords.vue'
import { isCorrect } from '../../composables/storySession.js'
const props = defineProps({ step: Object, pinyin: Boolean })
const emit = defineEmits(['passed', 'mistake'])
const selected = ref([]), order = ref(props.step.options.map(o => o.id)), feedback = ref(''), sorting = ref(false), moveMessage = ref('')
const getOption = id => props.step.options.find(o => o.id === id)
const canCheck = computed(() => !sorting.value && (props.step.type === 'order' || selected.value.filter(Boolean).length === props.step.answer.length))
defineExpose({ canCheck, check })
function select(id) {
  feedback.value = ''
  if (props.step.type !== 'blanks') selected.value = [id]
  else if (selected.value.includes(id)) selected.value[selected.value.indexOf(id)] = null
  else { const slot = selected.value.findIndex(v => !v); if (slot >= 0) selected.value[slot] = id; else if (selected.value.length < props.step.answer.length) selected.value.push(id) }
}
function check() {
  if (!canCheck.value) return
  const answer = props.step.type === 'order' ? [...order.value] : [...selected.value]
  if (isCorrect(props.step, answer)) emit('passed', answer)
  else { feedback.value = props.step.hint; emit('mistake') }
}
async function move(from, to, keyboard = false) {
  if (to < 0 || to >= order.value.length || from === to) return
  const [id] = order.value.splice(from, 1); order.value.splice(to, 0, id)
  feedback.value = ''; moveMessage.value = `Moved to position ${to + 1}`
  if (keyboard) { await nextTick(); document.getElementById(`event-${props.step.id}-${id}`)?.focus() }
}
function reordered({ moved }) {
  if (!moved) return
  feedback.value = ''
  moveMessage.value = `Moved to position ${moved.newIndex + 1}`
}
function keyboardMove(event, index) {
  if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  move(index, index + (event.key === 'ArrowUp' ? -1 : 1), true)
}
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
      <p :id="`order-help-${step.id}`" class="micro-hint">Drag and drop the boxes to reorder. Keyboard: focus a box and press Alt + Up/Down.</p>
      <Draggable v-model="order" tag="ol" class="event-list" :item-key="id => id"
        :animation="180" :force-fallback="true" :fallback-tolerance="5"
        :delay="150" :delay-on-touch-only="true" :touch-start-threshold="5"
        ghost-class="event-placeholder" drag-class="event-dragging"
        :aria-label="step.prompt" :aria-describedby="`order-help-${step.id}`"
        @start="sorting = true" @end="sorting = false" @change="reordered">
        <template #item="{ element: id, index: i }">
          <li :id="`event-${step.id}-${id}`" tabindex="0" :aria-describedby="`order-help-${step.id}`" @keydown="keyboardMove($event, i)">
            <span class="event-number">{{ i + 1 }}</span><StoryWords :words="getOption(id).words" :pinyin="pinyin" />
            <span class="drag-grip" aria-hidden="true">⠿</span>
          </li>
        </template>
      </Draggable>
      <span class="sr-only" role="status">{{ moveMessage }}</span>
    </template>
    <div v-else class="options" :class="{ compact: ['word', 'blanks'].includes(step.type) }" role="group" :aria-label="step.prompt">
      <button v-for="option in step.options" :key="option.id" class="choice" :class="{ selected: selected.includes(option.id) }" :aria-pressed="selected.includes(option.id)" @click="select(option.id)"><StoryWords :words="option.words" :pinyin="pinyin" /></button>
    </div>
    <p v-if="feedback" class="retry-feedback" role="status">Not quite. {{ feedback }}</p>
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
.drag-grip { color: #a1b5bc; font-size: 1.35rem; padding: .25rem .5rem; }
.event-list li { min-height: 64px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.event-list li:focus-visible { outline: 2px solid var(--story-accent); outline-offset: 3px; }
.event-list .event-placeholder { opacity: .3; border-style: dashed; border-color: var(--story-accent); }
.event-list .event-dragging { cursor: grabbing; background: var(--story-bg, #14252c); border-color: var(--story-accent); }
.retry-feedback { color: #f3cf91; font-size: .85rem; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
