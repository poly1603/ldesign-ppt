/**
 * useAnimation - Composable for animation control
 */

import { ref, computed } from 'vue'
import type { UseAnimationReturn } from '../types'

export interface UseAnimationOptions {
  /** Total animation steps */
  totalSteps?: number
  /** Animation callback */
  onAnimate?: (step: number) => Promise<void>
}

/**
 * Animation composable
 */
export function useAnimation(options: UseAnimationOptions = {}): UseAnimationReturn {
  const currentStep = ref(0)
  const isAnimating = ref(false)
  const totalSteps = computed(() => options.totalSteps || 0)

  /**
   * Play next animation
   */
  const next = async (): Promise<boolean> => {
    if (currentStep.value >= totalSteps.value) {
      return false
    }

    if (isAnimating.value) {
      return false
    }

    isAnimating.value = true

    try {
      if (options.onAnimate) {
        await options.onAnimate(currentStep.value)
      }
      currentStep.value++
      return currentStep.value < totalSteps.value
    } finally {
      isAnimating.value = false
    }
  }

  /**
   * Reset animations
   */
  const reset = (): void => {
    currentStep.value = 0
    isAnimating.value = false
  }

  return {
    currentStep: currentStep as unknown as number,
    totalSteps: totalSteps as unknown as number,
    isAnimating: isAnimating as unknown as boolean,
    next,
    reset,
  }
}
