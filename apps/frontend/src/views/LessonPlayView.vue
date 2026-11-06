<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import MultipleChoiceActivity from '../components/MultipleChoiceActivity.vue'
import { authorizedFetch } from '../composables/useAuth'
const route=useRoute(), attempt=ref(null), answers=ref([]), result=ref(null), busy=ref(false), error=ref(''), retry=ref(null)
const items=computed(()=>attempt.value?.document.items.map(item=>item.data) || [])
const controller=new AbortController()
async function request(path,body) {
  const response=await authorizedFetch(path,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
  const data=await response.json().catch(()=>null)
  if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:'Lesson request failed. Try again.')
  return data
}
async function start(){if(busy.value)return;busy.value=true;error.value='';retry.value=start;try{const saved=await request(`/api/lessons/${route.params.lessonId}/attempts`);answers.value=[];result.value=null;attempt.value=saved}catch(failure){if(!controller.signal.aborted)error.value=failure.message}finally{busy.value=false}}
function answered(answer){answers.value[answer.index]={item_id:attempt.value.document.items[answer.index].id,option_id:answer.optionId}}
async function finish(){if(busy.value)return;busy.value=true;error.value='';retry.value=finish;try{result.value=await request(`/api/lessons/attempts/${attempt.value.id}/complete`,{answers:answers.value})}catch(failure){if(!controller.signal.aborted)error.value=failure.message}finally{busy.value=false}}
onMounted(start);onUnmounted(()=>controller.abort())
</script>
<template>
  <MultipleChoiceActivity v-if="attempt" :key="attempt.id" :items="items" translation-label="Translation" :restart-handler="start" :completion-busy="busy" @answered="answered" @completed="finish">
    <template #completion>
      <p v-if="busy" role="status">Saving practice points…</p>
      <p v-if="error" class="corpus-error" role="alert">{{ error }} <button class="corpus-text-button" :disabled="busy" @click="retry()">Retry</button></p>
      <section v-if="result" class="lesson-practice-summary"><h2>Practice summary</h2><p>Practice points are saved.</p><section v-for="kind in ['characters','segments']" :key="kind"><h3>{{ kind==='characters'?'Characters':'Segments' }}</h3><p v-if="!result[kind].length">No resolved targets.</p><ul><li v-for="target in result[kind]" :key="target.id"><RouterLink :to="`/${kind}/${target.id}`">{{ target.traditional || target.original }} <small>{{ target.simplified }}</small></RouterLink> · Learned: {{ target.learned?'Yes':'No' }} · Learning: {{ target.learning?'Yes':'No' }} · Practice: {{ target.practice }} (+{{ target.earned }})</li></ul></section><p v-for="(target,i) in result.unresolved" :key="i" class="corpus-resume-note">{{ target.text }}: {{ target.reason }}. No points awarded for this target.</p><RouterLink to="/lessons">My lessons</RouterLink></section>
    </template>
  </MultipleChoiceActivity>
  <main v-else class="page corpus-page"><p v-if="busy" role="status">Loading lesson…</p><p v-if="error" class="corpus-error" role="alert">{{ error }} <button class="corpus-text-button" :disabled="busy" @click="start">Retry</button></p><RouterLink to="/lessons">← My lessons</RouterLink></main>
</template>
