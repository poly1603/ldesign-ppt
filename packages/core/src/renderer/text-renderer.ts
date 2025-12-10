/**
 * Text Renderer - Renders text content
 */

import type {
  Presentation,
  TextBody,
  Paragraph,
  TextRun,
  TextRunProperties,
  ParagraphProperties,
  Shape,
  Color,
} from '../types'

/**
 * Text Renderer
 */
export class TextRenderer {
  private presentation: Presentation

  constructor(presentation: Presentation) {
    this.presentation = presentation
  }

  /**
   * Render text body
   */
  render(textBody: TextBody, shape?: Shape): HTMLElement {
    const container = document.createElement('div')
    container.className = 'ppt-text'

    // Position text container above SVG geometry
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.zIndex = '1'
    container.style.pointerEvents = 'none'

    // Apply body properties
    if (textBody.bodyProperties) {
      this.applyBodyProperties(container, textBody.bodyProperties)
    }

    // Render paragraphs
    for (const paragraph of textBody.paragraphs) {
      const pElement = this.renderParagraph(paragraph)
      container.appendChild(pElement)
    }

    return container
  }

  /**
   * Apply body properties
   */
  private applyBodyProperties(element: HTMLElement, props: NonNullable<TextBody['bodyProperties']>): void {
    // Vertical alignment
    switch (props.anchor) {
      case 'top':
        element.style.justifyContent = 'flex-start'
        break
      case 'middle':
      case 'middleCentered':
        element.style.justifyContent = 'center'
        break
      case 'bottom':
      case 'bottomCentered':
        element.style.justifyContent = 'flex-end'
        break
    }

    // Insets/padding
    const toPixels = (emu: number) => emu / 914400 * 96

    element.style.paddingLeft = `${toPixels(props.leftInset || 91440)}px`
    element.style.paddingRight = `${toPixels(props.rightInset || 91440)}px`
    element.style.paddingTop = `${toPixels(props.topInset || 45720)}px`
    element.style.paddingBottom = `${toPixels(props.bottomInset || 45720)}px`

    // Columns
    if (props.columns && props.columns > 1) {
      element.style.columnCount = String(props.columns)
      if (props.columnSpacing) {
        element.style.columnGap = `${toPixels(props.columnSpacing)}px`
      }
    }

    // Rotation
    if (props.rotation) {
      element.style.transform = `rotate(${props.rotation}deg)`
    }

    // Vertical text
    if (props.vertical && props.vertical !== 'horz') {
      element.style.writingMode = 'vertical-rl'
      if (props.vertical === 'vert270') {
        element.style.transform = 'rotate(180deg)'
      }
    }

    // Word wrap
    if (props.wrap === 'none') {
      element.style.whiteSpace = 'nowrap'
    }

    // Display as flex for vertical alignment
    element.style.display = 'flex'
    element.style.flexDirection = 'column'
    element.style.height = '100%'
    element.style.boxSizing = 'border-box'
    element.style.overflow = 'hidden'
  }

  /**
   * Render paragraph
   */
  private renderParagraph(paragraph: Paragraph): HTMLElement {
    const pElement = document.createElement('p')
    pElement.className = 'ppt-paragraph'
    pElement.style.margin = '0'

    // Apply paragraph properties
    if (paragraph.properties) {
      this.applyParagraphProperties(pElement, paragraph.properties)
    }

    // Render bullet if present
    if (paragraph.properties?.bullet && paragraph.properties.bullet.type !== 'none') {
      const bulletSpan = this.renderBullet(paragraph.properties.bullet, paragraph.properties.level || 0)
      pElement.appendChild(bulletSpan)
    }

    // Render text runs
    for (const run of paragraph.runs) {
      const runElement = this.renderRun(run, paragraph.properties?.defaultRunProperties)
      if (runElement) {
        pElement.appendChild(runElement)
      }
    }

    return pElement
  }

  /**
   * Apply paragraph properties
   */
  private applyParagraphProperties(element: HTMLElement, props: ParagraphProperties): void {
    // Alignment
    switch (props.alignment) {
      case 'left':
        element.style.textAlign = 'left'
        break
      case 'center':
        element.style.textAlign = 'center'
        break
      case 'right':
        element.style.textAlign = 'right'
        break
      case 'justify':
      case 'justifyLow':
        element.style.textAlign = 'justify'
        break
      case 'distributed':
        element.style.textAlign = 'justify'
        element.style.textJustify = 'inter-character'
        break
    }

    // Margins and indent
    const toPixels = (emu: number) => emu / 914400 * 96

    if (props.marginLeft) {
      element.style.marginLeft = `${toPixels(props.marginLeft)}px`
    }
    if (props.marginRight) {
      element.style.marginRight = `${toPixels(props.marginRight)}px`
    }
    if (props.indent) {
      element.style.textIndent = `${toPixels(props.indent)}px`
    }

    // Indent level
    if (props.level && props.level > 0) {
      element.style.paddingLeft = `${props.level * 36}px` // ~0.5 inch per level
    }

    // Spacing
    if (props.spaceBefore) {
      if (typeof props.spaceBefore === 'number') {
        element.style.marginTop = `${toPixels(props.spaceBefore)}px`
      } else {
        element.style.marginTop = `${props.spaceBefore.percentage / 100}em`
      }
    }
    if (props.spaceAfter) {
      if (typeof props.spaceAfter === 'number') {
        element.style.marginBottom = `${toPixels(props.spaceAfter)}px`
      } else {
        element.style.marginBottom = `${props.spaceAfter.percentage / 100}em`
      }
    }

    // Line spacing
    if (props.lineSpacing) {
      if (typeof props.lineSpacing === 'number') {
        element.style.lineHeight = `${toPixels(props.lineSpacing)}px`
      } else {
        element.style.lineHeight = `${props.lineSpacing.percentage / 100}`
      }
    }
  }

