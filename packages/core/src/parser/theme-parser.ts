/**
 * Theme Parser - Parse theme from OOXML
 */

import { XMLParser } from './xml-parser'
import type {
  Theme,
  ColorScheme,
  FontScheme,
  FormatScheme,
  FontCollection,
  FontProperties,
  Color,
  Fill,
  LineStyle,
  Effects,
} from '../types'

/**
 * Theme Parser
 */
export class ThemeParser {
  private xmlParser: XMLParser

  constructor(xmlParser: XMLParser) {
    this.xmlParser = xmlParser
  }

  /**
   * Parse theme
   */
  parse(xml: any): Theme {
    const theme = xml['a:theme'] || xml.theme || xml
    const themeElements = this.xmlParser.getChild(theme, 'themeElements')

    const name = this.xmlParser.getAttr(theme, 'name') || 'Default Theme'

    return {
      name,
      colorScheme: this.parseColorScheme(this.xmlParser.getChild(themeElements, 'clrScheme')),
      fontScheme: this.parseFontScheme(this.xmlParser.getChild(themeElements, 'fontScheme')),
      formatScheme: this.parseFormatScheme(this.xmlParser.getChild(themeElements, 'fmtScheme')),
    }
  }

  /**
   * Parse color scheme
   */
  private parseColorScheme(clrScheme: any): ColorScheme {
    const name = this.xmlParser.getAttr(clrScheme, 'name') || 'Default'

    const parseThemeColor = (name: string): Color => {
      const element = this.xmlParser.getChild(clrScheme, name)
      const color = this.xmlParser.parseColor(element)
      return color ? {
        type: color.type as Color['type'],
        value: color.value,
        alpha: color.alpha,
      } : { type: 'rgb', value: '#000000' }
    }

    return {
      name,
      colors: {
        dk1: parseThemeColor('dk1'),
        lt1: parseThemeColor('lt1'),
        dk2: parseThemeColor('dk2'),
        lt2: parseThemeColor('lt2'),
        accent1: parseThemeColor('accent1'),
        accent2: parseThemeColor('accent2'),
        accent3: parseThemeColor('accent3'),
        accent4: parseThemeColor('accent4'),
        accent5: parseThemeColor('accent5'),
        accent6: parseThemeColor('accent6'),
        hlink: parseThemeColor('hlink'),
        folHlink: parseThemeColor('folHlink'),
      },
    }
  }

  /**
   * Parse font scheme
   */
  private parseFontScheme(fontScheme: any): FontScheme {
    const name = this.xmlParser.getAttr(fontScheme, 'name') || 'Default'

    return {
      name,
      majorFont: this.parseFontCollection(this.xmlParser.getChild(fontScheme, 'majorFont')),
      minorFont: this.parseFontCollection(this.xmlParser.getChild(fontScheme, 'minorFont')),
    }
  }

  /**
   * Parse font collection
   */
  private parseFontCollection(fontCollection: any): FontCollection {
    const latin = this.xmlParser.getChild(fontCollection, 'latin')
    const ea = this.xmlParser.getChild(fontCollection, 'ea')
    const cs = this.xmlParser.getChild(fontCollection, 'cs')

    // Parse supplemental fonts
    const supplementalFonts: { script: string; typeface: string }[] = []
    const fonts = this.xmlParser.ensureArray(this.xmlParser.getChild(fontCollection, 'font'))
    for (const font of fonts) {
      const script = this.xmlParser.getAttr(font, 'script')
      const typeface = this.xmlParser.getAttr(font, 'typeface')
      if (script && typeface) {
        supplementalFonts.push({ script, typeface })
      }
    }

    return {
      latin: this.parseFontProperties(latin) || { typeface: 'Calibri' },
      eastAsian: this.parseFontProperties(ea) || { typeface: '' },
      complexScript: this.parseFontProperties(cs) || { typeface: '' },
      supplementalFonts: supplementalFonts.length > 0 ? supplementalFonts : undefined,
    }
  }

  /**
   * Parse font properties
   */
  private parseFontProperties(font: any): FontProperties | undefined {
    if (!font) return undefined

    return {
      typeface: this.xmlParser.getAttr(font, 'typeface'),
      panose: this.xmlParser.getAttr(font, 'panose'),
      pitchFamily: parseInt(this.xmlParser.getAttr(font, 'pitchFamily') || '0', 10) || undefined,
      charset: parseInt(this.xmlParser.getAttr(font, 'charset') || '0', 10) || undefined,
    }
  }

  /**
   * Parse format scheme
   */
  private parseFormatScheme(fmtScheme: any): FormatScheme {
    const name = this.xmlParser.getAttr(fmtScheme, 'name') || 'Default'

    return {
      name,
      fillStyles: this.parseFillStyles(this.xmlParser.getChild(fmtScheme, 'fillStyleLst')),
      lineStyles: this.parseLineStyles(this.xmlParser.getChild(fmtScheme, 'lnStyleLst')),
      effectStyles: this.parseEffectStyles(this.xmlParser.getChild(fmtScheme, 'effectStyleLst')),
      backgroundFills: this.parseFillStyles(this.xmlParser.getChild(fmtScheme, 'bgFillStyleLst')),
    }
  }

