<script setup>
import { sentenceForWord } from '../../utils/readingSentence.js'
defineProps({ words: { type: Array, required: true }, pinyin: Boolean, interactive: Boolean })
const emit = defineEmits(['define'])
</script>
<template>
  <span class="story-words" lang="zh-CN"><template v-for="(word, i) in words" :key="i"><button v-if="interactive && word.meaning" class="word-help" :aria-label="`Meaning of ${word.text}`" @click="emit('define', { ...word, sentence: sentenceForWord(words, i) })"><ruby :class="{ 'phrase-ruby': word.text.length > 8 }"><span>{{ word.text }}</span><rt v-if="pinyin">{{ word.pinyin }}</rt></ruby></button><ruby v-else :class="{ 'phrase-ruby': word.text.length > 8 }"><span>{{ word.text }}</span><rt v-if="pinyin && word.pinyin">{{ word.pinyin }}</rt></ruby></template></span>
</template>
<style scoped>
.story-words { font-size: var(--story-font-size, 1.25rem); line-height: 1.85; overflow-wrap: anywhere; }
ruby { ruby-align: center; margin-inline: .08em; } rt { color: #9aafb7; font-size: .55em; font-weight: 400; }
/* Sentence-sized annotations must wrap as a phrase instead of one atomic ruby box. */
.phrase-ruby { display: inline-flex; flex-direction: column; max-width: 100%; vertical-align: bottom; text-align: left; }
.phrase-ruby rt { display: block; order: -1; line-height: 1.5; }
.phrase-ruby span, .phrase-ruby rt { white-space: normal; overflow-wrap: anywhere; }
.word-help { display: inline; max-width: 100%; white-space: normal; text-align: inherit; padding: 0; border: 0; border-bottom: 1px dotted #6f8790; background: transparent; color: inherit; font: inherit; cursor: pointer; }
</style>
