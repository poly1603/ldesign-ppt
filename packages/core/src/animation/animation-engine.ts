/**
 * Animation Engine - Core animation playback engine
 */

import type {
  AnimationEffect,
  AnimationNode,
  AnimationPreset,
} from '../types'

/** Animation state */
export type AnimationState = 'idle' | 'running' | 'paused' | 'finished'

/** Animation playback options */
export interface PlaybackOptions {
  speed?: number
  reverse?: boolean
  startTime?: number
}

/**
 * Animation Engine
 */
export class AnimationEngine {
  private state: AnimationState = 'idle'
  private currentTime: number = 0
  private speed: number = 1
  private rafId: number | null = null
  private startTimestamp: number = 0

  private animations: Map<string, {
    element: HTMLElement
    keyframes: Keyframe[]
    options: KeyframeAnimationOptions
    animation?: Animation
  }> = new Map()

  private onUpdateCallback?: (time: number) => void
  private onCompleteCallback?: () => void

  /**
   * Add animation to the engine
   */
  addAnimation(
    id: string,
    element: HTMLElement,
    effect: AnimationEffect | AnimationNode,
    duration: number = 500
  ): void {
    const { keyframes, options } = this.createAnimationConfig(effect, duration)

    this.animations.set(id, {
      element,
      keyframes,
      options,
    })
  }

  /**
   * Create animation configuration from effect
   */
  private createAnimationConfig(
    effect: AnimationEffect | AnimationNode,
    duration: number
  ): { keyframes: Keyframe[]; options: KeyframeAnimationOptions } {
    const options: KeyframeAnimationOptions = {
      duration,
      easing: 'ease',
      fill: 'forwards',
    }

    let keyframes: Keyframe[] = []

    if ('preset' in effect && effect.preset) {
      keyframes = this.getPresetKeyframes(effect.preset, effect.presetClass === 'entrance')
    } else if ('type' in effect) {
      // AnimationNode
      keyframes = this.getNodeKeyframes(effect as AnimationNode)
    }

    return { keyframes, options }
  }

