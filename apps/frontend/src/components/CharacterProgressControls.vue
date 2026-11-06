<script setup>
import VocabularyProgressControls from './VocabularyProgressControls.vue'
import { characterLabel } from '../composables/useCorpusPage'
defineProps({ character: { type: Object, required: true } })
defineEmits(['saved'])
</script>
<template>
  <VocabularyProgressControls :entry="character" resource="characters" id-field="character_id" :label="`Learning marks for ${characterLabel(character.traditional_value || character.value)}`" @saved="$emit('saved')" />
</template>
