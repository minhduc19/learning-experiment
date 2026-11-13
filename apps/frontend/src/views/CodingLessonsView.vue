<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { codingLessons, codingTags, listLessons, lessonPath, completionKey } from '../data/codingLessons'
import '../styles/python-practice.css'
const route = useRoute()
const router = useRouter()
const tags = computed(() => String(route.query.tags || '').split(',').filter(tag => codingTags.includes(tag)))
const search = computed(() => String(route.query.q || ''))
const sort = computed(() => ['oldest', 'path'].includes(route.query.sort) ? route.query.sort : 'newest')
const lessons = computed(() => listLessons({ tags: tags.value, search: search.value, sort: sort.value }))
function update(query) { router.replace({ query: { ...route.query, ...query } }) }
function toggle(tag) { update({ tags: (tags.value.includes(tag) ? tags.value.filter(t => t !== tag) : [...tags.value, tag]).join(',') || undefined }) }
function completed(lesson) {
  try { return lesson.exercises.filter(exercise => localStorage.getItem(completionKey(lesson, exercise)) === 'true').length }
  catch { return 0 }
}
</script>
<template>
  <main class="python-lab lesson-library">
    <header class="lab-topbar"><RouterLink to="/ideas" class="lab-brand"><span class="lab-mark">✧</span><span>CODE<span class="lab-brand-light">QUEST</span></span></RouterLink><span class="lab-local">Your Python learning path</span></header>
    <section class="library-intro"><span class="lab-chapter">LEARN BY BUILDING</span><h1>Small steps.<br><em>Stronger foundations.</em></h1><p>Build one bank, from a protected balance to a flexible service. Learn the idea, write the code, and test the edge cases.</p><p class="library-path">Recommended path: <span v-for="lesson in [...codingLessons].sort((a,b) => a.order-b.order)" :key="lesson.id"><RouterLink :to="lessonPath(lesson)">{{ lesson.order }}. {{ lesson.title }}</RouterLink> <span v-if="lesson.order < codingLessons.length">→ </span></span></p></section>
    <section class="library-content" aria-label="Coding lesson library">
      <div class="library-controls"><label>Find a lesson<input type="search" :value="search" placeholder="Search lessons…" @input="update({ q: $event.target.value || undefined })"></label><label>Sort by<select :value="sort" @change="update({ sort: $event.target.value })"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="path">Learning path</option></select></label></div>
      <div class="library-filters" aria-label="Filter by tags"><span>TAGS</span><button v-for="tag in codingTags" :key="tag" :aria-pressed="tags.includes(tag)" @click="toggle(tag)">{{ tag }}</button><button v-if="tags.length || search" class="library-clear" @click="router.replace({ query: { sort: route.query.sort } })">Clear filters</button></div>
      <div class="library-count" role="status">{{ lessons.length }} {{ lessons.length === 1 ? 'lesson' : 'lessons' }}<span v-if="tags.length"> · Matches all selected tags</span><span v-else> · {{ sort === 'newest' ? 'Latest additions first' : sort === 'oldest' ? 'Earliest additions first' : 'Follow the concepts in order' }}</span></div>
      <div v-if="lessons.length" class="library-grid">
        <article v-for="lesson in lessons" :key="lesson.id" class="library-card" :data-lesson-id="lesson.id"><div class="library-card-meta"><span>PATH {{ String(lesson.order).padStart(2, '0') }}</span><time :datetime="lesson.createdAt">{{ new Date(lesson.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) }}</time></div><h2><RouterLink :to="lessonPath(lesson)">{{ lesson.title }}</RouterLink></h2><p class="library-subtitle">{{ lesson.subtitle }}</p><p>{{ lesson.description }}</p><div class="lab-tags"><span v-for="tag in lesson.tags" :key="tag">{{ tag }}</span></div><div class="library-card-details"><span>{{ lesson.exercises.length }} {{ lesson.exercises.length === 1 ? 'exercise' : 'exercises' }} · {{ lesson.duration }}</span><span>{{ lesson.level }}</span></div><p class="library-prerequisites">{{ lesson.prerequisites.length ? 'Builds on: ' + lesson.prerequisites.map(id => codingLessons.find(l => l.id === id)?.title).join(', ') : 'Start here · no prerequisites' }}</p><div class="library-card-bottom"><RouterLink :to="lessonPath(lesson)">{{ completed(lesson) ? 'Review lesson' : 'Start lesson' }} <span aria-hidden="true">→</span></RouterLink><span>{{ completed(lesson) }} / {{ lesson.exercises.length }} complete</span></div></article>
      </div>
      <div v-else class="library-empty"><h2>No lessons match yet.</h2><p>Try another tag or clear the filters. DSA is ready as a category; the current lessons cover OOP.</p><button @click="router.replace({ query: {} })">Show all lessons</button></div>
      <p class="library-footnote">Drafts and completion are stored on this device. Run Python in your browser; no account needed.</p>
    </section>
  </main>
</template>
