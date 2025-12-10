/**
 * Vue component prop and emit types
 */

import type {
  Presentation,
  Slide,
  SlideElement,
  AnimationNode,
  RenderOptions,
  ParserOptions,
  RendererState,
} from '@ldesign/ppt-core'

/**
 * PPTViewer component props
 */
export interface PPTViewerProps {
  /** PPTX source - can be URL, File, Blob or ArrayBuffer */
  source?: string | File | Blob | ArrayBuffer
  /** Presentation data (if already parsed) */
  presentation?: Presentation
  /** Initial slide index */
  initialSlide?: number
  /** Enable animations */
  enableAnimations?: boolean
  /** Enable transitions */
  enableTransitions?: boolean
  /** Scale mode */
  scaleMode?: 'fit' | 'fill' | 'stretch' | 'none'
  /** Background color */
  backgroundColor?: string
  /** Enable keyboard navigation */
  enableKeyboard?: boolean
  /** Enable touch/swipe navigation */
  enableTouch?: boolean
  /** Show navigation controls */
  showControls?: boolean
  /** Show progress bar */
  showProgress?: boolean
  /** Show slide number */
  showSlideNumber?: boolean | 'current' | 'total' | 'currentTotal'
  /** Auto-play slides */
  autoPlay?: boolean
  /** Auto-play interval in milliseconds */
  autoPlayInterval?: number
  /** Loop back to first slide */
  loop?: boolean
  /** Number of slides to preload */
  lazyLoad?: boolean | number
  /** Parser options */
  parserOptions?: Partial<ParserOptions>
  /** Custom class names */
  class?: string
  /** Custom styles */
  style?: string | Record<string, string>
}

/**
 * PPTViewer component emits
 */
export interface PPTViewerEmits {
  /** Emitted when presentation is loaded */
  (e: 'loaded', presentation: Presentation): void
  /** Emitted when loading fails */
  (e: 'error', error: Error): void
  /** Emitted when slide changes */
  (e: 'slideChange', slideIndex: number, slide: Slide): void
  /** Emitted when animation starts */
  (e: 'animationStart', element: SlideElement, animation: AnimationNode): void
  /** Emitted when animation completes */
  (e: 'animationComplete', element: SlideElement, animation: AnimationNode): void
  /** Emitted when state changes */
  (e: 'stateChange', state: RendererState): void
  /** Emitted when playback starts */
  (e: 'play'): void
  /** Emitted when playback pauses */
  (e: 'pause'): void
  /** Emitted when entering fullscreen */
  (e: 'fullscreenEnter'): void
  /** Emitted when exiting fullscreen */
  (e: 'fullscreenExit'): void
}

/**
 * SlideView component props
 */
export interface SlideViewProps {
  /** Presentation data */
  presentation: Presentation
  /** Slide index to display */
  slideIndex: number
  /** Whether this is the active slide */
  active?: boolean
  /** Enable animations for this slide */
  enableAnimations?: boolean
  /** Custom class names */
  class?: string
  /** Custom styles */
  style?: string | Record<string, string>
}

/**
 * SlideView component emits
 */
export interface SlideViewEmits {
  /** Emitted when slide is rendered */
  (e: 'rendered', slideIndex: number): void
  /** Emitted when shape is clicked */
  (e: 'shapeClick', element: SlideElement): void
  /** Emitted when hyperlink is clicked */
  (e: 'linkClick', url: string): void
}

/**
 * ThumbnailStrip component props
 */
export interface ThumbnailStripProps {
  /** Presentation data */
  presentation: Presentation
  /** Current slide index */
  currentSlide: number
  /** Thumbnail size */
  size?: 'small' | 'medium' | 'large' | number
  /** Strip orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Show slide numbers */
  showNumbers?: boolean
  /** Custom class names */
  class?: string
  /** Custom styles */
  style?: string | Record<string, string>
}

/**
 * ThumbnailStrip component emits
 */
export interface ThumbnailStripEmits {
  /** Emitted when thumbnail is clicked */
  (e: 'select', slideIndex: number): void
}

/**
 * SlideControls component props
 */
export interface SlideControlsProps {
  /** Current slide index */
  currentSlide: number
  /** Total number of slides */
  totalSlides: number
  /** Whether playing */
  isPlaying: boolean
  /** Whether in fullscreen */
  isFullscreen: boolean
  /** Show play/pause button */
  showPlayPause?: boolean
  /** Show fullscreen button */
  showFullscreen?: boolean
  /** Show slide counter */
  showCounter?: boolean
  /** Custom class names */
  class?: string
  /** Custom styles */
  style?: string | Record<string, string>
}

/**
 * SlideControls component emits
 */
export interface SlideControlsEmits {
  /** Emitted when previous is clicked */
  (e: 'previous'): void
  /** Emitted when next is clicked */
  (e: 'next'): void
  /** Emitted when play/pause is clicked */
  (e: 'togglePlay'): void
  /** Emitted when fullscreen is clicked */
  (e: 'toggleFullscreen'): void
  /** Emitted when specific slide is requested */
  (e: 'goToSlide', slideIndex: number): void
}

/**
 * usePPT composable return type
 */
export interface UsePPTReturn {
  /** Parsed presentation */
  presentation: Presentation | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Current renderer state */
  state: RendererState | null
  /** Load presentation from source */
  load: (source: string | File | Blob | ArrayBuffer) => Promise<void>
  /** Go to specific slide */
  goToSlide: (index: number) => void
  /** Go to next slide/animation */
  next: () => void
  /** Go to previous slide */
  previous: () => void
  /** Start auto-play */
  play: () => void
  /** Pause auto-play */
  pause: () => void
  /** Toggle fullscreen */
  toggleFullscreen: () => void
  /** Destroy and clean up */
  destroy: () => void
}

/**
 * useSlide composable return type
 */
export interface UseSlideReturn {
  /** Current slide */
  slide: Slide | null
  /** Slide elements */
  elements: SlideElement[]
  /** Render slide to container */
  renderTo: (container: HTMLElement) => void
  /** Get element by ID */
  getElementById: (id: number) => SlideElement | null
}

/**
 * useAnimation composable return type
 */
export interface UseAnimationReturn {
  /** Current animation step */
  currentStep: number
  /** Total animation steps */
  totalSteps: number
  /** Is animating */
  isAnimating: boolean
  /** Play next animation */
  next: () => Promise<boolean>
  /** Reset animations */
  reset: () => void
}

/**
 * usePresentation composable return type
 */
export interface UsePresentationReturn {
  /** Presentation metadata */
  metadata: Presentation['metadata'] | null
  /** Presentation properties */
  properties: Presentation['properties'] | null
  /** All slides */
  slides: Slide[]
  /** Slide masters */
  masters: Presentation['masters']
  /** Get slide by index */
  getSlide: (index: number) => Slide | null
  /** Get slide count */
  slideCount: number
}
