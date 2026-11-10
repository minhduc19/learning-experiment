<script setup>
import { computed, ref } from 'vue'
import { loadBookmarks, saveBookmarks, sortBookmarked } from '../composables/routeBookmarks'
import { RouterLink } from 'vue-router'
import { routes } from '../router'

let storage
try { storage = window.localStorage } catch {}
const bookmarks = ref(loadBookmarks(storage)), bookmarkError = ref('')
const sortedPages = computed(() => sortBookmarked(pages, bookmarks.value))
function toggleBookmark(path) {
  bookmarks.value = bookmarks.value.includes(path) ? bookmarks.value.filter(id => id !== path) : [...bookmarks.value, path]
  bookmarkError.value = saveBookmarks(storage, bookmarks.value) ? '' : 'Bookmarks could not be saved in this browser. They will last until you leave this page.'
}
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
    <p>Bookmark pages to keep them at the top. Bookmarks are saved in this browser.</p>
    <p v-if="bookmarkError" role="status">{{ bookmarkError }}</p>
    <ul class="route-list">
      <li v-for="page in sortedPages" :key="page.path">
        <button class="bookmark-button" :aria-pressed="bookmarks.includes(page.path)" :aria-label="`${bookmarks.includes(page.path) ? 'Remove bookmark for' : 'Bookmark'} ${page.title}`" @click="toggleBookmark(page.path)">{{ bookmarks.includes(page.path) ? '★' : '☆' }}</button>
        <RouterLink :to="page.to">
          <span>{{ page.title }}<small v-if="page.dynamic && !page.path.includes(':pathMatch')"> · Choose a record to open this page</small></span>
          <code>{{ page.path }}</code>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.route-list li { display: flex; align-items: center; gap: .75rem; }.route-list li a { flex: 1; min-width: 0; }.bookmark-button { flex-shrink: 0; width: 44px; height: 44px; border: 1px solid #b7cbbf; background: white; color: #245a42; border-radius: 10px; font-size: 1.6rem; cursor: pointer; }.bookmark-button[aria-pressed="true"] { background: #e2f2d2; }
</style>
