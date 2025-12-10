/**
 * @ldesign/ppt-vue
 * 
 * Vue adapter for @ldesign/ppt-core
 */

// Components
export { default as PPTViewer } from './components/PPTViewer.vue'
export { default as SlideView } from './components/SlideView.vue'
export { default as ThumbnailStrip } from './components/ThumbnailStrip.vue'
export { default as SlideControls } from './components/SlideControls.vue'

// Composables
export { usePPT } from './composables/usePPT'
export { useSlide } from './composables/useSlide'
export { useAnimation } from './composables/useAnimation'
export { usePresentation } from './composables/usePresentation'

// Types
export type {
  PPTViewerProps,
  PPTViewerEmits,
  SlideViewProps,
  SlideViewEmits,
  ThumbnailStripProps,
  ThumbnailStripEmits,
  SlideControlsProps,
  SlideControlsEmits,
} from './types'

// Re-export core types for convenience
export type {
  Presentation,
  Slide,
  RenderOptions,
  ParserOptions,
  ParseResult,
  RendererState,
} from '@ldesign/ppt-core'

// Version
export const VERSION = '0.1.0'
