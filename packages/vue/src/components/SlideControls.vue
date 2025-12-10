<script setup lang="ts">
/**
 * SlideControls - Navigation controls component
 */

import { computed } from 'vue'

interface Props {
  currentSlide: number
  totalSlides: number
  isPlaying?: boolean
  isFullscreen?: boolean
  showPlayPause?: boolean
  showFullscreen?: boolean
  showCounter?: boolean
  class?: string
  style?: string | Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  isFullscreen: false,
  showPlayPause: true,
  showFullscreen: true,
  showCounter: true,
})

const emit = defineEmits<{
  previous: []
  next: []
  togglePlay: []
  toggleFullscreen: []
  goToSlide: [slideIndex: number]
}>()

const canGoPrevious = computed(() => props.currentSlide > 0)
const canGoNext = computed(() => props.currentSlide < props.totalSlides - 1)

function handlePrevious() {
  if (canGoPrevious.value) {
    emit('previous')
  }
}

function handleNext() {
  if (canGoNext.value) {
    emit('next')
  }
}

function handleTogglePlay() {
  emit('togglePlay')
}

function handleToggleFullscreen() {
  emit('toggleFullscreen')
}
</script>

<template>
  <div class="ppt-controls" :class="props.class" :style="props.style">
    <!-- Previous button -->
    <button class="ppt-controls__btn" :disabled="!canGoPrevious" @click="handlePrevious" title="Previous slide">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>

    <!-- Slide counter -->
    <span v-if="props.showCounter" class="ppt-controls__counter">
      {{ props.currentSlide + 1 }} / {{ props.totalSlides }}
    </span>

    <!-- Next button -->
    <button class="ppt-controls__btn" :disabled="!canGoNext" @click="handleNext" title="Next slide">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </button>

    <!-- Play/Pause button -->
    <button v-if="props.showPlayPause" class="ppt-controls__btn" @click="handleTogglePlay"
      :title="props.isPlaying ? 'Pause' : 'Play'">
      <svg v-if="!props.isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
      </svg>
    </button>

    <!-- Fullscreen button -->
    <button v-if="props.showFullscreen" class="ppt-controls__btn" @click="handleToggleFullscreen"
      :title="props.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'">
      <svg v-if="!props.isFullscreen" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
      </svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.ppt-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
}

.ppt-controls__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ppt-controls__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.ppt-controls__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ppt-controls__counter {
  min-width: 60px;
  text-align: center;
  color: white;
  font-size: 14px;
  font-weight: 500;
}
</style>
