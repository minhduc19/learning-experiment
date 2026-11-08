<script setup>
import MixedLessonPlayer from './MixedLessonPlayer.vue'
import MultipleChoiceActivity from './MultipleChoiceActivity.vue'
defineProps({ lesson: { type: Object, required: true } })
</script>
<template>
  <section aria-label="Live lesson preview"><h2>{{ lesson.title }}</h2><p class="corpus-muted">{{ lesson.items.length }} items · shown in saved order. Try the questions below.</p>
    <MixedLessonPlayer v-if="lesson.items.some(item=>item.type!=='multiple-choice')" :lesson="lesson" />
    <template v-else><article v-for="(item,index) in lesson.items" :key="item.id" class="lesson-preview-item"><p class="corpus-eyebrow">{{ index + 1 }} · {{ item.type }}</p><MultipleChoiceActivity v-if="item.type === 'multiple-choice'" :items="[item.data]" embedded translation-label="Translation" /></article></template>
  </section>
</template>
