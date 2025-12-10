/**
 * Transition Manager - Manages slide transitions
 */

import type { SlideTransition } from '../types'

/** Transition configuration */
export interface TransitionConfig {
  type: string
  duration: number
  direction?: 'forward' | 'backward'
  options?: Record<string, any>
}

/**
 * Transition Manager
 */
export class TransitionManager {
  private defaultDuration: number = 500

  /**
   * Play transition between two slides
   */
  async playTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    transition: SlideTransition | undefined,
    direction: 'forward' | 'backward' = 'forward'
  ): Promise<void> {
    const type = transition?.type || 'fade'
    const duration = transition?.duration || this.defaultDuration

    // Get transition function
    const transitionFn = this.getTransitionFunction(type)

    // Execute transition
    await transitionFn(oldSlide, newSlide, duration, direction)
  }

  /**
   * Get transition function by type
   */
  private getTransitionFunction(type: string): (
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ) => Promise<void> {
    const transitions: Record<string, (
      oldSlide: HTMLElement | null,
      newSlide: HTMLElement,
      duration: number,
      direction: 'forward' | 'backward'
    ) => Promise<void>> = {
      'none': this.noneTransition.bind(this),
      'fade': this.fadeTransition.bind(this),
      'push': this.pushTransition.bind(this),
      'wipe': this.wipeTransition.bind(this),
      'split': this.splitTransition.bind(this),
      'zoom': this.zoomTransition.bind(this),
      'reveal': this.revealTransition.bind(this),
      'cover': this.coverTransition.bind(this),
      'pull': this.pullTransition.bind(this),
      'blinds': this.blindsTransition.bind(this),
      'dissolve': this.dissolveTransition.bind(this),
      'newsflash': this.newsflashTransition.bind(this),
      'wheel': this.wheelTransition.bind(this),
      'random': this.randomTransition.bind(this),
      'morph': this.morphTransition.bind(this),
    }

    return transitions[type] || transitions['fade']
  }

  /**
   * No transition
   */
  private async noneTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement
  ): Promise<void> {
    newSlide.style.opacity = '1'
    if (oldSlide) {
      oldSlide.style.opacity = '0'
    }
  }

  /**
   * Fade transition
   */
  private async fadeTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.opacity = '0'
      newSlide.style.transition = `opacity ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `opacity ${duration}ms ease`
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.opacity = '1'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Push transition
   */
  private async pushTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      const from = direction === 'forward' ? '100%' : '-100%'
      const to = direction === 'forward' ? '-100%' : '100%'

      newSlide.style.transform = `translateX(${from})`
      newSlide.style.opacity = '1'
      newSlide.style.transition = `transform ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `transform ${duration}ms ease`
        oldSlide.style.transform = `translateX(${to})`
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'translateX(0)'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Wipe transition
   */
  private async wipeTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      const from = direction === 'forward' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)'
      const to = 'inset(0 0 0 0)'

      newSlide.style.clipPath = from
      newSlide.style.opacity = '1'
      newSlide.style.transition = `clip-path ${duration}ms ease`

      requestAnimationFrame(() => {
        newSlide.style.clipPath = to
      })

      setTimeout(() => {
        if (oldSlide) {
          oldSlide.style.opacity = '0'
        }
        resolve()
      }, duration)
    })
  }

  /**
   * Split transition
   */
  private async splitTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.clipPath = 'inset(50% 0)'
      newSlide.style.opacity = '1'
      newSlide.style.transition = `clip-path ${duration}ms ease`

      requestAnimationFrame(() => {
        newSlide.style.clipPath = 'inset(0 0)'
      })

      setTimeout(() => {
        if (oldSlide) {
          oldSlide.style.opacity = '0'
        }
        resolve()
      }, duration)
    })
  }

  /**
   * Zoom transition
   */
  private async zoomTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.transform = 'scale(0.5)'
      newSlide.style.opacity = '0'
      newSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
        oldSlide.style.transform = 'scale(1.5)'
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'scale(1)'
        newSlide.style.opacity = '1'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Reveal transition
   */
  private async revealTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.opacity = '1'
      newSlide.style.zIndex = '0'

      if (oldSlide) {
        oldSlide.style.zIndex = '1'
        const translateTo = direction === 'forward' ? '-100%' : '100%'
        oldSlide.style.transition = `transform ${duration}ms ease`
        oldSlide.style.transform = `translateX(${translateTo})`
      }

      setTimeout(resolve, duration)
    })
  }

  /**
   * Cover transition
   */
  private async coverTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      const from = direction === 'forward' ? '100%' : '-100%'

      newSlide.style.transform = `translateX(${from})`
      newSlide.style.opacity = '1'
      newSlide.style.zIndex = '1'
      newSlide.style.transition = `transform ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.zIndex = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'translateX(0)'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Pull transition
   */
  private async pullTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return this.pushTransition(oldSlide, newSlide, duration, direction)
  }

  /**
   * Blinds transition
   */
  private async blindsTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.transform = 'scaleY(0)'
      newSlide.style.transformOrigin = 'top'
      newSlide.style.opacity = '1'
      newSlide.style.transition = `transform ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `opacity ${duration}ms ease`
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'scaleY(1)'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Dissolve transition
   */
  private async dissolveTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.opacity = '0'
      newSlide.style.filter = 'blur(10px)'
      newSlide.style.transition = `opacity ${duration}ms ease, filter ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `opacity ${duration}ms ease, filter ${duration}ms ease`
        oldSlide.style.filter = 'blur(10px)'
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.opacity = '1'
        newSlide.style.filter = 'blur(0)'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Newsflash transition
   */
  private async newsflashTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.transform = 'rotate(-15deg) scale(0)'
      newSlide.style.opacity = '0'
      newSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
        oldSlide.style.transform = 'rotate(15deg) scale(2)'
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'rotate(0) scale(1)'
        newSlide.style.opacity = '1'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Wheel transition
   */
  private async wheelTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newSlide.style.transform = 'rotate(-180deg) scale(0)'
      newSlide.style.opacity = '0'
      newSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`

      if (oldSlide) {
        oldSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
        oldSlide.style.transform = 'rotate(180deg) scale(0)'
        oldSlide.style.opacity = '0'
      }

      requestAnimationFrame(() => {
        newSlide.style.transform = 'rotate(0deg) scale(1)'
        newSlide.style.opacity = '1'
      })

      setTimeout(resolve, duration)
    })
  }

  /**
   * Random transition
   */
  private async randomTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    const transitions = [
      'fade', 'push', 'wipe', 'zoom', 'split',
      'dissolve', 'blinds', 'wheel'
    ]
    const randomType = transitions[Math.floor(Math.random() * transitions.length)]
    const transitionFn = this.getTransitionFunction(randomType)

    return transitionFn(oldSlide, newSlide, duration, direction)
  }

  /**
   * Morph transition (simplified - real morph would need element matching)
   */
  private async morphTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    duration: number
  ): Promise<void> {
    // Morph transition is complex and requires matching elements between slides
    // This is a simplified fade version
    return this.fadeTransition(oldSlide, newSlide, duration)
  }

  /**
   * Set default transition duration
   */
  setDefaultDuration(duration: number): void {
    this.defaultDuration = duration
  }
}
