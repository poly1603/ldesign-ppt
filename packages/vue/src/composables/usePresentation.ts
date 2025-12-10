/**
 * usePresentation - Composable for presentation data access
 */

import { computed } from 'vue'
import type { Presentation, Slide } from '@ldesign/ppt-core'
import type { UsePresentationReturn } from '../types'

export interface UsePresentationOptions {
  /** Presentation data */
  presentation: Presentation | null
}

/**
 * Presentation data composable
 */
export function usePresentation(options: UsePresentationOptions): UsePresentationReturn {
  const metadata = computed(() => options.presentation?.metadata || null)
  const properties = computed(() => options.presentation?.properties || null)
  const slides = computed(() => options.presentation?.slides || [])
  const masters = computed(() => options.presentation?.masters || [])
  const slideCount = computed(() => slides.value.length)

  /**
   * Get slide by index
   */
  const getSlide = (index: number): Slide | null => {
    return slides.value[index] || null
  }

  return {
    metadata: metadata as unknown as Presentation['metadata'] | null,
    properties: properties as unknown as Presentation['properties'] | null,
    slides: slides as unknown as Slide[],
    masters: masters as unknown as Presentation['masters'],
    getSlide,
    slideCount: slideCount as unknown as number,
  }
}
