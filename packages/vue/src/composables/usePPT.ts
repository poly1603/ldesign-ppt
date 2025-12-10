/**
 * usePPT - Main composable for PPT functionality
 */

import { ref, shallowRef, onUnmounted, type Ref } from 'vue'
import {
  PPTXParser,
  PPTRenderer,
  type Presentation,
  type RenderOptions,
  type ParserOptions,
  type RendererState,
  type RendererEvents,
} from '@ldesign/ppt-core'
import type { UsePPTReturn } from '../types'

export interface UsePPTOptions {
  /** Container element or selector */
  container?: HTMLElement | string | Ref<HTMLElement | null>
  /** Render options */
  renderOptions?: Partial<RenderOptions>
  /** Parser options */
  parserOptions?: Partial<ParserOptions>
  /** Event callbacks */
  events?: RendererEvents
}

/**
 * Main PPT composable
 */
export function usePPT(options: UsePPTOptions = {}): UsePPTReturn {
  const presentation = shallowRef<Presentation | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const state = ref<RendererState | null>(null)

  let renderer: PPTRenderer | null = null
  let parser: PPTXParser | null = null

  /**
   * Get container element
   */
  const getContainer = (): HTMLElement | null => {
    if (!options.container) return null

    if (typeof options.container === 'string') {
      return document.querySelector(options.container)
    }

    if ('value' in options.container) {
      return options.container.value
    }

    return options.container
  }

  /**
   * Load presentation from source
   */
  const load = async (source: string | File | Blob | ArrayBuffer): Promise<void> => {
    console.log('[usePPT] load() called, source type:', source?.constructor?.name)
    isLoading.value = true
    error.value = null

    try {
      // Create parser
      console.log('[usePPT] Creating PPTXParser with options:', options.parserOptions)
      parser = new PPTXParser(options.parserOptions)

      // Parse based on source type
      let result
      if (source instanceof ArrayBuffer) {
        console.log('[usePPT] Parsing ArrayBuffer...')
        result = await parser.parse(source)
      } else if (source instanceof File || source instanceof Blob) {
        console.log('[usePPT] Parsing File/Blob:', source instanceof File ? (source as File).name : 'Blob')
        result = await parser.parseFile(source)
      } else if (typeof source === 'string') {
        console.log('[usePPT] Parsing URL:', source)
        result = await parser.parseUrl(source)
      } else {
        throw new Error('Invalid source type')
      }
      console.log('[usePPT] Parse completed!')

      if (result.errors.length > 0) {
        console.warn('Parse warnings:', result.warnings)
        console.error('Parse errors:', result.errors)
      }

      presentation.value = result.presentation

      // Initialize renderer if container is available
      const container = getContainer()
      if (container && result.presentation) {
        // Create events wrapper
        const events: RendererEvents = {
          ...options.events,
          slideChange: (index, slide) => {
            updateState()
            options.events?.slideChange?.(index, slide)
          },
          animationStart: (element, animation) => {
            options.events?.animationStart?.(element, animation)
          },
          animationComplete: (element, animation) => {
            options.events?.animationComplete?.(element, animation)
          },
        }

        // Create renderer
        renderer = new PPTRenderer({
          container,
          ...options.renderOptions,
        }, events)

        await renderer.init(result.presentation)
        updateState()
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update state from renderer
   */
  const updateState = (): void => {
    if (renderer) {
      state.value = renderer.getState()
    }
  }

  /**
   * Go to specific slide
   */
  const goToSlide = (index: number): void => {
    if (renderer) {
      renderer.goToSlide(index)
      updateState()
    }
  }

  /**
   * Go to next slide/animation
   */
  const next = (): void => {
    if (renderer) {
      renderer.next()
      updateState()
    }
  }

  /**
   * Go to previous slide
   */
  const previous = (): void => {
    if (renderer) {
      renderer.previous()
      updateState()
    }
  }

  /**
   * Start auto-play
   */
  const play = (): void => {
    if (renderer) {
      renderer.play()
      updateState()
    }
  }

  /**
   * Pause auto-play
   */
  const pause = (): void => {
    if (renderer) {
      renderer.pause()
      updateState()
    }
  }

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = (): void => {
    if (renderer) {
      renderer.toggleFullscreen()
    }
  }

  /**
   * Destroy and clean up
   */
  const destroy = (): void => {
    if (renderer) {
      renderer.destroy()
      renderer = null
    }
    parser = null
    presentation.value = null
    state.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    destroy()
  })

  return {
    presentation: presentation as unknown as Presentation | null,
    isLoading: isLoading as unknown as boolean,
    error: error as unknown as Error | null,
    state: state as unknown as RendererState | null,
    load,
    goToSlide,
    next,
    previous,
    play,
    pause,
    toggleFullscreen,
    destroy,
  }
}
