<script setup>
import { watch } from 'vue'
import { auth } from './composables/useAuth'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
watch(() => auth.user, (user, previous) => {
  if (!user && previous && route.meta.requiresAuth) router.replace({ name:'login',query:{next:route.fullPath} })
})
</script>

<template>
  <header v-if="!route.meta.fullscreen">
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink :to="{ name: 'home' }">Home</RouterLink>
    </nav>
  </header>
  <RouterView v-if="!route.meta.requiresAuth || auth.user" :key="(auth.user?.id || 'public') + (route.params.storyId || '')" />
</template>
