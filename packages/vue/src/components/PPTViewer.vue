<script setup lang="ts">
/**
 * PPTViewer - Main PPT/PPTX viewer component
 */

import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { usePPT } from '../composables/usePPT'

interface Props {
  source?: string | File | Blob | ArrayBuffer
  presentation?: any
  initialSlide?: number
  enableAnimations?: boolean
  enableTransitions?: boolean
  scaleMode?: 'fit' | 'fill' | 'stretch' | 'none'
  backgroundColor?: string
  enableKeyboard?: boolean
  enableTouch?: boolean
  showControls?: boolean
  showProgress?: boolean
  showSlideNumber?: boolean | 'current' | 'total' | 'currentTotal'
  autoPlay?: boolean
  autoPlayInterval?: number
  loop?: boolean
  lazyLoad?: boolean | number
  parserOptions?: any
  class?: string
  style?: string | Record<string, string>
}

// Props
const props = withDefaults(defineProps<Props>(), {
  initialSlide: 0,
  enableAnimations: true,
  enableTransitions: true,
  scaleMode: 'fit',
  backgroundColor: '#000000',
  enableKeyboard: true,
  enableTouch: true,
  showControls: true,
  showProgress: true,
  showSlideNumber: 'currentTotal',
  autoPlay: false,
  autoPlayInterval: 5000,
  loop: false,
  lazyLoad: 3,
})

// Emits
const emit = defineEmits<{
  loaded: [presentation: any]
  error: [error: Error]
  slideChange: [slideIndex: number, slide: any]
  animationStart: [element: any, animation: any]
  animationComplete: [element: any, animation: any]
  stateChange: [state: any]
  play: []
  pause: []
  fullscreenEnter: []
  fullscreenExit: []
}>()

// Refs
const containerRef = ref<HTMLElement | null>(null)

// usePPT composable
const {
  presentation,
  isLoading,
  error,
  state,
  load,
  goToSlide,
  next,
  previous,
  play,
  pause,
  toggleFullscreen,
  destroy,
} = usePPT({
  container: containerRef,
  renderOptions: {
    initialSlide: props.initialSlide,
    enableAnimations: props.enableAnimations,
    enableTransitions: props.enableTransitions,
    scaleMode: props.scaleMode,
    backgroundColor: props.backgroundColor,
    enableKeyboard: props.enableKeyboard,
    enableTouch: props.enableTouch,
    showControls: props.showControls,
    showProgress: props.showProgress,
    showSlideNumber: props.showSlideNumber,
    autoPlay: props.autoPlay,
    autoPlayInterval: props.autoPlayInterval,
    loop: props.loop,
    lazyLoad: props.lazyLoad,
  },
  parserOptions: props.parserOptions,
  events: {
    ready: (p: any) => emit('loaded', p),
    slideChange: (index: number, slide: any) => emit('slideChange', index, slide),
    animationStart: (element: any, animation: any) => emit('animationStart', element, animation),
    animationComplete: (element: any, animation: any) => emit('animationComplete', element, animation),
    slideshowStart: () => emit('play'),
    slideshowEnd: () => emit('pause'),
  },
})

// Computed
const currentSlide = computed(() => state.value?.currentSlide || 0)
const totalSlides = computed(() => state.value?.totalSlides || 0)
const isPlaying = computed(() => state.value?.isPlaying || false)
const isFullscreen = computed(() => state.value?.isFullscreen || false)

// Watch source changes
watch(() => props.source, async (newSource) => {
  console.log('[PPTViewer] source changed:', newSource?.constructor?.name)
  if (newSource) {
    try {
      console.log('[PPTViewer] calling load()...')
      await load(newSource)
      console.log('[PPTViewer] load() completed')
    } catch (e) {
      console.error('[PPTViewer] load() error:', e)
      emit('error', e as Error)
    }
  }
}, { immediate: true })

// Watch presentation prop changes
watch(() => props.presentation, (newPresentation) => {
  if (newPresentation) {
    // Handle pre-parsed presentation
    // This would require renderer to accept parsed presentation
  }
})

// Lifecycle
onMounted(() => {
  // Container is ready
})

onUnmounted(() => {
  destroy()
})

// Expose methods
defineExpose({
  goToSlide,
  next,
  previous,
  play,
  pause,
  toggleFullscreen,
  presentation,
  state,
})
</script>

<template>
  <div class="ppt-viewer-wrapper" :class="[props.class]" :style="props.style">
    <!-- Renderer container - Vue won't manage this div's children -->
    <div ref="containerRef" class="ppt-viewer"></div>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="ppt-viewer__loading">
      <slot name="loading">
        <div class="ppt-viewer__spinner"></div>
        <span>Loading presentation...</span>
      </slot>
    </div>

    <!-- Error overlay -->
    <div v-if="error" class="ppt-viewer__error">
      <slot name="error" :error="error">
        <span>{{ error.message }}</span>
      </slot>
    </div>

    <!-- Custom controls slot -->
    <slot name="controls" :current-slide="currentSlide" :total-slides="totalSlides" :is-playing="isPlaying"
      :is-fullscreen="isFullscreen" :go-to-slide="goToSlide" :next="next" :previous="previous" :play="play"
      :pause="pause" :toggle-fullscreen="toggleFullscreen" />
  </div>
</template>

<style scoped>
.ppt-viewer-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
  background-color: v-bind('props.backgroundColor');
}

.ppt-viewer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.ppt-viewer__loading,
.ppt-viewer__error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  pointer-events: none;
}

.ppt-viewer__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ppt-viewer__error {
  color: #ff4444;
  pointer-events: auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
