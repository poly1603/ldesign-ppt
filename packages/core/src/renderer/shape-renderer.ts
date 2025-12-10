/**
 * Shape Renderer - Renders shape elements
 */

import type {
  Presentation,
  Slide,
  SlideElement,
  Shape,
  Picture,
  Table,
  Chart,
  GroupShape,
  Connector,
  Transform,
  Fill,
  LineStyle,
  Effects,
  Color,
  RenderOptions,
} from '../types'
import { TextRenderer } from './text-renderer'
import { GeometryRenderer } from './geometry-renderer'

/**
 * Shape Renderer
 */
export class ShapeRenderer {
  private presentation: Presentation
  private options: RenderOptions
  private textRenderer: TextRenderer
  private geometryRenderer: GeometryRenderer
  private blobUrls: Set<string> = new Set()

  constructor(presentation: Presentation, options: RenderOptions) {
    this.presentation = presentation
    this.options = options
    this.textRenderer = new TextRenderer(presentation)
    // Get theme from resources for color resolution
    const theme = presentation.resources.themes?.values().next().value || null
    this.geometryRenderer = new GeometryRenderer(theme)
  }

  /**
   * Render a slide element
   */
  async render(element: SlideElement, slide: Slide): Promise<HTMLElement | null> {
    switch (element.type) {
      case 'shape':
        return this.renderShape(element, slide)
      case 'picture':
        return this.renderPicture(element, slide)
      case 'table':
        return this.renderTable(element, slide)
      case 'chart':
        return this.renderChart(element, slide)
      case 'group':
        return this.renderGroup(element, slide)
      case 'connector':
        return this.renderConnector(element, slide)
      case 'diagram':
        return this.renderDiagram(element, slide)
      case 'media':
        return this.renderMedia(element, slide)
      case 'ole':
        return this.renderOle(element, slide)
      default:
        console.warn('Unknown element type:', (element as any).type)
        return null
    }
  }

  /**
   * Render a shape
   */
  private async renderShape(shape: Shape, slide: Slide): Promise<HTMLElement> {
    const element = document.createElement('div')
    element.className = 'ppt-shape'
    element.setAttribute('data-shape-id', String(shape.id))
    element.setAttribute('data-shape-name', shape.name)

    // Apply transform
    this.applyTransform(element, shape.transform)

    // Handle picture fill - apply background image to container
    if (shape.fill?.type === 'picture') {
      await this.applyFill(element, shape.fill)
    }

    // Create SVG for shape geometry
    if (shape.geometry) {
      // For picture fills, don't pass fill to SVG - use transparent
      const svgFill = shape.fill?.type === 'picture' ? { type: 'none' as const } : shape.fill
      const svg = this.geometryRenderer.renderGeometry(
        shape.geometry,
        shape.transform.extents.width,
        shape.transform.extents.height,
        svgFill,
        shape.line
      )
      if (svg) {
        svg.style.position = 'absolute'
        svg.style.top = '0'
        svg.style.left = '0'
        svg.style.width = '100%'
        svg.style.height = '100%'
        element.appendChild(svg)
      }
    } else {
      // No geometry, apply fill to element directly
      await this.applyFill(element, shape.fill)
      this.applyLine(element, shape.line)
    }

    // Apply effects
    this.applyEffects(element, shape.effects)

    // Render text
    if (shape.textBody) {
      const textElement = this.textRenderer.render(shape.textBody, shape)
      if (textElement) {
        element.appendChild(textElement)
      }
    }

    return element
  }

  /**
   * Render a picture
   */
  private async renderPicture(picture: Picture, slide: Slide): Promise<HTMLElement> {
    const element = document.createElement('div')
    element.className = 'ppt-shape ppt-picture'
    element.setAttribute('data-shape-id', String(picture.id))

    // Apply transform
    this.applyTransform(element, picture.transform)

    // Get image data
    const imagePath = picture.blipFill.embed
    const fullPath = imagePath.startsWith('ppt/') ? imagePath : `ppt/media/${imagePath.replace('../media/', '')}`
    const imageData = this.presentation.resources.images.get(fullPath)

    if (imageData) {
      const img = document.createElement('img')
      img.className = 'ppt-image'

      const blob = new Blob([imageData], { type: this.getMimeType(imagePath) })
      const url = URL.createObjectURL(blob)
      this.blobUrls.add(url)

      img.src = url
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = picture.blipFill.stretch ? 'fill' : 'contain'

      // Apply crop if srcRect exists
      if (picture.blipFill.srcRect) {
        const { left, top, right, bottom } = picture.blipFill.srcRect
        // srcRect is in percentage * 1000
        img.style.objectPosition = `${left / 1000}% ${top / 1000}%`
        // Apply clip-path for cropping
        const clipLeft = left / 1000
        const clipTop = top / 1000
        const clipRight = 100 - right / 1000
        const clipBottom = 100 - bottom / 1000
        img.style.clipPath = `inset(${clipTop}% ${100 - clipRight}% ${100 - clipBottom}% ${clipLeft}%)`
      }

      element.appendChild(img)
    }

    // Apply geometry (clip path)
    if (picture.geometry) {
      const clipPath = this.geometryRenderer.getClipPath(picture.geometry)
      if (clipPath) {
        element.style.clipPath = clipPath
      }
    }

    // Apply effects
    this.applyEffects(element, picture.effects)

    return element
  }

