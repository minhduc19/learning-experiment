import { useVocabularyProgress } from './useVocabularyProgress.js'

export function useCharacterProgress(character, fetcher) {
  return useVocabularyProgress(character, 'characters', 'character_id', fetcher)
}
