<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header v-if="!route.meta.fullscreen">
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink :to="{ name: 'home' }">Home</RouterLink>
    </nav>
  </header>
  <RouterView />
</template>
