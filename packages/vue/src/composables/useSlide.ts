/**
 * useSlide - Composable for individual slide functionality
 */

import { computed, type ComputedRef } from 'vue'
import type { Presentation, Slide, SlideElement } from '@ldesign/ppt-core'
import type { UseSlideReturn } from '../types'

export interface UseSlideOptions {
  /** Presentation data */
  presentation: Presentation
  /** Slide index */
  slideIndex: number
}

/**
 * Slide composable
 */
export function useSlide(options: UseSlideOptions): UseSlideReturn {
  const slide = computed<Slide | null>(() => {
    return options.presentation?.slides[options.slideIndex] || null
  })

  const elements = computed<SlideElement[]>(() => {
    return slide.value?.elements || []
  })

  /**
   * Render slide to container
   */
  const renderTo = (container: HTMLElement): void => {
    if (!slide.value || !options.presentation) return

    // Clear container
    container.innerHTML = ''

    // Create slide element
    const slideEl = document.createElement('div')
    slideEl.className = 'ppt-slide'

    // Apply dimensions
    const width = options.presentation.properties.slideWidth / 914400 * 96
    const height = options.presentation.properties.slideHeight / 914400 * 96
    slideEl.style.width = `${width}px`
    slideEl.style.height = `${height}px`
    slideEl.style.backgroundColor = '#FFFFFF'
    slideEl.style.position = 'relative'
    slideEl.style.overflow = 'hidden'

    container.appendChild(slideEl)
  }

  /**
   * Get element by ID
   */
  const getElementById = (id: number): SlideElement | null => {
    return elements.value.find(el => el.id === id) || null
  }

  return {
    slide: slide as unknown as Slide | null,
    elements: elements as unknown as SlideElement[],
    renderTo,
    getElementById,
  }
}
