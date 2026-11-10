<script setup>
import { computed, nextTick, ref } from 'vue'
import MultipleChoiceActivity from './MultipleChoiceActivity.vue'
import ReadingView from '../views/ReadingView.vue'
import Jumble from '../views/SampleSentenceJumpleView.vue'
import Listening from '../views/ListenChooseWordView.vue'
import Matching from '../views/SampleMatchingPairView.vue'
const props = defineProps({ lesson:{type:Object,required:true}, completionBusy:Boolean, restartHandler:{type:Function,default:null} })
const emit = defineEmits(['completed'])
const index = ref(0), answers = ref([]), selected = ref(null), heading = ref(null), container = ref(null)
const item = computed(()=>props.lesson.items[index.value])
async function next(answer) {
  answers.value.push({item_id:item.value.id, ...answer})
  index.value++
  selected.value = null
  if (!item.value) emit('completed', answers.value)
  await nextTick()
  const nextHeading = heading.value ?? container.value?.querySelector('h1')
  if (nextHeading) { nextHeading.tabIndex=-1; nextHeading.focus() }
}
function restart() {
  if (props.restartHandler) return props.restartHandler()
  index.value=0;answers.value=[];selected.value=null
}
</script>
<template>
  <div ref="container" class="mixed-lesson">
    <header class="mixed-progress activity">
      <div role="status">{{ lesson.title }} · {{ index }} / {{ lesson.items.length }} activities completed</div>
      <progress class="activity-progress" :value="index" :max="lesson.items.length" aria-label="Lesson progress" />
    </header>
    <template v-if="item">
      <MultipleChoiceActivity v-if="item.type==='multiple-choice'" :key="item.id" :items="[item.data]" lesson-mode @answered="selected=$event.optionId" @completed="next({option_id:selected})" />
      <ReadingView v-else-if="item.type==='reading'" :key="item.id" :document="item.data" lesson-mode @completed="next({answer:$event})" />
      <Jumble v-else-if="item.type==='sentence-jumble'" :key="item.id" :items="[item.data]" lesson-mode @completed="next({answer:$event})" />
      <Listening v-else-if="item.type==='listence-choose-word'" :key="item.id" :items="[item.data]" lesson-mode @completed="next({answer:$event})" />
      <Matching v-else-if="item.type==='matching-pairs'" :key="item.id" :activity="item.data" lesson-mode @completed="next({answer:$event})" />
    </template>
    <main v-else class="activity page activity-finish">
      <h1 ref="heading" tabindex="-1">Lesson complete!</h1><p>You completed all {{ lesson.items.length }} activities.</p>
      <slot name="completion" />
      <button class="button" :disabled="completionBusy" @click="restart">Practice again</button>
    </main>
  </div>
</template>
<style scoped>
.mixed-lesson { display:flex; flex-direction:column; height:100dvh; }
.mixed-progress { flex:none; padding:.5rem 1rem; background:#e9f3ed; color:#163b35; font-weight:600; }
.mixed-progress .activity-progress { height:12px; margin:.5rem 0 0; }
.mixed-lesson :deep(.activity-screen) { flex:1; min-height:0; height:auto; grid-template-rows:minmax(0,1fr) auto; }
.mixed-lesson :deep(.activity-has-feedback) { flex:1 0 auto; grid-template-rows:minmax(min-content,1fr) auto; }
</style>
