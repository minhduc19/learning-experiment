<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink :to="{ name: 'home' }">Home</RouterLink>
    </nav>
  </header>
  <RouterView />
</template>
