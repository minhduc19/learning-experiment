<script setup>
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'

const cards = [
  { word: '你好', pinyin: 'nǐ hǎo', meaning: 'Hello', example: '你好，很高兴认识你。', translation: 'Hello, nice to meet you.' },
  { word: '谢谢', pinyin: 'xiè xie', meaning: 'Thank you', example: '谢谢你的帮助。', translation: 'Thank you for your help.' },
  { word: '朋友', pinyin: 'péng you', meaning: 'Friend', example: '她是我的朋友。', translation: 'She is my friend.' },
  { word: '学习', pinyin: 'xué xí', meaning: 'To study / to learn', example: '我喜欢学习中文。', translation: 'I like learning Chinese.' },
  { word: '明天', pinyin: 'míng tiān', meaning: 'Tomorrow', example: '我们明天见。', translation: 'See you tomorrow.' },
  { word: '再见', pinyin: 'zài jiàn', meaning: 'Goodbye', example: '再见，明天见！', translation: 'Goodbye, see you tomorrow!' },
]
const queue = ref([...cards])
const reviewed = ref(0)
const known = ref(0)
const revealed = ref(false)
const cardButton = ref(null)
const summaryHeading = ref(null)
const card = computed(() => queue.value[0])
const complete = computed(() => queue.value.length === 0)
async function rate(remembered) {
  if (!revealed.value || complete.value) return
  const current = queue.value.shift()
  reviewed.value++
  if (remembered) known.value++
  else queue.value.push(current)
  revealed.value = false
  await nextTick()
  if (complete.value) summaryHeading.value?.focus()
  else cardButton.value?.focus()
}
async function restart() {
  queue.value = [...cards]
  reviewed.value = 0
  known.value = 0
  revealed.value = false
  await nextTick()
  cardButton.value?.focus()
}
</script>

<template>
  <main class="flashcards">
    <header class="deck-header">
      <RouterLink :to="{ name: 'ideas' }" class="back-link">← All activities</RouterLink>
      <span class="deck-label">MANDARIN · BEGINNER</span>
    </header>

    <section class="deck-body" aria-labelledby="deck-title">
      <p class="eyebrow">A LITTLE PRACTICE, EVERY DAY</p>
      <h1 id="deck-title">Flashcards</h1>
      <p class="intro">Build your vocabulary, one word at a time.</p>

      <div class="progress-label"><span>Everyday essentials</span><span>{{ known }} / {{ cards.length }} learned</span></div>
      <progress :value="known" :max="cards.length" aria-label="Cards learned" />

      <section v-if="complete" class="summary" aria-label="Session summary">
        <span class="summary-icon" aria-hidden="true">✓</span>
        <h2 ref="summaryHeading" tabindex="-1">Nicely done!</h2>
        <p>You learned all {{ cards.length }} words in {{ reviewed }} reviews.</p>
        <button class="button" @click="restart">Practice again</button>
        <RouterLink :to="{ name: 'ideas' }">Explore more activities →</RouterLink>
      </section>

      <template v-else>
        <p class="remaining" role="status">{{ queue.length }} {{ queue.length === 1 ? 'card' : 'cards' }} left to learn</p>
        <button ref="cardButton" class="flashcard" :class="{ revealed }" :aria-expanded="revealed" aria-controls="flashcard-answer" @click="revealed = !revealed">
          <span class="card-label">{{ revealed ? 'THE ANSWER' : 'DO YOU KNOW THIS WORD?' }}</span>
          <strong class="word" lang="zh">{{ card.word }}</strong>
          <span v-if="revealed" id="flashcard-answer" class="answer">
            <span class="pinyin">{{ card.pinyin }}</span>
            <strong class="meaning">{{ card.meaning }}</strong>
            <span class="example" lang="zh">{{ card.example }}</span>
            <span class="translation">{{ card.translation }}</span>
          </span>
          <span v-else id="flashcard-answer" class="unrevealed">Think of the meaning before you reveal.</span>
          <span class="flip-hint">↻ {{ revealed ? 'Tap to see the word' : 'Tap to reveal' }}</span>
        </button>

        <div class="review-actions">
          <button class="review-again" :disabled="!revealed" @click="rate(false)">↻ Practice again</button>
          <button class="button" :disabled="!revealed" @click="rate(true)">✓ Got it</button>
        </div>
        <p class="helper">{{ revealed ? 'Need more practice? We’ll bring this card back.' : 'Tap the card or press Enter to reveal the answer.' }}</p>
      </template>
    </section>
    <footer class="deck-footer">Small steps. Lasting knowledge.</footer>
  </main>
