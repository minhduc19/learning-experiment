export function sortReadingExercises(stories, order = 'latest') {
  const direction = order === 'earliest' ? 1 : -1
  return [...stories].sort((a, b) => {
    const dateA = Date.parse(a.createdAt) || 0
    const dateB = Date.parse(b.createdAt) || 0
    return direction * (dateA - dateB) || a.title.localeCompare(b.title, 'zh-CN')
  })
}
