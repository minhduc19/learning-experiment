<script setup>
import { ref,onMounted } from 'vue'
import { RouterLink,useRoute } from 'vue-router'
import { authorizedFetch } from '../composables/useAuth'
import { useCorpusPage } from '../composables/useCorpusPage'
import CorpusSentences from '../components/CorpusSentences.vue'
const route=useRoute(),segment=ref(null),error=ref(''),sentences=useCorpusPage(20)
onMounted(async()=>{try{const response=await authorizedFetch('/api/corpus/segments/'+route.params.segmentId);if(!response.ok)throw new Error('Segment unavailable.');segment.value=await response.json();sentences.reset(`/api/corpus/segments/${segment.value.id}/sentences`)}catch(failure){error.value=failure.message}})
</script>
<template><main class="page corpus-page"><RouterLink to="/characters">← Characters</RouterLink><p v-if="error" role="alert">{{ error }}</p><template v-if="segment"><h1>{{ segment.traditional_text }} <small>{{ segment.simplified_text }}</small></h1><p>Learned: {{ segment.learned?'Yes':'No' }} · Learning: {{ segment.learning?'Yes':'No' }} · Practice: {{ segment.practice }}</p><div class="cluster"><RouterLink v-for="character in segment.characters" :key="character.id" :to="`/characters/${character.id}`">{{ character.traditional_value }} {{ character.simplified_value }}</RouterLink></div><CorpusSentences :resource="sentences" /></template></main></template>
