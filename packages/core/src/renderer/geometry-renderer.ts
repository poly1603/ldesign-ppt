/**
 * Geometry Renderer - Renders shape geometries as SVG
 */

import type {
  Geometry,
  PresetGeometry,
  Fill,
  LineStyle,
  Color,
  Theme,
} from '../types'
import { ColorResolver } from './color-resolver'

/**
 * Geometry Renderer
 */
export class GeometryRenderer {
  private colorResolver: ColorResolver

  constructor(theme?: Theme | null) {
    this.colorResolver = new ColorResolver()
    if (theme) {
      this.colorResolver.setTheme(theme)
    }
  }

  /**
   * Update theme for color resolution
   */
  setTheme(theme: Theme | null): void {
    this.colorResolver.setTheme(theme)
  }
  /**
   * Render geometry as SVG
   */
  renderGeometry(
    geometry: Geometry,
    width: number,
    height: number,
    fill?: Fill,
    line?: LineStyle
  ): SVGElement | null {
    // Convert EMUs to pixels
    const w = width / 914400 * 96
    const h = height / 914400 * 96

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(w))
    svg.setAttribute('height', String(h))
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.style.overflow = 'visible'

    let path: SVGPathElement | SVGElement | null = null

    if (geometry.type === 'preset' && geometry.preset) {
      path = this.createPresetPath(geometry.preset, w, h, geometry.adjustValues)
    } else if (geometry.type === 'custom' && geometry.custom) {
      path = this.createCustomPath(geometry.custom, w, h)
    }

    if (!path) {
      // Default to rectangle
      path = this.createPresetPath('rect', w, h)
    }

    // Apply fill
    this.applyFill(path, fill)

    // Apply stroke
    this.applyStroke(path, line)

