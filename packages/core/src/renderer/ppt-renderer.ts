/**
 * PPT Renderer - Main renderer for PPT presentations
 */

import type {
  Presentation,
  Slide,
  RenderOptions,
  RendererEvents,
  RendererState,
} from '../types'
import { SlideRenderer } from './slide-renderer'
import { AnimationController } from './animation-controller'

/** Default render options */
const DEFAULT_OPTIONS: RenderOptions = {
  container: '',
  initialSlide: 0,
  enableAnimations: true,
  enableTransitions: true,
  scaleMode: 'fit',
  backgroundColor: '#000000',
  enableTouch: true,
  enableKeyboard: true,
  showControls: true,
  controlPosition: 'bottom',
  showProgress: true,
  showSlideNumber: 'currentTotal',
  autoPlay: false,
  autoPlayInterval: 5000,
  loop: false,
  lazyLoad: 3,
  highDpi: true,
  maxPixelRatio: 2,
  useWebGL: false,
}

/**
 * Main PPT Renderer class
 */
export class PPTRenderer {
  private options: RenderOptions
  private events: RendererEvents
  private container: HTMLElement | null = null
  private presentation: Presentation | null = null
  private slideRenderer: SlideRenderer | null = null
  private animationController: AnimationController | null = null

  private state: RendererState = {
    currentSlide: 0,
    totalSlides: 0,
    isPlaying: false,
    isFullscreen: false,
    isPaused: false,
    animationStep: 0,
    totalAnimationSteps: 0,
    scale: 1,
    width: 0,
    height: 0,
  }

  // DOM Elements
  private slideContainer: HTMLElement | null = null
  private controlsContainer: HTMLElement | null = null
  private progressBar: HTMLElement | null = null
  private slideNumberDisplay: HTMLElement | null = null

  // Auto-play
  private autoPlayTimer: number | null = null

  // Lazy loading
  private loadedSlides: Set<number> = new Set()

  constructor(options: Partial<RenderOptions> = {}, events: RendererEvents = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.events = events
  }

  /**
   * Initialize renderer with container
   */
  async init(presentation: Presentation): Promise<void> {
    this.presentation = presentation
    this.state.totalSlides = presentation.slides.length

    // Get container element
    const container = typeof this.options.container === 'string'
      ? document.querySelector<HTMLElement>(this.options.container)
      : this.options.container

    if (!container) {
      throw new Error('Container element not found')
    }

    this.container = container

    // Setup DOM structure
    this.setupDOM()

    // Initialize slide renderer
    this.slideRenderer = new SlideRenderer(
      presentation,
      this.slideContainer!,
      this.options
    )

    // Initialize animation controller
    if (this.options.enableAnimations) {
      this.animationController = new AnimationController(
        presentation,
        this.slideRenderer,
        this.events
      )
    }

    // Setup event listeners
    this.setupEventListeners()

    // Calculate initial scale
    this.updateScale()

    // Go to initial slide
    await this.goToSlide(this.options.initialSlide || 0)

    // Emit ready event
    this.events.ready?.(presentation)
  }