  /**
   * Get keyframes for preset animation
   */
  private getPresetKeyframes(preset: AnimationPreset, isEntrance: boolean): Keyframe[] {
    const presetAnimations: Record<string, { in: Keyframe[]; out: Keyframe[] }> = {
      'appear': {
        in: [{ opacity: 0 }, { opacity: 1 }],
        out: [{ opacity: 1 }, { opacity: 0 }]
      },
      'fade': {
        in: [{ opacity: 0 }, { opacity: 1 }],
        out: [{ opacity: 1 }, { opacity: 0 }]
      },
      'fly': {
        in: [
          { transform: 'translateX(-100%)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ],
        out: [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: 'translateX(100%)', opacity: 0 }
        ]
      },
      'zoom': {
        in: [
          { transform: 'scale(0)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ],
        out: [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0)', opacity: 0 }
        ]
      },
      'wipe': {
        in: [
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0 0 0)' }
        ],
        out: [
          { clipPath: 'inset(0 0 0 0)' },
          { clipPath: 'inset(0 0 0 100%)' }
        ]
      },
      'split': {
        in: [
          { clipPath: 'inset(50% 0)' },
          { clipPath: 'inset(0 0)' }
        ],
        out: [
          { clipPath: 'inset(0 0)' },
          { clipPath: 'inset(50% 0)' }
        ]
      },
      'wheel': {
        in: [
          { transform: 'rotate(-180deg) scale(0)', opacity: 0 },
          { transform: 'rotate(0deg) scale(1)', opacity: 1 }
        ],
        out: [
          { transform: 'rotate(0deg) scale(1)', opacity: 1 },
          { transform: 'rotate(180deg) scale(0)', opacity: 0 }
        ]
      },
      'bounce': {
        in: [
          { transform: 'translateY(-100%)', opacity: 0, offset: 0 },
          { transform: 'translateY(0)', opacity: 1, offset: 0.6 },
          { transform: 'translateY(-30%)', opacity: 1, offset: 0.75 },
          { transform: 'translateY(0)', opacity: 1, offset: 0.9 },
          { transform: 'translateY(-15%)', opacity: 1, offset: 0.95 },
          { transform: 'translateY(0)', opacity: 1, offset: 1 }
        ],
        out: [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(100%)', opacity: 0 }
        ]
      },
      'float': {
        in: [
          { transform: 'translateY(40px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ],
        out: [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(-40px)', opacity: 0 }
        ]
      },
      'swivel': {
        in: [
          { transform: 'rotateY(-90deg)', opacity: 0 },
          { transform: 'rotateY(0deg)', opacity: 1 }
        ],
        out: [
          { transform: 'rotateY(0deg)', opacity: 1 },
          { transform: 'rotateY(90deg)', opacity: 0 }
        ]
      },
      'grow': {
        in: [
          { transform: 'scale(0.5)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ],
        out: [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.5)', opacity: 0 }
        ]
      },
      'spin': {
        in: [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ],
        out: [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-360deg)' }
        ]
      },
      'pulse': {
        in: [
          { transform: 'scale(1)', offset: 0 },
          { transform: 'scale(1.1)', offset: 0.5 },
          { transform: 'scale(1)', offset: 1 }
        ],
        out: [
          { transform: 'scale(1)', offset: 0 },
          { transform: 'scale(0.9)', offset: 0.5 },
          { transform: 'scale(1)', offset: 1 }
        ]
      }
    }

    const animation = presetAnimations[preset] || presetAnimations['fade']
    return isEntrance ? animation.in : animation.out
  }

  /**
   * Get keyframes for animation node
   */
  private getNodeKeyframes(node: AnimationNode): Keyframe[] {
    switch (node.type) {
      case 'animateRotation':
        return [
          { transform: `rotate(${node.from || 0}deg)` },
          { transform: `rotate(${node.to || 360}deg)` }
        ]

      case 'animateScale':
        return [
          { transform: 'scale(1)' },
          { transform: 'scale(1.5)' },
          { transform: 'scale(1)' }
        ]

      case 'animateColor':
        return [
          { color: String(node.from || '#000000') },
          { color: String(node.to || '#FF0000') }
        ]

      case 'animateMotion':
        // Motion path would need SVG path parsing
        return [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(100px, 100px)' }
        ]

      default:
        return [
          { opacity: 0 },
          { opacity: 1 }
        ]
    }
  }

  /**
   * Play all animations
   */
  play(options: PlaybackOptions = {}): void {
    if (this.state === 'running') return

    this.speed = options.speed ?? 1
    this.state = 'running'

    // Start all animations
    for (const [id, config] of this.animations) {
      const animation = config.element.animate(config.keyframes, {
        ...config.options,
        playbackRate: this.speed,
        direction: options.reverse ? 'reverse' : 'normal',
      })

      config.animation = animation
    }

    // Start update loop
    this.startUpdateLoop()
  }

  /**
   * Pause all animations
   */
  pause(): void {
    if (this.state !== 'running') return

    this.state = 'paused'

    for (const [, config] of this.animations) {
      config.animation?.pause()
    }

    this.stopUpdateLoop()
  }

  /**
   * Resume paused animations
   */
  resume(): void {
    if (this.state !== 'paused') return

    this.state = 'running'

    for (const [, config] of this.animations) {
      config.animation?.play()
    }

    this.startUpdateLoop()
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.state = 'idle'

    for (const [, config] of this.animations) {
      config.animation?.cancel()
      config.animation = undefined
    }

    this.stopUpdateLoop()
    this.currentTime = 0
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.currentTime = time

    for (const [, config] of this.animations) {
      if (config.animation) {
        config.animation.currentTime = time
      }
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = speed

    for (const [, config] of this.animations) {
      if (config.animation) {
        config.animation.playbackRate = speed
      }
    }
  }

  /**
   * Start update loop
   */
  private startUpdateLoop(): void {
    this.startTimestamp = performance.now()

    const update = (timestamp: number) => {
      if (this.state !== 'running') return

      this.currentTime = (timestamp - this.startTimestamp) * this.speed
      this.onUpdateCallback?.(this.currentTime)

      // Check if all animations are finished
      let allFinished = true
      for (const [, config] of this.animations) {
        if (config.animation && config.animation.playState !== 'finished') {
          allFinished = false
          break
        }
      }

      if (allFinished) {
        this.state = 'finished'
        this.onCompleteCallback?.()
        return
      }

      this.rafId = requestAnimationFrame(update)
    }

    this.rafId = requestAnimationFrame(update)
  }

  /**
   * Stop update loop
   */
  private stopUpdateLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Set update callback
   */
  onUpdate(callback: (time: number) => void): void {
    this.onUpdateCallback = callback
  }

  /**
   * Set complete callback
   */
  onComplete(callback: () => void): void {
    this.onCompleteCallback = callback
  }

  /**
   * Get current state
   */
  getState(): AnimationState {
    return this.state
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.currentTime
  }

  /**
   * Remove animation
   */
  removeAnimation(id: string): void {
    const config = this.animations.get(id)
    if (config?.animation) {
      config.animation.cancel()
    }
    this.animations.delete(id)
  }

  /**
   * Clear all animations
   */
  clear(): void {
    this.stop()
    this.animations.clear()
  }

  /**
   * Destroy engine
   */
  destroy(): void {
    this.clear()
    this.onUpdateCallback = undefined
    this.onCompleteCallback = undefined
  }
}
