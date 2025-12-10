<script setup lang="ts">
/**
 * SlideView - Individual slide display component
 */

import { ref, onMounted, watch } from 'vue'

interface Props {
  presentation: any
  slideIndex: number
  active?: boolean
  enableAnimations?: boolean
  class?: string
  style?: string | Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  enableAnimations: true,
})

const emit = defineEmits<{
  rendered: [slideIndex: number]
  shapeClick: [element: any]
  linkClick: [url: string]
}>()

const slideRef = ref<HTMLElement | null>(null)

// Watch for slide changes
watch(() => props.slideIndex, () => {
  renderSlide()
}, { immediate: true })

onMounted(() => {
  renderSlide()
})

function renderSlide() {
  if (!slideRef.value || !props.presentation) return

  const slide = props.presentation.slides[props.slideIndex]
  if (!slide) return

  // Slide rendering is handled by the core renderer
  // This component provides the container
  emit('rendered', props.slideIndex)
}

function handleShapeClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const shapeId = target.closest('[data-shape-id]')?.getAttribute('data-shape-id')

  if (shapeId) {
    const slide = props.presentation.slides[props.slideIndex]
    const element = slide?.elements.find((el: any) => el.id === parseInt(shapeId))
    if (element) {
      emit('shapeClick', element)
    }
  }
}
</script>

<template>
  <div ref="slideRef" class="ppt-slide-view" :class="[
    { 'ppt-slide-view--active': props.active },
    props.class
  ]" :style="props.style" @click="handleShapeClick">
    <slot />
  </div>
</template>

<style scoped>
.ppt-slide-view {
  position: relative;
  width: 100%;
  height: 100%;
  background: white;
  overflow: hidden;
}

.ppt-slide-view--active {
  z-index: 1;
}
</style>
