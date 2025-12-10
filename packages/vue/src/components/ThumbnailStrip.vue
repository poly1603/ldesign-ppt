<script setup lang="ts">
/**
 * ThumbnailStrip - Slide thumbnails navigation component
 */

import { computed } from 'vue'

interface Props {
  presentation: any
  currentSlide: number
  size?: 'small' | 'medium' | 'large' | number
  orientation?: 'horizontal' | 'vertical'
  showNumbers?: boolean
  class?: string
  style?: string | Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  orientation: 'horizontal',
  showNumbers: true,
})

const emit = defineEmits<{
  select: [slideIndex: number]
}>()

// Compute thumbnail dimensions
const thumbnailSize = computed(() => {
  if (typeof props.size === 'number') {
    return { width: props.size, height: props.size * 0.75 }
  }

  const sizes = {
    small: { width: 80, height: 60 },
    medium: { width: 120, height: 90 },
    large: { width: 160, height: 120 },
  }

  return sizes[props.size]
})

// Get slides
const slides = computed(() => props.presentation?.slides || [])

function handleThumbnailClick(index: number) {
  emit('select', index)
}
</script>

<template>
  <div class="ppt-thumbnail-strip" :class="[
    `ppt-thumbnail-strip--${props.orientation}`,
    props.class
  ]" :style="props.style">
    <button v-for="(slide, index) in slides" :key="slide.id" class="ppt-thumbnail"
      :class="{ 'ppt-thumbnail--active': index === props.currentSlide }" :style="{
        width: `${thumbnailSize.width}px`,
        height: `${thumbnailSize.height}px`,
      }" @click="handleThumbnailClick(index)">
      <!-- Thumbnail preview -->
      <div class="ppt-thumbnail__preview">
        <span v-if="props.showNumbers" class="ppt-thumbnail__number">
          {{ index + 1 }}
        </span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.ppt-thumbnail-strip {
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: auto;
}

.ppt-thumbnail-strip--horizontal {
  flex-direction: row;
}

.ppt-thumbnail-strip--vertical {
  flex-direction: column;
}

.ppt-thumbnail {
  flex-shrink: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.ppt-thumbnail:hover {
  border-color: rgba(66, 133, 244, 0.5);
}

.ppt-thumbnail--active {
  border-color: #4285f4;
}

.ppt-thumbnail__preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.ppt-thumbnail__number {
  font-size: 14px;
  font-weight: 600;
  color: #666;
}
</style>
