<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { routes } from './router'

const navigation = routes.filter((route) => route.meta?.title)
</script>

<template>
  <header>
    <nav aria-label="Main navigation">
      <RouterLink v-for="route in navigation" :key="route.name" :to="{ name: route.name }">
        {{ route.meta.title }}
      </RouterLink>
    </nav>
  </header>
  <RouterView />
</template>

<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #f2f6f5; color: #163b35; }
main { max-width: 640px; margin: 6vh auto; padding: 32px; }
h1 { font-size: clamp(36px, 7vw, 64px); }
button { padding: 12px 20px; border: 0; border-radius: 8px; background: #126c58; color: white; cursor: pointer; }
a { display: inline-block; margin: 20px; color: #126c58; }
nav { display: flex; flex-wrap: wrap; gap: 12px; max-width: 640px; margin: 0 auto; padding: 24px 32px; }
nav a { margin: 0; padding: 10px 16px; border-radius: 8px; text-decoration: none; }
nav a.router-link-exact-active { background: #126c58; color: white; }
</style>
