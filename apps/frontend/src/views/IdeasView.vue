<script setup>
import { RouterLink } from 'vue-router'
import { routes } from '../router'

const routeLinks = routes
  .filter((route) => route.meta?.title)
  .flatMap((route) => [route.path, ...[route.alias ?? []].flat()].map((path) => ({
    path,
    title: route.meta.title,
  })))
</script>

<template>
  <main class="page">
    <h1>Ideas</h1>
    <ul class="stack">
      <li v-for="route in routeLinks" :key="route.path">
        <RouterLink :to="route.path">{{ route.title }} ({{ route.path }})</RouterLink>
      </li>
    </ul>
  </main>
</template>
