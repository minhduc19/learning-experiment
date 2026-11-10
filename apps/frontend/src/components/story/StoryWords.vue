<script setup>
defineProps({ words: { type: Array, required: true }, pinyin: Boolean, interactive: Boolean })
const emit = defineEmits(['define'])
</script>
<template>
  <span class="story-words" lang="zh-CN"><template v-for="(word, i) in words" :key="i"><button v-if="interactive && word.meaning" class="word-help" :aria-label="`Meaning of ${word.text}`" @click="emit('define', word)"><ruby>{{ word.text }}<rt v-if="pinyin">{{ word.pinyin }}</rt></ruby></button><ruby v-else>{{ word.text }}<rt v-if="pinyin && word.pinyin">{{ word.pinyin }}</rt></ruby></template></span>
</template>
<style scoped>
.story-words { font-size: 1.25rem; line-height: 2.35; overflow-wrap: anywhere; }
ruby { ruby-align: center; margin-inline: .08em; } rt { color: #9aafb7; font-size: .55em; font-weight: 400; }
.word-help { display: inline; padding: 0; border: 0; border-bottom: 1px dotted #6f8790; background: transparent; color: inherit; font: inherit; cursor: pointer; }
</style>
