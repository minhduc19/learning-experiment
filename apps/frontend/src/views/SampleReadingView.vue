<script setup>
import ReadingView from './ReadingView.vue'
import reading from '../data/reading.json'
</script>

<template>
  <ReadingView :document="reading" />
</template>
