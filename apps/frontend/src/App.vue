<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { routes } from './router'

const navigation = routes.filter((route) => route.meta?.title)
</script>

<template>
  <header>
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink v-for="route in navigation" :key="route.name" :to="{ name: route.name }">
        {{ route.meta.title }}
      </RouterLink>
    </nav>
  </header>
  <RouterView />
</template>
