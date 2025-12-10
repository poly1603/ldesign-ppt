/**
 * Slide Renderer - Renders individual slides
 */

import type {
  Presentation,
  Slide,
  SlideElement,
  SlideBackground,
  RenderOptions,
  Fill,
  Color,
} from '../types'
import { ShapeRenderer } from './shape-renderer'

/**
 * Slide Renderer
 */
export class SlideRenderer {
  private presentation: Presentation
  private container: HTMLElement
  private options: RenderOptions
  private shapeRenderer: ShapeRenderer

  private currentSlideElement: HTMLElement | null = null
  private preloadedSlides: Map<number, HTMLElement> = new Map()
  private blobUrls: Set<string> = new Set()

  constructor(
    presentation: Presentation,
    container: HTMLElement,
    options: RenderOptions
  ) {
    this.presentation = presentation
    this.container = container
    this.options = options
    this.shapeRenderer = new ShapeRenderer(presentation, options)
  }

  /**
   * Render a slide
   */
  async renderSlide(index: number, previousIndex?: number): Promise<void> {
    const slide = this.presentation.slides[index]
    if (!slide) return

    // Check if slide is preloaded
    let slideElement = this.preloadedSlides.get(index)

    if (!slideElement) {
      slideElement = await this.createSlideElement(slide, index)
    }

    // Handle transition
    if (this.options.enableTransitions && previousIndex !== undefined) {
      await this.animateTransition(slideElement, previousIndex < index ? 'forward' : 'backward', slide)
    } else {
      // Simply replace the slide
      if (this.currentSlideElement) {
        this.currentSlideElement.remove()
      }
      this.container.appendChild(slideElement)
    }

    this.currentSlideElement = slideElement
    this.preloadedSlides.delete(index) // Remove from preload cache
  }

  /**
   * Preload a slide
   */
  async preloadSlide(index: number): Promise<void> {
    if (this.preloadedSlides.has(index)) return

    const slide = this.presentation.slides[index]
    if (!slide) return

    const element = await this.createSlideElement(slide, index)
    this.preloadedSlides.set(index, element)
  }

  /**
   * Create slide DOM element
   */
  private async createSlideElement(slide: Slide, index: number): Promise<HTMLElement> {
    const slideElement = document.createElement('div')
    slideElement.className = 'ppt-slide'
    slideElement.setAttribute('data-slide-index', String(index))
    slideElement.setAttribute('data-slide-id', String(slide.id))

    // Get dimensions
    const width = this.presentation.properties.slideWidth / 914400 * 96
    const height = this.presentation.properties.slideHeight / 914400 * 96

    slideElement.style.width = `${width}px`
    slideElement.style.height = `${height}px`

    console.log(`[SlideRenderer] Rendering slide ${index}, dimensions: ${width}x${height}`)
    console.log(`[SlideRenderer] Slide elements count: ${slide.elements.length}`)

    // Render background
    await this.renderBackground(slideElement, slide, index)

    // Render elements
    for (const element of slide.elements) {
      console.log(`[SlideRenderer] Rendering element:`, element.type, element.name || element.id)
      const elementDom = await this.shapeRenderer.render(element, slide)
      if (elementDom) {
        slideElement.appendChild(elementDom)
      } else {
        console.warn(`[SlideRenderer] Element rendered as null:`, element)
      }
    }

    return slideElement
  }

  /**
   * Render slide background
   */
  private async renderBackground(
    slideElement: HTMLElement,
    slide: Slide,
    index: number
  ): Promise<void> {
    // Try slide background first
    let background = slide.background

    // Fall back to layout background
    if (!background?.fill) {
      const layout = this.presentation.masters
        .flatMap(m => m.layouts)
        .find(l => l.id === slide.layoutId)
      if (layout?.background) {
        background = layout.background
      }
    }

    // Fall back to master background
    if (!background?.fill) {
      const master = this.presentation.masters.find(m => m.id === slide.masterId)
      if (master?.background) {
        background = master.background
      }
    }

    // Default white background
    if (!background?.fill) {
      slideElement.style.backgroundColor = '#FFFFFF'
      return
    }

    await this.applyFill(slideElement, background.fill)
  }

  /**
   * Apply fill to element
   */
  private async applyFill(element: HTMLElement, fill: Fill): Promise<void> {
    switch (fill.type) {
      case 'none':
        element.style.backgroundColor = 'transparent'
        break

      case 'solid':
        if (fill.solid) {
          element.style.backgroundColor = this.resolveColor(fill.solid)
        }
        break

      case 'gradient':
        if (fill.gradient) {
          const { type, angle, stops } = fill.gradient

          if (type === 'linear') {
            const cssAngle = 90 - (angle || 0) // Convert to CSS angle
            const stopStrings = stops.map(stop => {
              const color = this.resolveColor(stop.color)
              const position = stop.position / 1000 // Convert from percentage * 1000
              return `${color} ${position}%`
            })
            element.style.background = `linear-gradient(${cssAngle}deg, ${stopStrings.join(', ')})`
          } else if (type === 'radial') {
            const stopStrings = stops.map(stop => {
              const color = this.resolveColor(stop.color)
              const position = stop.position / 1000
              return `${color} ${position}%`
            })
            element.style.background = `radial-gradient(circle, ${stopStrings.join(', ')})`
          }
        }
        break

      case 'picture':
        if (fill.picture) {
          const imagePath = fill.picture.embed
          const imageData = this.presentation.resources.images.get(`ppt/media/${imagePath}`)

          if (imageData) {
            const blob = new Blob([imageData], { type: this.getMimeType(imagePath) })
            const url = URL.createObjectURL(blob)
            this.blobUrls.add(url)

            element.style.backgroundImage = `url(${url})`
            element.style.backgroundSize = fill.picture.stretch ? 'cover' : 'contain'
            element.style.backgroundPosition = 'center'
            element.style.backgroundRepeat = 'no-repeat'
          }
        }
        break

      case 'pattern':
        if (fill.pattern) {
          // Pattern fills would require SVG patterns
          // For now, use foreground color as solid
          element.style.backgroundColor = this.resolveColor(fill.pattern.foregroundColor)
        }
        break
    }
  }

