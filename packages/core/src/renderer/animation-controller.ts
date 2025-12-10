/**
 * Animation Controller - Controls slide animations
 */

import type {
  Presentation,
  Slide,
  SlideElement,
  AnimationNode,
  AnimationEffect,
  RendererEvents,
} from '../types'
import type { SlideRenderer } from './slide-renderer'

/**
 * Animation step info
 */
interface AnimationStep {
  nodes: AnimationNode[]
  targetIds: number[]
}

/**
 * Animation Controller
 */
export class AnimationController {
  private presentation: Presentation
  private slideRenderer: SlideRenderer
  private events: RendererEvents

  private currentSlide: number = 0
  private currentStep: number = 0
  private steps: AnimationStep[] = []
  private isAnimating: boolean = false

  constructor(
    presentation: Presentation,
    slideRenderer: SlideRenderer,
    events: RendererEvents
  ) {
    this.presentation = presentation
    this.slideRenderer = slideRenderer
    this.events = events
  }

  /**
   * Get animation step count for a slide
   */
  getStepCount(slideIndex: number): number {
    const slide = this.presentation.slides[slideIndex]
    if (!slide?.timing?.sequenceList) return 0

    this.buildSteps(slide)
    return this.steps.length
  }

  /**
   * Build animation steps from slide timing
   */
  private buildSteps(slide: Slide): void {
    this.steps = []

    if (!slide.timing?.sequenceList) return

    // Process each sequence
    for (const sequence of slide.timing.sequenceList) {
      this.processSequence(sequence.children)
    }
  }

  /**
   * Process animation sequence
   */
  private processSequence(nodes: AnimationNode[]): void {
    for (const node of nodes) {
      if (node.type === 'sequence') {
        // Sequential animations - each is a step
        if (node.children) {
          for (const child of node.children) {
            this.addStep([child])
          }
        }
      } else if (node.type === 'parallel') {
        // Parallel animations - all in one step
        if (node.children) {
          this.addStep(node.children)
        }
      } else if (node.type === 'effect' || node.type === 'animate') {
        // Individual animation - is a step
        this.addStep([node])
      }
    }
  }

  /**
   * Add animation step
   */
  private addStep(nodes: AnimationNode[]): void {
    const targetIds = nodes
      .filter(n => n.targetId !== undefined)
      .map(n => n.targetId!)

    this.steps.push({ nodes, targetIds })
  }

  /**
   * Reset animations for current slide
   */
  reset(): void {
    this.currentStep = 0

    const slide = this.presentation.slides[this.currentSlide]
    if (slide) {
      this.buildSteps(slide)

      // Hide all animated elements initially
      for (const step of this.steps) {
        for (const targetId of step.targetIds) {
          const element = this.slideRenderer.getElementByShapeId(targetId)
          if (element) {
            // Check if it's an entrance animation
            const hasEntrance = step.nodes.some(n =>
              n.effect?.presetClass === 'entrance'
            )
            if (hasEntrance) {
              element.style.opacity = '0'
              element.style.visibility = 'hidden'
            }
          }
        }
      }
    }
  }

  /**
   * Go to next animation step
   */
  async next(): Promise<boolean> {
    if (this.currentStep >= this.steps.length) return false
    if (this.isAnimating) return false

    this.isAnimating = true

    const step = this.steps[this.currentStep]
    await this.playStep(step)

    this.currentStep++
    this.isAnimating = false

    return this.currentStep < this.steps.length
  }

  /**
   * Play an animation step
   */
  private async playStep(step: AnimationStep): Promise<void> {
    const promises: Promise<void>[] = []

    for (const node of step.nodes) {
      if (node.targetId !== undefined) {
        const element = this.slideRenderer.getElementByShapeId(node.targetId)
        if (element) {
          const target = this.getTargetElement(node.targetId)
          this.events.animationStart?.(target!, node)

          promises.push(this.playAnimation(element, node))
        }
      }
    }

    await Promise.all(promises)

    // Emit completion event
    for (const node of step.nodes) {
      if (node.targetId !== undefined) {
        const target = this.getTargetElement(node.targetId)
        this.events.animationComplete?.(target!, node)
      }
    }
  }

