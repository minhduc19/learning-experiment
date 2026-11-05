import { createRouter, createWebHistory } from 'vue-router'

// Routes with a title appear on the ideas page automatically.
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/ideas',
    name: 'ideas',
    component: () => import('../views/IdeasView.vue'),
    meta: { title: 'Ideas' },
  },
  {
    path: '/multiple-choice',
    alias: '/ideas/one',
    name: 'idea-one',
    component: () => import('../views/IdeaOneView.vue'),
    meta: { title: 'Multiple choice' },
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
