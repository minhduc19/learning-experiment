<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { login, register } from '../composables/useAuth'
const route = useRoute()
const router = useRouter()
const signup = computed(() => route.name === 'register')
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (signup.value) await register({ email: email.value, username: username.value, password: password.value })
    else await login(email.value, password.value)
    password.value = ''
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') && !route.query.next.startsWith('//') && !route.query.next.includes('\\') ? route.query.next : '/my-stories'
    await router.replace(next)
  } catch (failure) { error.value = failure.message }
  finally { busy.value = false }
}
</script>
<template>
  <main class="page auth-page">
    <p class="corpus-eyebrow">YOUR CHINESE LIBRARY</p>
    <h1>{{ signup ? 'Create your account' : 'Welcome back' }}</h1>
    <p class="corpus-muted">Log in to upload stories and explore your own sentences.</p>
    <form class="corpus-upload-card auth-form" @submit.prevent="submit">
      <label v-if="signup">Username<input v-model="username" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_.-]+" autocomplete="username"></label>
      <label>Email<input v-model="email" type="email" required maxlength="320" autocomplete="email"></label>
      <label>Password<input v-model="password" type="password" required :minlength="signup ? 10 : 1" maxlength="256" :autocomplete="signup ? 'new-password' : 'current-password'"></label>
      <p v-if="signup" class="corpus-muted">Use at least 10 characters for your password.</p>
      <p v-if="error" class="corpus-error" role="alert">{{ error }}</p>
      <button class="button" :disabled="busy">{{ busy ? 'Please wait…' : signup ? 'Create account' : 'Log in' }}</button>
      <p><RouterLink :to="{ name: signup ? 'login' : 'register', query: route.query }">{{ signup ? 'Already have an account? Log in' : 'New here? Create an account' }}</RouterLink></p>
    </form>
  </main>
</template>
