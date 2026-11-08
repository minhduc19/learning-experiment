import { createRouter, createWebHistory } from 'vue-router'
import { auth, initializeAuth } from '../composables/useAuth'

// Routes with a title appear in the Ideas directory automatically.
export const routes = [
  { path:'/sample-lesson', name:'sample-lesson', component:()=>import('../views/SampleLessonView.vue'), meta:{title:'Sample mixed lesson',fullscreen:true} },
  { path: '/api-diagnostics', name: 'api-diagnostics', component: () => import('../views/ApiDiagnosticsView.vue'), meta: { title: 'External API diagnostics', requiresAuth: true } },
  { path: '/sample-sentence-jumple', alias: '/sample-sentence-jumpl', name: 'sample-sentence-jumple', component: () => import('../views/SampleSentenceJumpleView.vue'), meta: { title: 'Sentence jumble', fullscreen: true } },
  { path: '/AI-exercise-generator', name: 'ai-exercise-generator', component: () => import('../views/StudySelectionView.vue'), props: { aiMode: true }, meta: { title: 'AI exercise generator', requiresAuth: true } },
  { path: '/lessons/:lessonId/play', name: 'lesson-play', component: () => import('../views/LessonPlayView.vue'), meta: { requiresAuth: true, fullscreen: true } },
  { path: '/segments/:segmentId', name: 'segment-detail', component: () => import('../views/SegmentDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/lessons', name: 'lessons', component: () => import('../views/LessonsView.vue'), meta: { title: 'My lessons', requiresAuth: true } },
  { path: '/lessons/new', name: 'lesson-new', component: () => import('../views/LessonEditorView.vue'), meta: { title: 'Create a lesson', requiresAuth: true } },
  { path: '/lessons/:lessonId', name: 'lesson-edit', component: () => import('../views/LessonEditorView.vue'), meta: { requiresAuth: true } },
  { path: '/study-selection', name: 'study-selection', component: () => import('../views/StudySelectionView.vue'), meta: { title: 'Study selection', requiresAuth: true } },
  { path: '/sentence-practice', name: 'sentence-practice', component: () => import('../views/SentencePracticeView.vue'), meta: { title: 'Sentence practice', requiresAuth: true } },
  { path: '/login', name: 'login', component: () => import('../views/AuthView.vue'), meta: { title: 'Log in' } },
  { path: '/register', name: 'register', component: () => import('../views/AuthView.vue'), meta: { title: 'Create account' } },
  { path: '/my-stories', name: 'my-stories', component: () => import('../views/MyStoriesView.vue'), meta: { title: 'My stories', requiresAuth: true } },
  { path: '/my-stories/:storyId', name: 'story', component: () => import('../views/StoryView.vue'), meta: { requiresAuth: true } },
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
    path: '/sample-matching-pair',
    name: 'sample-matching-pair',
    component: () => import('../views/SampleMatchingPairView.vue'),
    meta: { title: 'Tap the Pairs', fullscreen: true },
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
    path: '/corpus-upload',
    name: 'corpus-upload',
    component: () => import('../views/CorpusUploadView.vue'),
    meta: { title: 'Upload a corpus story', requiresAuth: true },
  },
  {
    path: '/characters',
    name: 'characters',
    component: () => import('../views/CharactersView.vue'),
    meta: { title: 'Character explorer', requiresAuth: true },
  },
  {
    path: '/characters/:characterId',
    name: 'character-detail',
    component: () => import('../views/CharacterDetailView.vue'),
    meta: { requiresAuth: true },
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
    path: '/sample-reading-app',
    name: 'sample-reading-app',
    component: () => import('../views/SampleReadingView.vue'),
    meta: { title: 'Sample reading app', fullscreen: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async to => {
  if (!to.meta.requiresAuth) return true
  await initializeAuth()
  if (!auth.user) return { name: 'login', query: { next: to.fullPath } }
  return true
})
export default router
