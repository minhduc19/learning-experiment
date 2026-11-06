<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import MultipleChoiceActivity from '../components/MultipleChoiceActivity.vue'
import { authorizedFetch } from '../composables/useAuth'
const route=useRoute(), attempt=ref(null), index=ref(0), answers=ref([]), selected=ref(null), result=ref(null), busy=ref(false), error=ref('')
const controller=new AbortController()
async function request(path,body) {
  const response=await authorizedFetch(path,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
  const data=await response.json().catch(()=>null)
  if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:'Lesson request failed. Try again.')
  return data
}
async function start(){busy.value=true;error.value='';try{attempt.value=await request(`/api/lessons/${route.params.lessonId}/attempts`);index.value=0;answers.value=[];selected.value=null;result.value=null}catch(failure){if(!controller.signal.aborted)error.value=failure.message}finally{busy.value=false}}
async function next(){if(!selected.value||busy.value)return;answers.value.push({item_id:attempt.value.document.items[index.value].id,option_id:selected.value.optionId});selected.value=null;if(index.value+1<attempt.value.document.items.length)index.value++;else await finish()}
async function finish(){busy.value=true;error.value='';try{result.value=await request(`/api/lessons/attempts/${attempt.value.id}/complete`,{answers:answers.value})}catch(failure){if(!controller.signal.aborted)error.value=failure.message}finally{busy.value=false}}
onMounted(start);onUnmounted(()=>controller.abort())
</script>
<template><main class="page corpus-page"><RouterLink to="/lessons">← My lessons</RouterLink><h1>{{ attempt?.document.title || 'Play lesson' }}</h1><p v-if="error" class="corpus-error" role="alert">{{ error }} <button class="corpus-text-button" :disabled="busy" @click="answers.length===attempt?.document.items.length ? finish() : start()">Retry</button></p><p v-if="busy" role="status">{{ answers.length ? 'Saving practice points…' : 'Loading lesson…' }}</p>
  <template v-if="attempt && !result && answers.length < attempt.document.items.length"><p>Question {{ index+1 }} of {{ attempt.document.items.length }} · Your first checked answer counts.</p><MultipleChoiceActivity :key="attempt.document.items[index].id" :items="[attempt.document.items[index].data]" embedded assessment translation-label="Translation" @answered="selected=$event"/><button v-if="selected" class="button" :disabled="busy" @click="next">{{ index+1===attempt.document.items.length ? 'Finish lesson' : 'Next question' }}</button></template>
  <section v-if="result"><h2>Lesson complete</h2><p>{{ result.correct }} correct · {{ result.incorrect }} incorrect</p><p>Practice points are saved. Repeated correct questions for the same target each earn a point.</p><section v-for="kind in ['characters','segments']" :key="kind"><h3>{{ kind==='characters'?'Characters':'Segments' }}</h3><p v-if="!result[kind].length">No resolved targets.</p><ul><li v-for="target in result[kind]" :key="target.id"><RouterLink :to="`/${kind}/${target.id}`">{{ target.traditional || target.original }} <small>{{ target.simplified }}</small></RouterLink> · Learned: {{ target.learned?'Yes':'No' }} · Learning: {{ target.learning?'Yes':'No' }} · Practice: {{ target.practice }} (+{{ target.earned }})</li></ul></section><p v-for="(target,i) in result.unresolved" :key="i" class="corpus-resume-note">{{ target.text }}: {{ target.reason }}. No points awarded for this target.</p><button class="button" :disabled="busy" @click="start">Practice again</button></section>
</main></template>
