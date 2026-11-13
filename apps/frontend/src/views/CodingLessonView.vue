<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findLesson } from '../data/codingLessons'
import PythonPracticeView from './PythonPracticeView.vue'
const route = useRoute()
const lesson = computed(() => findLesson(route.params.lessonId))
const exercise = computed(() => route.params.exerciseId
  ? lesson.value?.exercises.find(item => item.id === route.params.exerciseId)
  : lesson.value?.exercises[0])
</script>
<template>
  <PythonPracticeView v-if="lesson && exercise" :key="`${lesson.id}:${exercise.id}`" :lesson="lesson" :exercise="exercise" />
  <main v-else class="page"><h1>Coding lesson not found</h1><p>This lesson or exercise does not exist.</p><RouterLink to="/coding-lessons">Browse all coding lessons</RouterLink></main>
</template>