  /**
   * Render bullet
   */
  private renderBullet(bullet: NonNullable<ParagraphProperties['bullet']>, level: number): HTMLElement {
    const span = document.createElement('span')
    span.className = 'ppt-bullet'
    span.style.cssText = `
      display: inline-block;
      width: 24px;
      text-align: center;
      margin-right: 4px;
    `

    switch (bullet.type) {
      case 'char':
        span.textContent = bullet.char || '•'
        break
      case 'auto':
        // Auto-numbered bullet - simplified implementation
        span.textContent = `${bullet.startAt || 1}.`
        break
      case 'picture':
        // Picture bullet - would need to load the image
        span.textContent = '•'
        break
      default:
        span.textContent = '•'
    }

    // Apply bullet font
    if (bullet.font?.typeface) {
      span.style.fontFamily = bullet.font.typeface
    }

    // Apply bullet color
    if (bullet.color) {
      span.style.color = this.resolveColor(bullet.color)
    }

    // Apply bullet size
    if (bullet.size) {
      if (typeof bullet.size === 'number') {
        span.style.fontSize = `${bullet.size / 100}pt`
      }
    }

    return span
  }

  /**
   * Render text run
   */
  private renderRun(run: TextRun, defaultProps?: TextRunProperties): HTMLElement | Text | null {
    if (run.type === 'break') {
      return document.createElement('br')
    }

    if (run.type === 'field') {
      const span = document.createElement('span')
      span.className = 'ppt-field'
      span.textContent = run.text || ''

      // Apply properties
      if (run.properties || defaultProps) {
        this.applyRunProperties(span, { ...defaultProps, ...run.properties })
      }

      return span
    }

    // Regular text run
    if (!run.text) return null

    const span = document.createElement('span')
    span.className = 'ppt-text-run'
    span.textContent = run.text

    // Apply properties
    if (run.properties || defaultProps) {
      this.applyRunProperties(span, { ...defaultProps, ...run.properties })
    }

    return span
  }

  /**
   * Apply run properties
   */
  private applyRunProperties(element: HTMLElement, props: TextRunProperties): void {
    // Font size (props.fontSize is in hundredths of a point)
    if (props.fontSize) {
      element.style.fontSize = `${props.fontSize / 100}pt`
    }

    // Bold
    if (props.bold) {
      element.style.fontWeight = 'bold'
    }

    // Italic
    if (props.italic) {
      element.style.fontStyle = 'italic'
    }

    // Underline
    if (props.underline && props.underline !== 'none') {
      let decoration = 'underline'
      switch (props.underline) {
        case 'double':
          decoration = 'underline double'
          break
        case 'dotted':
        case 'dottedHeavy':
          decoration = 'underline dotted'
          break
        case 'dash':
        case 'dashHeavy':
        case 'dashLong':
        case 'dashLongHeavy':
          decoration = 'underline dashed'
          break
        case 'wavy':
        case 'wavyHeavy':
        case 'wavyDouble':
          decoration = 'underline wavy'
          break
      }
      element.style.textDecoration = decoration
    }

    // Strike
    if (props.strike && props.strike !== 'noStrike') {
      element.style.textDecoration = props.strike === 'dblStrike'
        ? 'line-through double'
        : 'line-through'
    }

    // Baseline (superscript/subscript)
    if (props.baseline) {
      if (props.baseline > 0) {
        element.style.verticalAlign = 'super'
        element.style.fontSize = '0.75em'
      } else if (props.baseline < 0) {
        element.style.verticalAlign = 'sub'
        element.style.fontSize = '0.75em'
      }
    }

    // Character spacing
    if (props.spacing) {
      element.style.letterSpacing = `${props.spacing / 100}pt`
    }

    // Fill (text color)
    if (props.fill?.solid) {
      element.style.color = this.resolveColor(props.fill.solid)
    }

    // Font
    if (props.font?.typeface) {
      const fonts = [props.font.typeface]
      if (props.font.eastAsia) fonts.push(props.font.eastAsia)
      if (props.font.cs) fonts.push(props.font.cs)
      fonts.push('sans-serif')
      element.style.fontFamily = fonts.map(f => `"${f}"`).join(', ')
    }

    // Highlight
    if (props.highlight) {
      element.style.backgroundColor = this.resolveColor(props.highlight)
    }

    // Hyperlink
    if (props.hyperlink) {
      element.style.cursor = 'pointer'
      element.style.color = element.style.color || '#0066cc'
      element.style.textDecoration = element.style.textDecoration || 'underline'

      if (props.hyperlink.url) {
        element.addEventListener('click', () => {
          window.open(props.hyperlink!.url, '_blank')
        })
      }
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
}