  /**
   * Setup DOM structure
   */
  private setupDOM(): void {
    if (!this.container) return

    // Clear container
    this.container.innerHTML = ''

    // Set container styles
    this.container.style.position = 'relative'
    this.container.style.overflow = 'hidden'
    this.container.style.backgroundColor = this.options.backgroundColor || '#000000'
    this.container.classList.add('ppt-renderer')

    // Create slide container
    this.slideContainer = document.createElement('div')
    this.slideContainer.className = 'ppt-slide-container'
    this.slideContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transform-origin: center center;
      overflow: hidden;
    `
    this.container.appendChild(this.slideContainer)

    // Create controls if enabled
    if (this.options.showControls) {
      this.createControls()
    }

    // Create progress bar if enabled
    if (this.options.showProgress) {
      this.createProgressBar()
    }

    // Create slide number display if enabled
    if (this.options.showSlideNumber) {
      this.createSlideNumberDisplay()
    }

    // Add CSS
    this.injectStyles()
  }

  /**
   * Create navigation controls
   */
  private createControls(): void {
    this.controlsContainer = document.createElement('div')
    this.controlsContainer.className = 'ppt-controls'

    const position = this.options.controlPosition || 'bottom'

    if (position === 'bottom') {
      this.controlsContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 100;
      `
    } else {
      this.controlsContainer.style.cssText = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 100;
      `
      if (position === 'sides') {
        // Left and right navigation
        const leftBtn = this.createButton('❮', () => this.previous())
        const rightBtn = this.createButton('❯', () => this.next())

        leftBtn.style.cssText = `
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
        `
        rightBtn.style.cssText = `
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
        `

        this.container?.appendChild(leftBtn)
        this.container?.appendChild(rightBtn)
        return
      }
    }

    // Previous button
    const prevBtn = this.createButton('❮', () => this.previous())
    this.controlsContainer.appendChild(prevBtn)

    // Play/Pause button
    const playBtn = this.createButton('▶', () => this.togglePlayPause())
    playBtn.className = 'ppt-play-btn'
    this.controlsContainer.appendChild(playBtn)

    // Next button
    const nextBtn = this.createButton('❯', () => this.next())
    this.controlsContainer.appendChild(nextBtn)

    // Fullscreen button
    const fsBtn = this.createButton('⛶', () => this.toggleFullscreen())
    this.controlsContainer.appendChild(fsBtn)

    this.container?.appendChild(this.controlsContainer)
  }

  /**
   * Create a control button
   */
  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = 'ppt-control-btn'
    button.textContent = label
    button.addEventListener('click', onClick)
    return button
  }

  /**
   * Create progress bar
   */
  private createProgressBar(): void {
    const progressContainer = document.createElement('div')
    progressContainer.className = 'ppt-progress-container'
    progressContainer.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255,255,255,0.2);
      z-index: 100;
    `

    this.progressBar = document.createElement('div')
    this.progressBar.className = 'ppt-progress-bar'
    this.progressBar.style.cssText = `
      height: 100%;
      background: #4285f4;
      transition: width 0.3s ease;
      width: 0%;
    `

    progressContainer.appendChild(this.progressBar)
    this.container?.appendChild(progressContainer)
  }

