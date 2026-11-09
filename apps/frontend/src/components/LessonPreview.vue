<script setup>
import MixedLessonPlayer from './MixedLessonPlayer.vue'
defineProps({ lesson: { type: Object, required: true } })
</script>
<template>
  <section aria-label="Live lesson preview"><h2>{{ lesson.title }}</h2><p class="corpus-muted">{{ lesson.items.length }} items · shown in saved order. Try the questions below.</p>
    <MixedLessonPlayer :lesson="lesson" />
  </section>
</template>