  /**
   * Resolve color to CSS string
   */
  private resolveColor(color: Color): string {
    if (color.type === 'rgb') {
      let colorValue = color.value
      if (!colorValue.startsWith('#')) {
        colorValue = `#${colorValue}`
      }
      if (color.alpha !== undefined && color.alpha < 100) {
        // Convert to rgba
        const r = parseInt(colorValue.slice(1, 3), 16)
        const g = parseInt(colorValue.slice(3, 5), 16)
        const b = parseInt(colorValue.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${color.alpha / 100})`
      }
      return colorValue
    }

    if (color.type === 'scheme') {
      // Resolve from theme
      return this.resolveSchemeColor(color.value, color.alpha)
    }

    if (color.type === 'preset') {
      return this.presetColorToCSS(color.value)
    }

    return color.value
  }

  /**
   * Resolve scheme color from theme
   */
  private resolveSchemeColor(schemeName: string, alpha?: number): string {
    // Get theme from first master
    const theme = this.presentation.masters[0]?.theme
    if (!theme) return '#000000'

    const colorMap: Record<string, keyof typeof theme.colorScheme.colors> = {
      'tx1': 'dk1',
      'tx2': 'dk2',
      'bg1': 'lt1',
      'bg2': 'lt2',
      'dk1': 'dk1',
      'dk2': 'dk2',
      'lt1': 'lt1',
      'lt2': 'lt2',
      'accent1': 'accent1',
      'accent2': 'accent2',
      'accent3': 'accent3',
      'accent4': 'accent4',
      'accent5': 'accent5',
      'accent6': 'accent6',
      'hlink': 'hlink',
      'folHlink': 'folHlink',
    }

    const colorKey = colorMap[schemeName] || 'dk1'
    const themeColor = theme.colorScheme.colors[colorKey]

    if (themeColor) {
      return this.resolveColor({ ...themeColor, alpha })
    }

    return '#000000'
  }

  /**
   * Convert preset color name to CSS
   */
  private presetColorToCSS(preset: string): string {
    const presetColors: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'cyan': '#00FFFF',
      'magenta': '#FF00FF',
      // Add more preset colors as needed
    }

    return presetColors[preset] || preset
  }

  /**
   * Get MIME type from file path
   */
  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  /**
   * Animate slide transition
   */
  private async animateTransition(
    newSlide: HTMLElement,
    direction: 'forward' | 'backward',
    slide: Slide
  ): Promise<void> {
    const transition = slide.transition
    const duration = transition?.duration || 500
    const type = transition?.type || 'fade'

    // Add new slide (hidden initially)
    newSlide.style.opacity = '0'
    this.container.appendChild(newSlide)

    // Animate based on transition type
    await this.playTransition(this.currentSlideElement, newSlide, type, duration, direction)

    // Remove old slide
    if (this.currentSlideElement) {
      this.currentSlideElement.remove()
    }
  }

  /**
   * Play transition animation
   */
  private async playTransition(
    oldSlide: HTMLElement | null,
    newSlide: HTMLElement,
    type: string,
    duration: number,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      // Apply transition based on type
      switch (type) {
        case 'fade':
          newSlide.style.transition = `opacity ${duration}ms ease`
          if (oldSlide) {
            oldSlide.style.transition = `opacity ${duration}ms ease`
            oldSlide.style.opacity = '0'
          }
          newSlide.style.opacity = '1'
          break

        case 'push':
        case 'wipe':
          const translateFrom = direction === 'forward' ? '100%' : '-100%'
          const translateTo = direction === 'forward' ? '-100%' : '100%'

          newSlide.style.transform = `translateX(${translateFrom})`
          newSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
          newSlide.style.opacity = '1'

          if (oldSlide) {
            oldSlide.style.transition = `transform ${duration}ms ease`
            oldSlide.style.transform = `translateX(${translateTo})`
          }

          requestAnimationFrame(() => {
            newSlide.style.transform = 'translateX(0)'
          })
          break

        case 'zoom':
          newSlide.style.transform = 'scale(0.5)'
          newSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
          newSlide.style.opacity = '1'

          if (oldSlide) {
            oldSlide.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`
            oldSlide.style.transform = 'scale(1.5)'
            oldSlide.style.opacity = '0'
          }

          requestAnimationFrame(() => {
            newSlide.style.transform = 'scale(1)'
          })
          break

        default:
          // Default to fade
          newSlide.style.opacity = '1'
          if (oldSlide) {
            oldSlide.style.opacity = '0'
          }
      }

      setTimeout(resolve, duration)
    })
  }

  /**
   * Get element by shape ID
   */
  getElementByShapeId(shapeId: number): HTMLElement | null {
    return this.currentSlideElement?.querySelector(`[data-shape-id="${shapeId}"]`) || null
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Revoke all blob URLs
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url)
    }
    this.blobUrls.clear()

    // Clear preloaded slides
    this.preloadedSlides.clear()

    // Remove current slide
    if (this.currentSlideElement) {
      this.currentSlideElement.remove()
      this.currentSlideElement = null
    }
  }
}
