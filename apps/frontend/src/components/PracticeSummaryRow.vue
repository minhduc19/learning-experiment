<script setup>
import { RouterLink } from 'vue-router'
import VocabularyProgressControls from './VocabularyProgressControls.vue'

defineProps({
  target: { type: Object, required: true },
  resource: { type: String, required: true },
})
</script>

<template>
  <div class="practice-summary-row">
    <RouterLink class="practice-summary-word" :to="`/${resource}/${target.id}`">
      <span class="practice-summary-pinyin">{{ target.pinyin }}</span>
      <span lang="zh-Hant">{{ target.traditional || target.original }}</span>
      <small lang="zh-Hans">{{ target.simplified || target.original }}</small>
    </RouterLink>
    <span class="practice-summary-points">Practice: <strong>{{ target.practice }}</strong> (+{{ target.earned }})</span>
    <VocabularyProgressControls
      :entry="target"
      :resource="resource"
      :id-field="resource === 'characters' ? 'character_id' : 'segment_id'"
      :label="`Learning marks for ${resource === 'characters' ? 'character' : 'segment'} ${target.traditional || target.original}`"
    />
  </div>
</template>
