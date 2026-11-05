<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="page">
    <h1>Page not found</h1>
    <p>This page does not exist yet.</p>
    <RouterLink :to="{ name: 'home' }">Back to home</RouterLink>
  </main>
</template>
