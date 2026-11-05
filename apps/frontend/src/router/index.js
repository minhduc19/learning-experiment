import { createRouter, createWebHistory } from 'vue-router'

// Routes with a title appear in the main navigation automatically.
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/multiple-choice',
    alias: '/ideas/one',
    name: 'idea-one',
    component: () => import('../views/IdeaOneView.vue'),
    meta: { title: 'Multiple choice', fullscreen: true },
  },
  {
    path: '/multiple-choice-strict-quiz',
    name: 'strict-quiz',
    component: () => import('../views/StrictQuizView.vue'),
    meta: { title: 'Strict quiz', fullscreen: true },
  },
  {
    path: '/ideas/two',
    name: 'idea-two',
    component: () => import('../views/IdeaTwoView.vue'),
    meta: { title: 'Idea two' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
