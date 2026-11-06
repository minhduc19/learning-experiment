<script setup>
import { RouterLink } from 'vue-router'
import { routes } from '../router'

// Parameterized pages link to their record picker rather than invented IDs.
function destination(path) {
  if (path.includes(':pathMatch')) return '/page-not-found-example'
  if (path.startsWith('/lessons/:')) return '/lessons'
  if (path.startsWith('/my-stories/:')) return '/my-stories'
  if (path.startsWith('/characters/:') || path.startsWith('/segments/:')) return '/characters'
  return path
}
const pages = routes.flatMap(route => [
  { path: route.path, to: destination(route.path), title: route.meta?.title || route.name || route.path, dynamic: route.path.includes(':') },
  ...[route.alias ?? []].flat().map(path => ({ path, to: destination(path), title: `${route.meta?.title || route.name} (alias)`, dynamic: path.includes(':') })),
])

</script>

<template>
  <main class="page">
    <h1>Ideas</h1>
    <p>Explore all pages and activities in the project.</p>
    <ul class="route-list">
      <li v-for="page in pages" :key="page.path">
        <RouterLink :to="page.to">
          <span>{{ page.title }}<small v-if="page.dynamic && !page.path.includes(':pathMatch')"> · Choose a record to open this page</small></span>
          <code>{{ page.path }}</code>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
