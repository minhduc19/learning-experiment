<script setup>
import { RouterLink } from 'vue-router'
import { routes } from '../router'

const pages = routes.filter((route) => route.meta?.title).flatMap((route) => [
  { path: route.path, title: route.meta.title },
  ...[route.alias ?? []].flat().map((path) => ({ path, title: `${route.meta.title} (alias)` })),
])
</script>

<template>
  <main class="page">
    <h1>Ideas</h1>
    <p>Explore all pages and activities in the project.</p>
    <ul class="route-list">
      <li v-for="page in pages" :key="page.path">
        <RouterLink :to="page.path">
          <span>{{ page.title }}</span>
          <code>{{ page.path }}</code>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
