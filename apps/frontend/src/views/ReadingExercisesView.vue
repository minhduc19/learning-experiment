<script setup>
import { computed, ref } from 'vue'
import { readingExercises } from '../data/readingExercises/index.js'
import { sortReadingExercises } from '../utils/sortReadingExercises.js'

const sortOrder = ref('latest')
const sortedExercises = computed(() => sortReadingExercises(readingExercises, sortOrder.value))
</script>
<template>
  <main class="page">
    <p>READ & LISTEN</p>
    <h1>Reading exercises</h1>
    <p>Follow a short Mandarin story and answer questions as you read.</p>
    <div class="reading-sort">
      <label for="reading-sort-order">Sort by creation date</label>
      <select id="reading-sort-order" v-model="sortOrder">
        <option value="latest">Latest first</option>
        <option value="earliest">Earliest first</option>
      </select>
    </div>
    <ul class="route-list">
      <li v-for="story in sortedExercises" :key="story.id">
        <RouterLink :to="`/reading-exercises/${story.id}`">
          <span><strong lang="zh">{{ story.title }}</strong><br>{{ story.translation }}<br><small>{{ story.steps.filter(step => step.answer).length }} checkpoints · Beginner</small></span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
<style scoped>
.reading-sort { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; margin-block: 1.5rem; }
.reading-sort select { min-height: 44px; max-width: 100%; padding: .5rem .75rem; font: inherit; border: 1px solid var(--color-border, #b6c6c1); border-radius: .5rem; }
</style>