  /**
   * Render a table
   */
  private async renderTable(table: Table, slide: Slide): Promise<HTMLElement> {
    const container = document.createElement('div')
    container.className = 'ppt-shape ppt-table-container'
    container.setAttribute('data-shape-id', String(table.id))

    // Apply transform
    this.applyTransform(container, table.transform)

    const tableElement = document.createElement('table')
    tableElement.className = 'ppt-table'
    tableElement.style.cssText = `
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    `

    // Calculate column widths
    const totalWidth = table.columns.reduce((sum, col) => sum + col.width, 0)

    // Create column group
    const colgroup = document.createElement('colgroup')
    for (const col of table.columns) {
      const colEl = document.createElement('col')
      colEl.style.width = `${(col.width / totalWidth) * 100}%`
      colgroup.appendChild(colEl)
    }
    tableElement.appendChild(colgroup)

    // Render rows
    const tbody = document.createElement('tbody')
    for (const row of table.rows) {
      const tr = document.createElement('tr')
      tr.style.height = `${row.height / 914400 * 96}px`

      for (const cell of row.cells) {
        // Skip merged cells
        if (cell.hMerge || cell.vMerge) continue

        const td = document.createElement('td')
        td.style.cssText = `
          border: 1px solid #ddd;
          padding: 4px 8px;
          vertical-align: ${cell.anchor || 'middle'};
          overflow: hidden;
        `

        // Apply cell fill
        if (cell.fill) {
          await this.applyFill(td, cell.fill)
        }

        // Apply spans
        if (cell.rowSpan && cell.rowSpan > 1) {
          td.rowSpan = cell.rowSpan
        }
        if (cell.colSpan && cell.colSpan > 1) {
          td.colSpan = cell.colSpan
        }

        // Render cell text
        if (cell.text) {
          const textEl = this.textRenderer.render(cell.text)
          if (textEl) {
            td.appendChild(textEl)
          }
        }

        tr.appendChild(td)
      }

      tbody.appendChild(tr)
    }
    tableElement.appendChild(tbody)

    container.appendChild(tableElement)
    return container
  }

  /**
   * Render a chart
   */
  private async renderChart(chart: Chart, slide: Slide): Promise<HTMLElement> {
    const element = document.createElement('div')
    element.className = 'ppt-shape ppt-chart'
    element.setAttribute('data-shape-id', String(chart.id))

    // Apply transform
    this.applyTransform(element, chart.transform)

    // Chart rendering would require a charting library
    // For now, create a placeholder
    element.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border: 1px solid #ddd;
    `

    const placeholder = document.createElement('div')
    placeholder.textContent = `Chart: ${chart.chartData.type}`
    placeholder.style.cssText = `
      color: #666;
      font-size: 14px;
    `
    element.appendChild(placeholder)

    return element
  }

  /**
   * Render a group shape
   */
  private async renderGroup(group: GroupShape, slide: Slide): Promise<HTMLElement> {
    const element = document.createElement('div')
    element.className = 'ppt-shape ppt-group'
    element.setAttribute('data-shape-id', String(group.id))

    // Apply transform
    this.applyTransform(element, group.transform)

    // Render children
    for (const child of group.children) {
      const childElement = await this.render(child, slide)
      if (childElement) {
        // Adjust child position relative to group's child transform
        element.appendChild(childElement)
      }
    }

    return element
  }

  /**
   * Render a connector
   */
  private async renderConnector(connector: Connector, slide: Slide): Promise<HTMLElement> {
    const element = document.createElement('div')
    element.className = 'ppt-shape ppt-connector'
    element.setAttribute('data-shape-id', String(connector.id))

    // Apply transform
    this.applyTransform(element, connector.transform)

    // Create SVG for connector line
    if (connector.geometry) {
      const svg = this.geometryRenderer.renderGeometry(
        connector.geometry,
        connector.transform.extents.width,
        connector.transform.extents.height,
        undefined,
        connector.line
      )
      if (svg) {
        element.appendChild(svg)
      }
    }

    return element
  }

  /**
   * Render a diagram (SmartArt)
   */
  private async renderDiagram(element: SlideElement, slide: Slide): Promise<HTMLElement> {
    const container = document.createElement('div')
    container.className = 'ppt-shape ppt-diagram'
    container.setAttribute('data-shape-id', String(element.id))

    // Apply transform
    this.applyTransform(container, element.transform)

    // SmartArt rendering would be complex
    // For now, create a placeholder
    container.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      border: 1px solid #ccc;
    `

    const placeholder = document.createElement('div')
    placeholder.textContent = 'SmartArt Diagram'
    placeholder.style.color = '#666'
    container.appendChild(placeholder)

    return container
  }

