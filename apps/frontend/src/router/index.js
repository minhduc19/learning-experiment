import { createRouter, createWebHistory } from 'vue-router'

// Routes with a title appear in the Ideas directory automatically.
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
    path: '/reading-app',
    name: 'reading-app',
    component: () => import('../views/ReadingView.vue'),
    meta: { title: 'Reading app', fullscreen: true },
  },
  {
    path: '/database-status',
    name: 'database-status',
    component: () => import('../views/DatabaseStatusView.vue'),
    meta: { title: 'Database status' },
  },
  {
    path: '/api-docs',
    name: 'api-docs',
    component: () => import('../views/ApiDocsView.vue'),
    meta: { title: 'API documentation' },
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
