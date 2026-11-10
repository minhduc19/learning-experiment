<script setup>
import { readingExercises } from '../data/readingExercises/index.js'
</script>
<template>
  <main class="page"><p>READ & LISTEN</p><h1>Reading exercises</h1><p>Follow a short Mandarin story and answer questions as you read.</p><ul class="route-list"><li v-for="story in readingExercises" :key="story.id"><RouterLink :to="`/reading-exercises/${story.id}`"><span><strong lang="zh">{{ story.title }}</strong><br>{{ story.translation }}<br><small>{{ story.steps.filter(step => step.answer).length }} checkpoints · Beginner</small></span><span aria-hidden="true">→</span></RouterLink></li></ul></main>
</template>