  /**
   * Parse fill styles
   */
  private parseFillStyles(fillStyleLst: any): Fill[] {
    if (!fillStyleLst) return []

    const fills: Fill[] = []

    // Solid fills
    const solidFills = this.xmlParser.ensureArray(this.xmlParser.getChild(fillStyleLst, 'solidFill'))
    for (const solidFill of solidFills) {
      const color = this.xmlParser.parseColor(solidFill)
      fills.push({
        type: 'solid',
        solid: color ? {
          type: color.type as Color['type'],
          value: color.value,
          alpha: color.alpha,
        } : undefined,
      })
    }

    // Gradient fills
    const gradFills = this.xmlParser.ensureArray(this.xmlParser.getChild(fillStyleLst, 'gradFill'))
    for (const gradFill of gradFills) {
      const gsLst = this.xmlParser.getChild(gradFill, 'gsLst')
      const stops = this.xmlParser.ensureArray(this.xmlParser.getChild(gsLst, 'gs'))

      const gradientStops = stops.map((gs: any) => {
        const pos = parseInt(this.xmlParser.getAttr(gs, 'pos') || '0', 10)
        const color = this.xmlParser.parseColor(gs)
        return {
          position: pos,
          color: color ? {
            type: color.type as Color['type'],
            value: color.value,
            alpha: color.alpha,
          } : { type: 'rgb' as const, value: '#000000' },
        }
      })

      const lin = this.xmlParser.getChild(gradFill, 'lin')
      const angle = lin ? this.xmlParser.parseAngle(this.xmlParser.getAttr(lin, 'ang')) : 0

      fills.push({
        type: 'gradient',
        gradient: {
          type: 'linear',
          angle,
          stops: gradientStops,
        },
      })
    }

    return fills
  }

  /**
   * Parse line styles
   */
  private parseLineStyles(lnStyleLst: any): LineStyle[] {
    if (!lnStyleLst) return []

    const lines: LineStyle[] = []
    const lnElements = this.xmlParser.ensureArray(this.xmlParser.getChild(lnStyleLst, 'ln'))

    for (const ln of lnElements) {
      const width = parseInt(this.xmlParser.getAttr(ln, 'w') || '0', 10)
      const solidFill = this.xmlParser.getChild(ln, 'solidFill')
      const prstDash = this.xmlParser.getChild(ln, 'prstDash')

      let fill: Fill | undefined
      if (solidFill) {
        const color = this.xmlParser.parseColor(solidFill)
        fill = {
          type: 'solid',
          solid: color ? {
            type: color.type as Color['type'],
            value: color.value,
            alpha: color.alpha,
          } : undefined,
        }
      }

      lines.push({
        width,
        fill,
        dashType: this.xmlParser.getAttr(prstDash, 'val') as LineStyle['dashType'] || 'solid',
        capType: this.xmlParser.getAttr(ln, 'cap') as LineStyle['capType'],
        joinType: this.parseJoinType(ln),
      })
    }

    return lines
  }

  /**
   * Parse join type
   */
  private parseJoinType(ln: any): LineStyle['joinType'] {
    if (this.xmlParser.getChild(ln, 'bevel')) return 'bevel'
    if (this.xmlParser.getChild(ln, 'miter')) return 'miter'
    if (this.xmlParser.getChild(ln, 'round')) return 'round'
    return undefined
  }

  /**
   * Parse effect styles
   */
  private parseEffectStyles(effectStyleLst: any): Effects[] {
    if (!effectStyleLst) return []

    const effects: Effects[] = []
    const effectStyles = this.xmlParser.ensureArray(this.xmlParser.getChild(effectStyleLst, 'effectStyle'))

    for (const effectStyle of effectStyles) {
      const effectLst = this.xmlParser.getChild(effectStyle, 'effectLst')
      const effect: Effects = {}

      if (effectLst) {
        // Outer shadow
        const outerShdw = this.xmlParser.getChild(effectLst, 'outerShdw')
        if (outerShdw) {
          const color = this.xmlParser.parseColor(outerShdw)
          effect.shadow = {
            type: 'outer',
            color: color ? {
              type: color.type as Color['type'],
              value: color.value,
              alpha: color.alpha,
            } : { type: 'rgb', value: '#000000' },
            blurRadius: parseInt(this.xmlParser.getAttr(outerShdw, 'blurRad') || '0', 10),
            distance: parseInt(this.xmlParser.getAttr(outerShdw, 'dist') || '0', 10),
            direction: this.xmlParser.parseAngle(this.xmlParser.getAttr(outerShdw, 'dir')),
          }
        }

        // Glow
        const glow = this.xmlParser.getChild(effectLst, 'glow')
        if (glow) {
          const color = this.xmlParser.parseColor(glow)
          effect.glow = {
            color: color ? {
              type: color.type as Color['type'],
              value: color.value,
              alpha: color.alpha,
            } : { type: 'rgb', value: '#FFFF00' },
            radius: parseInt(this.xmlParser.getAttr(glow, 'rad') || '0', 10),
          }
        }
      }

      effects.push(effect)
    }

    return effects
  }
}
