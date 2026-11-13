import encapsulation from './encapsulation.js'
import inheritance from './inheritance.js'
import polymorphism from './polymorphism.js'

export const codingTags = ['Python', 'OOP', 'DSA', 'Encapsulation', 'Inheritance', 'Polymorphism', 'Design patterns']
export const codingLessons = [encapsulation, inheritance, polymorphism]
export const lessonPath = lesson => `/coding-lessons/${lesson.id}/${lesson.exercises[0].id}`
export const exercisePath = (lesson, exercise) => `/coding-lessons/${lesson.id}/${exercise.id}`
export function findLesson(id) { return codingLessons.find(lesson => lesson.id === id) }
export function listLessons({ tags = [], search = '', sort = 'newest' } = {}) {
  const query = search.trim().toLowerCase()
  return codingLessons.filter(lesson => tags.every(tag => lesson.tags.includes(tag))
    && `${lesson.title} ${lesson.description} ${lesson.tags.join(' ')}`.toLowerCase().includes(query))
    .sort((a, b) => sort === 'path' ? a.order - b.order : (sort === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || a.id.localeCompare(b.id))
}
export function draftKey(lesson, exercise) {
  // Keep the existing exercise's draft intact when moving its data and route.
  return lesson.id === 'encapsulation' && exercise.id === 'bank-account'
    ? 'python-practice-bank-account-v1' : `coding-draft-v1:${lesson.id}:${exercise.id}`
}
export const completionKey = (lesson, exercise) => `coding-completed-v1:${lesson.id}:${exercise.id}`
