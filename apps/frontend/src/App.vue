<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { routes } from './router'

const route = useRoute()
const navigation = routes.filter((route) => route.meta?.title)
</script>

<template>
  <header v-if="!route.meta.fullscreen">
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink v-for="route in navigation" :key="route.name" :to="{ name: route.name }">
        {{ route.meta.title }}
      </RouterLink>
    </nav>
  </header>
  <RouterView />
</template>