    svg.appendChild(path)
    return svg
  }

  /**
   * Get CSS clip-path for geometry
   */
  getClipPath(geometry: Geometry): string | null {
    if (geometry.type !== 'preset' || !geometry.preset) return null

    switch (geometry.preset) {
      case 'ellipse':
        return 'ellipse(50% 50%)'
      case 'roundRect':
        return 'inset(0 round 10%)'
      case 'triangle':
        return 'polygon(50% 0%, 100% 100%, 0% 100%)'
      case 'diamond':
        return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      case 'pentagon':
        return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'
      case 'hexagon':
        return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
      case 'star5':
        return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
      default:
        return null
    }
  }

  /**
   * Create path for preset geometry
   */
  private createPresetPath(
    preset: PresetGeometry,
    w: number,
    h: number,
    adjustValues?: Record<string, number>
  ): SVGElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    // Get the path data for the preset
    const d = this.getPresetPathData(preset, w, h, adjustValues)
    path.setAttribute('d', d)

    return path
  }

  /**
   * Get path data for preset geometry
   */
  private getPresetPathData(
    preset: PresetGeometry,
    w: number,
    h: number,
    adjustValues?: Record<string, number>
  ): string {
    switch (preset) {
      case 'rect':
        return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`

      case 'ellipse':
        const rx = w / 2
        const ry = h / 2
        return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`

      case 'roundRect': {
        const r = Math.min(w, h) * 0.1 // 10% radius
        return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
      }

      case 'triangle':
        return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`

      case 'rtTriangle':
        return `M 0 0 L ${w} ${h} L 0 ${h} Z`

      case 'parallelogram': {
        const offset = w * 0.25
        return `M ${offset} 0 L ${w} 0 L ${w - offset} ${h} L 0 ${h} Z`
      }

      case 'trapezoid': {
        const offset = w * 0.2
        return `M ${offset} 0 L ${w - offset} 0 L ${w} ${h} L 0 ${h} Z`
      }

      case 'diamond':
        return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`

      case 'pentagon': {
        const cx = w / 2
        const cy = h / 2
        const r = Math.min(w, h) / 2
        return this.createRegularPolygonPath(5, cx, cy, r)
      }

      case 'hexagon': {
        const cx = w / 2
        const cy = h / 2
        const r = Math.min(w, h) / 2
        return this.createRegularPolygonPath(6, cx, cy, r)
      }

      case 'heptagon': {
        const cx = w / 2
        const cy = h / 2
        const r = Math.min(w, h) / 2
        return this.createRegularPolygonPath(7, cx, cy, r)
      }

      case 'octagon': {
        const cx = w / 2
        const cy = h / 2
        const r = Math.min(w, h) / 2
        return this.createRegularPolygonPath(8, cx, cy, r)
      }

      case 'star4':
        return this.createStarPath(4, w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4)

      case 'star5':
        return this.createStarPath(5, w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4)

      case 'star6':
        return this.createStarPath(6, w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4)

      case 'star8':
        return this.createStarPath(8, w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4)

      case 'rightArrow': {
        const arrowHead = w * 0.3
        const arrowY = h * 0.25
        return `M 0 ${arrowY} L ${w - arrowHead} ${arrowY} L ${w - arrowHead} 0 L ${w} ${h / 2} L ${w - arrowHead} ${h} L ${w - arrowHead} ${h - arrowY} L 0 ${h - arrowY} Z`
      }

      case 'leftArrow': {
        const arrowHead = w * 0.3
        const arrowY = h * 0.25
        return `M ${w} ${arrowY} L ${arrowHead} ${arrowY} L ${arrowHead} 0 L 0 ${h / 2} L ${arrowHead} ${h} L ${arrowHead} ${h - arrowY} L ${w} ${h - arrowY} Z`
      }

      case 'upArrow': {
        const arrowHead = h * 0.3
        const arrowX = w * 0.25
        return `M ${arrowX} ${h} L ${arrowX} ${arrowHead} L 0 ${arrowHead} L ${w / 2} 0 L ${w} ${arrowHead} L ${w - arrowX} ${arrowHead} L ${w - arrowX} ${h} Z`
      }

      case 'downArrow': {
        const arrowHead = h * 0.3
        const arrowX = w * 0.25
        return `M ${arrowX} 0 L ${arrowX} ${h - arrowHead} L 0 ${h - arrowHead} L ${w / 2} ${h} L ${w} ${h - arrowHead} L ${w - arrowX} ${h - arrowHead} L ${w - arrowX} 0 Z`
      }

      case 'plus': {
        const third = 1 / 3
        return `M ${w * third} 0 L ${w * (1 - third)} 0 L ${w * (1 - third)} ${h * third} L ${w} ${h * third} L ${w} ${h * (1 - third)} L ${w * (1 - third)} ${h * (1 - third)} L ${w * (1 - third)} ${h} L ${w * third} ${h} L ${w * third} ${h * (1 - third)} L 0 ${h * (1 - third)} L 0 ${h * third} L ${w * third} ${h * third} Z`
      }

      case 'heart': {
        const heartPath = this.createHeartPath(w, h)
        return heartPath
      }

      case 'cloud': {
        return this.createCloudPath(w, h)
      }

      case 'line':
        return `M 0 ${h / 2} L ${w} ${h / 2}`

      case 'straightConnector1':
        return `M 0 0 L ${w} ${h}`

      // Callouts
      case 'wedgeRectCallout': {
        const tailX = w * 0.3
        const tailY = h + h * 0.3
        return `M 0 0 L ${w} 0 L ${w} ${h} L ${tailX + 20} ${h} L ${tailX} ${tailY} L ${tailX - 20} ${h} L 0 ${h} Z`
      }

      // Flow chart shapes
      case 'flowChartProcess':
        return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`

      case 'flowChartDecision':
        return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`

      case 'flowChartTerminator': {
        const r = h / 2
        return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`
      }

      // Default rectangle
      default:
        return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
    }
  }

  /**
   * Create regular polygon path
   */
  private createRegularPolygonPath(sides: number, cx: number, cy: number, r: number): string {
    const points: string[] = []
    const angleOffset = -Math.PI / 2 // Start from top

    for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (2 * Math.PI * i) / sides
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }

    return points.join(' ') + ' Z'
  }

  /**
   * Create star path
   */
  private createStarPath(
    points: number,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number
  ): string {
    const pathPoints: string[] = []
    const angleOffset = -Math.PI / 2

    for (let i = 0; i < points * 2; i++) {
      const angle = angleOffset + (Math.PI * i) / points
      const r = i % 2 === 0 ? outerR : innerR
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      pathPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }

    return pathPoints.join(' ') + ' Z'
  }

  /**
   * Create heart path
   */
  private createHeartPath(w: number, h: number): string {
    const topY = h * 0.3
    return `M ${w / 2} ${h} C ${w * 0.1} ${h * 0.7} 0 ${topY} ${w / 4} ${topY * 0.5} C ${w * 0.35} 0 ${w / 2} ${topY * 0.3} ${w / 2} ${topY} C ${w / 2} ${topY * 0.3} ${w * 0.65} 0 ${w * 3 / 4} ${topY * 0.5} C ${w} ${topY} ${w * 0.9} ${h * 0.7} ${w / 2} ${h} Z`
  }

  /**
   * Create cloud path
   */
  private createCloudPath(w: number, h: number): string {
    // Simplified cloud shape using circles
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) / 3

    return `M ${cx - r * 0.8} ${cy + r * 0.5}
            C ${cx - r * 1.5} ${cy + r * 0.5} ${cx - r * 1.5} ${cy - r * 0.3} ${cx - r * 0.8} ${cy - r * 0.5}
            C ${cx - r * 0.8} ${cy - r * 1.2} ${cx} ${cy - r * 1.2} ${cx} ${cy - r * 0.8}
            C ${cx} ${cy - r * 1.2} ${cx + r * 0.8} ${cy - r * 1.2} ${cx + r * 0.8} ${cy - r * 0.5}
            C ${cx + r * 1.5} ${cy - r * 0.3} ${cx + r * 1.5} ${cy + r * 0.5} ${cx + r * 0.8} ${cy + r * 0.5}
            Z`
  }

  /**
   * Create custom path from custom geometry
   */
  private createCustomPath(custom: NonNullable<Geometry['custom']>, w: number, h: number): SVGElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    // Process all paths in custom geometry
    const pathData: string[] = []

    for (const p of custom.paths) {
      for (const cmd of p.commands) {
        switch (cmd.type) {
          case 'moveTo':
            if (cmd.points && cmd.points[0]) {
              pathData.push(`M ${cmd.points[0].x} ${cmd.points[0].y}`)
            }
            break
          case 'lineTo':
            if (cmd.points && cmd.points[0]) {
              pathData.push(`L ${cmd.points[0].x} ${cmd.points[0].y}`)
            }
            break
          case 'cubicBezTo':
            if (cmd.points && cmd.points.length >= 3) {
              pathData.push(`C ${cmd.points[0].x} ${cmd.points[0].y} ${cmd.points[1].x} ${cmd.points[1].y} ${cmd.points[2].x} ${cmd.points[2].y}`)
            }
            break
          case 'quadBezTo':
            if (cmd.points && cmd.points.length >= 2) {
              pathData.push(`Q ${cmd.points[0].x} ${cmd.points[0].y} ${cmd.points[1].x} ${cmd.points[1].y}`)
            }
            break
          case 'arcTo':
            // Simplified arc handling
            if (cmd.wR && cmd.hR) {
              pathData.push(`A ${cmd.wR} ${cmd.hR} 0 0 1 ${cmd.points?.[0]?.x || 0} ${cmd.points?.[0]?.y || 0}`)
            }
            break
          case 'close':
            pathData.push('Z')
            break
        }
      }
    }

    path.setAttribute('d', pathData.join(' '))
    return path
  }

  /**
   * Apply fill to SVG element
   */
  private applyFill(element: SVGElement, fill?: Fill): void {
    // No fill specified - use transparent (not grey)
    if (!fill) {
      element.setAttribute('fill', 'none')
      return
    }

    switch (fill.type) {
      case 'none':
        element.setAttribute('fill', 'none')
        break

      case 'solid':
        if (fill.solid) {
          element.setAttribute('fill', this.resolveColor(fill.solid))
          if (fill.solid.alpha !== undefined && fill.solid.alpha < 100) {
            element.setAttribute('fill-opacity', String(fill.solid.alpha / 100))
          }
        } else {
          element.setAttribute('fill', 'none')
        }
        break

      case 'gradient':
        // Gradients would need SVG gradient definitions
        // For simplicity, use first color
        if (fill.gradient?.stops.length) {
          element.setAttribute('fill', this.resolveColor(fill.gradient.stops[0].color))
        } else {
          element.setAttribute('fill', 'none')
        }
        break

      case 'pattern':
        // Use foreground color for patterns
        if (fill.pattern?.foregroundColor) {
          element.setAttribute('fill', this.resolveColor(fill.pattern.foregroundColor))
        } else {
          element.setAttribute('fill', 'none')
        }
        break

      case 'picture':
        // Picture fills need special handling - for SVG we can't easily do this
        // Use transparent for now
        element.setAttribute('fill', 'none')
        break

      default:
        // Unknown fill type - use transparent instead of grey
        element.setAttribute('fill', 'none')
    }
  }

  /**
   * Apply stroke to SVG element
   */
  private applyStroke(element: SVGElement, line?: LineStyle): void {
    if (!line || !line.width) {
      element.setAttribute('stroke', 'none')
      return
    }

    const strokeWidth = line.width / 914400 * 96
    element.setAttribute('stroke-width', String(strokeWidth))

    if (line.fill?.solid) {
      element.setAttribute('stroke', this.resolveColor(line.fill.solid))
    } else {
      element.setAttribute('stroke', '#000000')
    }

    // Dash pattern
    switch (line.dashType) {
      case 'dot':
        element.setAttribute('stroke-dasharray', `${strokeWidth} ${strokeWidth * 2}`)
        break
      case 'dash':
        element.setAttribute('stroke-dasharray', `${strokeWidth * 4} ${strokeWidth * 2}`)
        break
      case 'dashDot':
        element.setAttribute('stroke-dasharray', `${strokeWidth * 4} ${strokeWidth * 2} ${strokeWidth} ${strokeWidth * 2}`)
        break
      case 'longDash':
        element.setAttribute('stroke-dasharray', `${strokeWidth * 8} ${strokeWidth * 3}`)
        break
    }

    // Line cap
    switch (line.capType) {
      case 'round':
        element.setAttribute('stroke-linecap', 'round')
        break
      case 'square':
        element.setAttribute('stroke-linecap', 'square')
        break
      default:
        element.setAttribute('stroke-linecap', 'butt')
    }

    // Line join
    switch (line.joinType) {
      case 'round':
        element.setAttribute('stroke-linejoin', 'round')
        break
      case 'bevel':
        element.setAttribute('stroke-linejoin', 'bevel')
        break
      default:
        element.setAttribute('stroke-linejoin', 'miter')
    }
  }

  /**
   * Resolve color to CSS string
   */
  private resolveColor(color: Color): string {
    return this.colorResolver.resolve(color)
  }
}
