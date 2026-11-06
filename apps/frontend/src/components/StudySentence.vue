<script setup>
import { RouterLink } from 'vue-router'
defineProps({ sentence: { type: Object, required: true }, expanded: Boolean, focus: { type: String, default: '' } })
</script>
<template>
  <div class="study-sentence">
    <p class="corpus-sentence-meta"><RouterLink :to="`/my-stories/${sentence.story_id}`">{{ sentence.story_title }}</RouterLink><span>Sentence {{ sentence.sentence_position + 1 }}{{ sentence.is_excerpt ? ' · excerpt' : '' }}</span></p>
    <p class="corpus-sentence-text" lang="zh-Hant">{{ sentence.traditional_text }}</p><p class="corpus-sentence-simplified" lang="zh-Hans">{{ sentence.simplified_text }}</p>
    <details :open="expanded"><summary>Sentence segments · traditional / simplified</summary><ol class="study-segments"><li v-for="segment in sentence.segments" :key="segment.position" :class="{ 'study-target': focus && segment.text.includes(focus) }"><span lang="zh-Hant">{{ segment.traditional_text }}</span><small lang="zh-Hans">{{ segment.simplified_text }}</small></li></ol></details>
  </div>
</template>