  /**
   * Get slide element by ID
   */
  private getTargetElement(id: number): SlideElement | undefined {
    const slide = this.presentation.slides[this.currentSlide]
    return slide?.elements.find(e => e.id === id)
  }

  /**
   * Play a single animation
   */
  private async playAnimation(element: HTMLElement, node: AnimationNode): Promise<void> {
    const duration = typeof node.duration === 'number' ? node.duration : 500

    // Make element visible
    element.style.visibility = 'visible'

    // Get animation class/style
    const animationStyle = this.getAnimationStyle(node)

    return new Promise((resolve) => {
      // Apply animation
      if (animationStyle.keyframes) {
        const animation = element.animate(animationStyle.keyframes, {
          duration,
          easing: this.getEasing(node),
          fill: 'forwards',
        })

        animation.onfinish = () => {
          // Apply final state
          if (animationStyle.finalState) {
            Object.assign(element.style, animationStyle.finalState)
          }
          resolve()
        }
      } else {
        // CSS class based animation
        element.classList.add(animationStyle.className || 'ppt-anim-fade-in')

        setTimeout(() => {
          element.classList.remove(animationStyle.className || 'ppt-anim-fade-in')
          if (animationStyle.finalState) {
            Object.assign(element.style, animationStyle.finalState)
          }
          resolve()
        }, duration)
      }
    })
  }

  /**
   * Get animation style for a node
   */
  private getAnimationStyle(node: AnimationNode): {
    className?: string
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    if (node.effect) {
      return this.getEffectAnimation(node.effect)
    }

    if (node.type === 'animateMotion') {
      return this.getMotionAnimation(node)
    }

    if (node.type === 'animateRotation') {
      return this.getRotationAnimation(node)
    }

    if (node.type === 'animateScale') {
      return this.getScaleAnimation(node)
    }

    if (node.type === 'animateColor') {
      return this.getColorAnimation(node)
    }

    // Default fade in
    return {
      keyframes: [
        { opacity: 0 },
        { opacity: 1 }
      ],
      finalState: { opacity: '1' }
    }
  }

  /**
   * Get effect animation
   */
  private getEffectAnimation(effect: AnimationEffect): {
    className?: string
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    const isEntrance = effect.presetClass === 'entrance'
    const isExit = effect.presetClass === 'exit'

    switch (effect.preset) {
      case 'appear':
      case 'disappear':
        return {
          keyframes: isEntrance
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }],
          finalState: { opacity: isEntrance ? '1' : '0' }
        }