  /**
   * Create slide number display
   */
  private createSlideNumberDisplay(): void {
    this.slideNumberDisplay = document.createElement('div')
    this.slideNumberDisplay.className = 'ppt-slide-number'
    this.slideNumberDisplay.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 100;
    `

    this.container?.appendChild(this.slideNumberDisplay)
    this.updateSlideNumber()
  }

  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    const styleId = 'ppt-renderer-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .ppt-renderer {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      
      .ppt-control-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ppt-control-btn:hover {
        background: rgba(255,255,255,0.4);
      }
      
      .ppt-control-btn:active {
        background: rgba(255,255,255,0.6);
      }
      
      .ppt-slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        overflow: hidden;
      }
      
      .ppt-shape {
        position: absolute;
        box-sizing: border-box;
      }
      
      .ppt-text {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      .ppt-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      /* Transition animations */
      .ppt-slide-enter {
        opacity: 0;
      }
      
      .ppt-slide-enter-active {
        opacity: 1;
        transition: opacity 0.5s ease;
      }
      
      .ppt-slide-exit {
        opacity: 1;
      }
      
      .ppt-slide-exit-active {
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      
      /* Animation classes */
      .ppt-anim-fade-in {
        animation: ppt-fade-in 0.5s ease forwards;
      }
      
      .ppt-anim-fade-out {
        animation: ppt-fade-out 0.5s ease forwards;
      }
      
      .ppt-anim-fly-in-left {
        animation: ppt-fly-in-left 0.5s ease forwards;
      }
      
      .ppt-anim-fly-in-right {
        animation: ppt-fly-in-right 0.5s ease forwards;
      }
      
      .ppt-anim-fly-in-top {
        animation: ppt-fly-in-top 0.5s ease forwards;
      }
      
      .ppt-anim-fly-in-bottom {
        animation: ppt-fly-in-bottom 0.5s ease forwards;
      }
      
      .ppt-anim-zoom-in {
        animation: ppt-zoom-in 0.5s ease forwards;
      }
      
      .ppt-anim-zoom-out {
        animation: ppt-zoom-out 0.5s ease forwards;
      }
      
      @keyframes ppt-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes ppt-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes ppt-fly-in-left {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes ppt-fly-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes ppt-fly-in-top {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes ppt-fly-in-bottom {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes ppt-zoom-in {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes ppt-zoom-out {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0); opacity: 0; }
      }
    `

    document.head.appendChild(style)
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Keyboard navigation
    if (this.options.enableKeyboard) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this))
    }

    // Touch/swipe navigation
    if (this.options.enableTouch) {
      this.setupTouchEvents()
    }

    // Resize handling
    window.addEventListener('resize', this.handleResize.bind(this))

    // Fullscreen change
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this))
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
        e.preventDefault()
        this.next()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'Backspace':
        e.preventDefault()
        this.previous()
        break
      case 'Home':
        e.preventDefault()
        this.goToSlide(0)
        break
      case 'End':
        e.preventDefault()
        this.goToSlide(this.state.totalSlides - 1)
        break
      case 'Escape':
        if (this.state.isFullscreen) {
          this.exitFullscreen()
        }
        break
      case 'f':
      case 'F':
        this.toggleFullscreen()
        break
    }
  }

  /**
   * Setup touch events for swipe navigation
   */
  private setupTouchEvents(): void {
    if (!this.container) return

    let touchStartX = 0
    let touchStartY = 0

    this.container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    })

    this.container.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY

      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY

      // Minimum swipe distance
      const minSwipe = 50

      // Horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) {
          this.previous()
        } else {
          this.next()
        }
      }
    })
  }

  /**
   * Handle resize
   */
  private handleResize(): void {
    this.updateScale()
  }

  /**
   * Handle fullscreen change
   */
  private handleFullscreenChange(): void {
    this.state.isFullscreen = !!document.fullscreenElement
    this.updateScale()
  }

  /**
   * Update scale based on container size
   */
  private updateScale(): void {
    if (!this.container || !this.slideContainer || !this.presentation) return

    const containerRect = this.container.getBoundingClientRect()
    const slideWidth = this.presentation.properties.slideWidth / 914400 * 96 // EMU to pixels
    const slideHeight = this.presentation.properties.slideHeight / 914400 * 96

    let scale = 1

    switch (this.options.scaleMode) {
      case 'fit':
        scale = Math.min(
          containerRect.width / slideWidth,
          containerRect.height / slideHeight
        )
        break
      case 'fill':
        scale = Math.max(
          containerRect.width / slideWidth,
          containerRect.height / slideHeight
        )
        break
      case 'stretch':
        // Set width/height directly
        this.slideContainer.style.width = `${containerRect.width}px`
        this.slideContainer.style.height = `${containerRect.height}px`
        return
      case 'none':
        scale = 1
        break
    }

    // Apply high DPI scaling
    if (this.options.highDpi) {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        this.options.maxPixelRatio || 2
      )
      // Render at higher resolution but display at normal size
      // This is handled in the slide renderer
    }

    this.state.scale = scale
    this.state.width = slideWidth * scale
    this.state.height = slideHeight * scale

    this.slideContainer.style.width = `${slideWidth}px`
    this.slideContainer.style.height = `${slideHeight}px`
    this.slideContainer.style.transform = `translate(-50%, -50%) scale(${scale})`
  }

  /**
   * Go to specific slide
   */
  async goToSlide(index: number): Promise<void> {
    if (!this.presentation || !this.slideRenderer) return

    // Bounds check
    if (index < 0) index = 0
    if (index >= this.state.totalSlides) index = this.state.totalSlides - 1

    // Skip if already on this slide
    if (index === this.state.currentSlide && this.loadedSlides.has(index)) return

    const previousIndex = this.state.currentSlide
    this.state.currentSlide = index

    // Render slide
    await this.slideRenderer.renderSlide(index, previousIndex)
    this.loadedSlides.add(index)

    // Preload adjacent slides
    if (this.options.lazyLoad) {
      const preloadCount = typeof this.options.lazyLoad === 'number' ? this.options.lazyLoad : 3
      for (let i = 1; i <= preloadCount; i++) {
        if (index + i < this.state.totalSlides) {
          this.slideRenderer.preloadSlide(index + i)
        }
        if (index - i >= 0) {
          this.slideRenderer.preloadSlide(index - i)
        }
      }
    }

    // Reset animation state
    if (this.animationController) {
      this.animationController.reset()
      this.state.animationStep = 0
      this.state.totalAnimationSteps = this.animationController.getStepCount(index)
    }

    // Update UI
    this.updateProgress()
    this.updateSlideNumber()

    // Emit event
    this.events.slideChange?.(index, this.presentation.slides[index])
  }

  /**
   * Go to next slide or animation step
   */
  async next(): Promise<void> {
    // First, advance animations
    if (this.animationController && this.state.animationStep < this.state.totalAnimationSteps) {
      await this.animationController.next()
      this.state.animationStep++
      return
    }

    // Then go to next slide
    if (this.state.currentSlide < this.state.totalSlides - 1) {
      await this.goToSlide(this.state.currentSlide + 1)
    } else if (this.options.loop) {
      await this.goToSlide(0)
    }
  }

  /**
   * Go to previous slide
   */
  async previous(): Promise<void> {
    // If we have animation steps, go back to slide start
    if (this.state.animationStep > 0) {
      if (this.animationController) {
        this.animationController.reset()
      }
      this.state.animationStep = 0
      await this.goToSlide(this.state.currentSlide)
      return
    }

    // Go to previous slide
    if (this.state.currentSlide > 0) {
      await this.goToSlide(this.state.currentSlide - 1)
    } else if (this.options.loop) {
      await this.goToSlide(this.state.totalSlides - 1)
    }
  }

  /**
   * Update progress bar
   */
  private updateProgress(): void {
    if (!this.progressBar) return
    const progress = ((this.state.currentSlide + 1) / this.state.totalSlides) * 100
    this.progressBar.style.width = `${progress}%`
  }

  /**
   * Update slide number display
   */
  private updateSlideNumber(): void {
    if (!this.slideNumberDisplay) return

    const current = this.state.currentSlide + 1
    const total = this.state.totalSlides

    switch (this.options.showSlideNumber) {
      case 'current':
        this.slideNumberDisplay.textContent = `${current}`
        break
      case 'total':
        this.slideNumberDisplay.textContent = `${total}`
        break
      case 'currentTotal':
      case true:
        this.slideNumberDisplay.textContent = `${current} / ${total}`
        break
    }
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  /**
   * Start auto-play
   */
  play(): void {
    if (this.state.isPlaying) return

    this.state.isPlaying = true
    this.state.isPaused = false

    const interval = this.options.autoPlayInterval || 5000

    this.autoPlayTimer = window.setInterval(() => {
      this.next()
    }, interval)

    // Update play button
    const playBtn = this.controlsContainer?.querySelector('.ppt-play-btn')
    if (playBtn) playBtn.textContent = '⏸'

    this.events.slideshowStart?.()
  }

  /**
   * Pause auto-play
   */
  pause(): void {
    if (!this.state.isPlaying) return

    this.state.isPlaying = false
    this.state.isPaused = true

    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer)
      this.autoPlayTimer = null
    }

    // Update play button
    const playBtn = this.controlsContainer?.querySelector('.ppt-play-btn')
    if (playBtn) playBtn.textContent = '▶'

    this.events.slideshowEnd?.()
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen(): Promise<void> {
    if (this.state.isFullscreen) {
      await this.exitFullscreen()
    } else {
      await this.enterFullscreen()
    }
  }

  /**
   * Enter fullscreen
   */
  async enterFullscreen(): Promise<void> {
    if (!this.container) return

    try {
      await this.container.requestFullscreen()
      this.state.isFullscreen = true
    } catch (e) {
      console.error('Failed to enter fullscreen:', e)
    }
  }

  /**
   * Exit fullscreen
   */
  async exitFullscreen(): Promise<void> {
    try {
      await document.exitFullscreen()
      this.state.isFullscreen = false
    } catch (e) {
      console.error('Failed to exit fullscreen:', e)
    }
  }

  /**
   * Get current state
   */
  getState(): RendererState {
    return { ...this.state }
  }

  /**
   * Get current slide
   */
  getCurrentSlide(): Slide | null {
    if (!this.presentation) return null
    return this.presentation.slides[this.state.currentSlide]
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)

    // Stop auto-play
    this.pause()

    // Clear container
    if (this.container) {
      this.container.innerHTML = ''
    }

    // Clear references
    this.presentation = null
    this.slideRenderer = null
    this.animationController = null
  }
}
