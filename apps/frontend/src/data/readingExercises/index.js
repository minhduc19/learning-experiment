// Vite discovers every exercise module in this folder at build time. New files
// only need to export `story`; no central registry update is required.
const modules = import.meta.glob('./*.js', { eager: true })

export const readingExercises = Object.values(modules)
  .map(module => module.story)
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
