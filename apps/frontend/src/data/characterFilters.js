export const learningStatuses = [
  { value: 'all', label: 'All characters', description: 'Show characters with any learning status, including unmarked characters.' },
  { value: 'unmarked', label: 'Unmarked', description: 'Neither Learned nor Learning is selected.' },
  { value: 'learned_only', label: 'Learned only', description: 'Learned is selected and Learning is not selected.' },
  { value: 'learning_only', label: 'Learning only', description: 'Learning is selected and Learned is not selected.' },
  { value: 'revision', label: 'Both · revision', description: 'Both Learned and Learning are selected: characters you want to revise.' },
  { value: 'learned', label: 'Learned · including revision', description: 'Learned is selected, including characters also marked Learning.' },
  { value: 'learning', label: 'Learning · including revision', description: 'Learning is selected, including characters also marked Learned.' },
  { value: 'marked', label: 'Any marked', description: 'At least one of Learned or Learning is selected.' },
]

export function sortDescription(sort, direction) {
  return sort === 'distinct_segment_count'
    ? `Characters appearing in the ${direction === 'asc' ? 'fewest' : 'most'} different word segments come first. Repeated appearances of the same word count once.`
    : `Characters appearing ${direction === 'asc' ? 'least' : 'most'} often in your completed stories come first. Each repeated character appearance counts.`
}