</template>

<style scoped>
.flashcards { min-height: 100dvh; padding: 1.5rem; background: #f2f6f5; }
.deck-header { max-width: 64rem; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.back-link { text-decoration: none; font-size: .9rem; }
.back-link:hover { text-decoration: underline; }
.deck-label, .eyebrow, .card-label { font-size: .7rem; letter-spacing: .14em; font-weight: 700; }
.deck-label { color: #546d66; }
.deck-body { max-width: 34rem; margin: 3rem auto 0; text-align: center; }
.eyebrow { color: #126c58; }
h1 { font-size: clamp(2.5rem, 7vw, 3.5rem); margin: .5rem 0; letter-spacing: -.045em; }
.intro { margin: .75rem 0 2rem; color: #546d66; }
.progress-label { display: flex; justify-content: space-between; gap: 1rem; font-size: .8rem; }
progress { display: block; width: 100%; height: .4rem; border: 0; border-radius: 1rem; overflow: hidden; margin-top: .65rem; background: #dde8e3; accent-color: #126c58; }
progress::-webkit-progress-bar { background: #dde8e3; }
progress::-webkit-progress-value { background: #126c58; border-radius: 1rem; }
progress::-moz-progress-bar { background: #126c58; }
.remaining { font-size: .75rem; color: #546d66; margin: 1.25rem 0 .75rem; }
.flashcard { width: 100%; min-height: 23rem; border: 1px solid #dce6e1; border-radius: 1.5rem; background: white; color: #163b35; box-shadow: 0 10px 32px #163b3508, 0 4px 0 #dce6e1; padding: 2rem 1.25rem; display: flex; align-items: center; flex-direction: column; cursor: pointer; transition: border-color .2s, background .2s; }
.flashcard:hover { border-color: #126c58; }
.flashcard.revealed { background: #fbfefc; }
.card-label { color: #546d66; }
.word { font-size: clamp(3.5rem, 12vw, 5rem); font-weight: 500; line-height: 1.3; margin: 1.5rem 0 .6rem; }
.answer { display: flex; flex-direction: column; gap: .4rem; }
.pinyin { color: #126c58; }
.meaning { font-size: 1.4rem; }
.example { margin-top: .6rem; }
.translation, .unrevealed { font-size: .85rem; color: #546d66; }
.unrevealed { margin: 1.5rem 0; }
.flip-hint { margin-top: auto; padding-top: 1.5rem; font-size: .75rem; color: #546d66; }
.review-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1.5rem; }
.review-actions button { min-height: 3.25rem; border-radius: .75rem; }
.review-again { border: 1px solid #b7cbc2; background: transparent; color: #163b35; cursor: pointer; }
.review-again:hover:not(:disabled) { background: #e3eee8; }
.review-again:disabled { opacity: .5; cursor: not-allowed; }
.helper { color: #546d66; font-size: .75rem; min-height: 2rem; }
.deck-footer { text-align: center; font-size: .75rem; color: #546d66; margin: 2.5rem 0 .5rem; }
.summary { margin-top: 2rem; padding: 3rem 1rem; background: white; border: 1px solid #dce6e1; border-radius: 1.5rem; }
.summary-icon { display: inline-grid; place-items: center; background: #e3eee8; color: #126c58; border-radius: 50%; width: 4rem; height: 4rem; font-size: 2rem; }
.summary h2 { font-size: 2rem; margin-bottom: .5rem; }
.summary a { display: block; margin-top: 1.5rem; }
@media (max-width: 480px) { .flashcards { padding: 1rem; } .deck-label { font-size: .6rem; letter-spacing: .06em; } .deck-body { margin-top: 2rem; } .flashcard { min-height: 22rem; } }
</style>