  /**
   * Render media (video/audio)
   */
  private async renderMedia(element: SlideElement, slide: Slide): Promise<HTMLElement> {
    const container = document.createElement('div')
    container.className = 'ppt-shape ppt-media'
    container.setAttribute('data-shape-id', String(element.id))

    // Apply transform
    this.applyTransform(container, element.transform)

    const media = element as any

    if (media.mediaType === 'video') {
      const video = document.createElement('video')
      video.controls = true
      video.style.cssText = 'width: 100%; height: 100%;'

      // Get video data
      if (media.embed) {
        const videoData = this.presentation.resources.media.get(`ppt/media/${media.embed}`)
        if (videoData) {
          const blob = new Blob([videoData], { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)
          this.blobUrls.add(url)
          video.src = url
        }
      }

      container.appendChild(video)
    } else if (media.mediaType === 'audio') {
      const audio = document.createElement('audio')
      audio.controls = true

      // Get audio data
      if (media.embed) {
        const audioData = this.presentation.resources.media.get(`ppt/media/${media.embed}`)
        if (audioData) {
          const blob = new Blob([audioData], { type: 'audio/mpeg' })
          const url = URL.createObjectURL(blob)
          this.blobUrls.add(url)
          audio.src = url
        }
      }

      container.appendChild(audio)
    }

    return container
  }

  /**
   * Render OLE object
   */
  private async renderOle(element: SlideElement, slide: Slide): Promise<HTMLElement> {
    const container = document.createElement('div')
    container.className = 'ppt-shape ppt-ole'
    container.setAttribute('data-shape-id', String(element.id))

    // Apply transform
    this.applyTransform(container, element.transform)

    // OLE objects can't be easily rendered in web
    container.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border: 1px solid #ddd;
    `

    const placeholder = document.createElement('div')
    placeholder.textContent = 'Embedded Object'
    placeholder.style.color = '#666'
    container.appendChild(placeholder)

    return container
  }

  /**
   * Apply transform to element
   */
  private applyTransform(element: HTMLElement, transform: Transform): void {
    // Convert EMUs to pixels (1 EMU = 1/914400 inch, 96 DPI)
    const x = transform.offset.x / 914400 * 96
    const y = transform.offset.y / 914400 * 96
    const width = transform.extents.width / 914400 * 96
    const height = transform.extents.height / 914400 * 96

    element.style.position = 'absolute'
    element.style.left = `${x}px`
    element.style.top = `${y}px`
    element.style.width = `${width}px`
    element.style.height = `${height}px`

    // Build transform string
    const transforms: string[] = []

    if (transform.rotation) {
      transforms.push(`rotate(${transform.rotation}deg)`)
    }
    if (transform.flipH) {
      transforms.push('scaleX(-1)')
    }
    if (transform.flipV) {
      transforms.push('scaleY(-1)')
    }

    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ')
      element.style.transformOrigin = 'center center'
    }
  }

  /**
   * Apply fill to element
   */
  private async applyFill(element: HTMLElement, fill?: Fill): Promise<void> {
    if (!fill || fill.type === 'none') {
      element.style.backgroundColor = 'transparent'
      return
    }

    switch (fill.type) {
      case 'solid':
        if (fill.solid) {
          element.style.backgroundColor = this.resolveColor(fill.solid)
        }
        break

      case 'gradient':
        if (fill.gradient) {
          const { type, angle, stops } = fill.gradient
          const stopStrings = stops.map(stop => {
            const color = this.resolveColor(stop.color)
            const position = stop.position / 1000
            return `${color} ${position}%`
          })

          if (type === 'linear') {
            const cssAngle = 90 - (angle || 0)
            element.style.background = `linear-gradient(${cssAngle}deg, ${stopStrings.join(', ')})`
          } else {
            element.style.background = `radial-gradient(circle, ${stopStrings.join(', ')})`
          }
        }
        break

      case 'picture':
        if (fill.picture && fill.picture.embed) {
          const imagePath = fill.picture.embed
          const fullPath = imagePath.startsWith('ppt/') ? imagePath : `ppt/media/${imagePath.replace('../media/', '')}`
          const imageData = this.presentation.resources.images.get(fullPath)

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
          // For pattern fills, use foreground color as solid background
          element.style.backgroundColor = this.resolveColor(fill.pattern.foregroundColor)
        }
        break
    }
  }

  /**
   * Apply line/stroke to element
   */
  private applyLine(element: HTMLElement, line?: LineStyle): void {
    if (!line || !line.width) {
      return
    }

    const width = line.width / 914400 * 96
    let color = '#000000'

    if (line.fill?.solid) {
      color = this.resolveColor(line.fill.solid)
    }

    let style = 'solid'
    switch (line.dashType) {
      case 'dot':
        style = 'dotted'
        break
      case 'dash':
      case 'longDash':
        style = 'dashed'
        break
    }

    element.style.border = `${width}px ${style} ${color}`
  }

  /**
   * Apply effects to element
   */
  private applyEffects(element: HTMLElement, effects?: Effects): void {
    if (!effects) return

    const filters: string[] = []

    // Shadow
    if (effects.shadow) {
      const { color, blurRadius, distance, direction } = effects.shadow
      const blur = blurRadius / 914400 * 96
      const dist = distance / 914400 * 96
      const rad = (direction || 0) * Math.PI / 180
      const offsetX = Math.cos(rad) * dist
      const offsetY = Math.sin(rad) * dist
      const shadowColor = this.resolveColor(color)

      element.style.boxShadow = `${offsetX}px ${offsetY}px ${blur}px ${shadowColor}`
    }

    // Glow
    if (effects.glow) {
      const { color, radius } = effects.glow
      const blur = radius / 914400 * 96
      const glowColor = this.resolveColor(color)

      // Use drop-shadow filter for glow effect
      filters.push(`drop-shadow(0 0 ${blur}px ${glowColor})`)
    }

    // Soft edge
    if (effects.softEdge) {
      const blur = effects.softEdge / 914400 * 96
      filters.push(`blur(${blur}px)`)
    }

    if (filters.length > 0) {
      element.style.filter = filters.join(' ')
    }
  }

  /**
   * Resolve color to CSS
   */
  private resolveColor(color: Color): string {
    if (color.type === 'rgb') {
      let value = color.value
      if (!value.startsWith('#')) {
        value = `#${value}`
      }
      if (color.alpha !== undefined && color.alpha < 100) {
        const r = parseInt(value.slice(1, 3), 16)
        const g = parseInt(value.slice(3, 5), 16)
        const b = parseInt(value.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${color.alpha / 100})`
      }
      return value
    }

    if (color.type === 'scheme') {
      return this.resolveSchemeColor(color.value, color.alpha)
    }

    return color.value
  }

  /**
   * Resolve scheme color
   */
  private resolveSchemeColor(schemeName: string, alpha?: number): string {
    const theme = this.presentation.masters[0]?.theme
    if (!theme) return '#000000'

    const colorMap: Record<string, string> = {
      'tx1': 'dk1', 'tx2': 'dk2', 'bg1': 'lt1', 'bg2': 'lt2',
      'dk1': 'dk1', 'dk2': 'dk2', 'lt1': 'lt1', 'lt2': 'lt2',
      'accent1': 'accent1', 'accent2': 'accent2', 'accent3': 'accent3',
      'accent4': 'accent4', 'accent5': 'accent5', 'accent6': 'accent6',
      'hlink': 'hlink', 'folHlink': 'folHlink',
    }

    const colorKey = colorMap[schemeName] as keyof typeof theme.colorScheme.colors
    const themeColor = theme.colorScheme.colors[colorKey]

    if (themeColor) {
      return this.resolveColor({ ...themeColor, alpha })
    }

    return '#000000'
  }

  /**
   * Get MIME type from path
   */
  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const types: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
    }
    return types[ext || ''] || 'application/octet-stream'
  }

  /**
   * Clean up
   */
  destroy(): void {
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url)
    }
    this.blobUrls.clear()
  }
}