      case 'fade':
      case 'fadeOut':
        return {
          keyframes: isEntrance
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }],
          finalState: { opacity: isEntrance ? '1' : '0' }
        }

      case 'fly':
      case 'flyOut':
        return {
          keyframes: isEntrance
            ? [
              { transform: 'translateX(-100%)', opacity: 0 },
              { transform: 'translateX(0)', opacity: 1 }
            ]
            : [
              { transform: 'translateX(0)', opacity: 1 },
              { transform: 'translateX(100%)', opacity: 0 }
            ],
          finalState: {
            transform: 'translateX(0)',
            opacity: isEntrance ? '1' : '0'
          }
        }

      case 'zoom':
      case 'zoomOut':
        return {
          keyframes: isEntrance
            ? [
              { transform: 'scale(0)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1 }
            ]
            : [
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(0)', opacity: 0 }
            ],
          finalState: {
            transform: 'scale(1)',
            opacity: isEntrance ? '1' : '0'
          }
        }

      case 'bounce':
        return {
          keyframes: [
            { transform: 'translateY(-100%)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-30%)', opacity: 1 },
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-15%)', opacity: 1 },
            { transform: 'translateY(0)', opacity: 1 }
          ],
          finalState: { transform: 'translateY(0)', opacity: '1' }
        }

      case 'spin':
        return {
          keyframes: [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(360deg)' }
          ],
          finalState: { transform: 'rotate(0deg)' }
        }

      case 'pulse':
        return {
          keyframes: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.1)' },
            { transform: 'scale(1)' }
          ],
          finalState: { transform: 'scale(1)' }
        }

      case 'wipe':
        return {
          keyframes: isEntrance
            ? [
              { clipPath: 'inset(0 100% 0 0)' },
              { clipPath: 'inset(0 0 0 0)' }
            ]
            : [
              { clipPath: 'inset(0 0 0 0)' },
              { clipPath: 'inset(0 0 0 100%)' }
            ],
          finalState: { clipPath: 'inset(0 0 0 0)' }
        }

      case 'blinds':
        return {
          keyframes: isEntrance
            ? [
              { opacity: 0, transform: 'scaleY(0)' },
              { opacity: 1, transform: 'scaleY(1)' }
            ]
            : [
              { opacity: 1, transform: 'scaleY(1)' },
              { opacity: 0, transform: 'scaleY(0)' }
            ],
          finalState: {
            transform: 'scaleY(1)',
            opacity: isEntrance ? '1' : '0'
          }
        }

      default:
        // Default to fade
        return {
          keyframes: [
            { opacity: isEntrance ? 0 : 1 },
            { opacity: isEntrance ? 1 : 0 }
          ],
          finalState: { opacity: isEntrance ? '1' : '0' }
        }
    }
  }

  /**
   * Get motion path animation
   */
  private getMotionAnimation(node: AnimationNode): {
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    if (!node.path) {
      return { keyframes: [{ offset: 0 }, { offset: 1 }] }
    }

    // Parse SVG path and create keyframes
    // This is simplified - full implementation would need path parsing
    return {
      keyframes: [
        { offset: 0, transform: 'translate(0, 0)' },
        { offset: 1, transform: 'translate(100px, 100px)' }
      ]
    }
  }

  /**
   * Get rotation animation
   */
  private getRotationAnimation(node: AnimationNode): {
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    const from = typeof node.from === 'number' ? node.from : 0
    const to = typeof node.to === 'number' ? node.to : 360

    return {
      keyframes: [
        { transform: `rotate(${from}deg)` },
        { transform: `rotate(${to}deg)` }
      ],
      finalState: { transform: `rotate(${to}deg)` }
    }
  }

  /**
   * Get scale animation
   */
  private getScaleAnimation(node: AnimationNode): {
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    return {
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.5)' },
        { transform: 'scale(1)' }
      ],
      finalState: { transform: 'scale(1)' }
    }
  }

  /**
   * Get color animation
   */
  private getColorAnimation(node: AnimationNode): {
    keyframes?: Keyframe[]
    finalState?: Partial<CSSStyleDeclaration>
  } {
    const from = node.from || '#000000'
    const to = node.to || '#FF0000'

    return {
      keyframes: [
        { color: String(from) },
        { color: String(to) }
      ],
      finalState: { color: String(to) }
    }
  }

  /**
   * Get easing function
   */
  private getEasing(node: AnimationNode): string {
    // Calculate easing based on acceleration/deceleration
    const accel = node.acceleration || 0
    const decel = node.deceleration || 0

    if (accel > 0 && decel > 0) {
      return 'ease-in-out'
    } else if (accel > 0) {
      return 'ease-in'
    } else if (decel > 0) {
      return 'ease-out'
    }

    return 'ease'
  }

  /**
   * Set current slide
   */
  setSlide(slideIndex: number): void {
    this.currentSlide = slideIndex
    this.reset()
  }

  /**
   * Check if there are more steps
   */
  hasMoreSteps(): boolean {
    return this.currentStep < this.steps.length
  }

  /**
   * Get current step index
   */
  getCurrentStep(): number {
    return this.currentStep
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.steps.length
  }
}
