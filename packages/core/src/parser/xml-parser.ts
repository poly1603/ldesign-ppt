/**
 * XML Parser - Wrapper around fast-xml-parser for consistent XML handling
 */

import { XMLParser as FastXMLParser, XMLBuilder } from 'fast-xml-parser'

/** XML Parser options */
interface XMLParserOptions {
  preserveOrder?: boolean
  ignoreAttributes?: boolean
  parseAttributeValue?: boolean
  trimValues?: boolean
}

/**
 * XML Parser wrapper with OOXML-specific utilities
 */
export class XMLParser {
  private parser: FastXMLParser
  private builder: XMLBuilder

  constructor(options: XMLParserOptions = {}) {
    this.parser = new FastXMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: options.parseAttributeValue ?? false,
      trimValues: options.trimValues ?? true,
      preserveOrder: options.preserveOrder ?? false,
      isArray: (name) => {
        // These elements should always be arrays
        const arrayElements = [
          'p:sldId', 'sldId',
          'p:sp', 'sp',
          'p:pic', 'pic',
          'p:graphicFrame', 'graphicFrame',
          'p:grpSp', 'grpSp',
          'p:cxnSp', 'cxnSp',
          'a:p', 'p',
          'a:r', 'r',
          'a:t', 't',
          'a:br', 'br',
          'a:fld', 'fld',
          'a:defRPr', 'defRPr',
          'a:lvl1pPr', 'a:lvl2pPr', 'a:lvl3pPr', 'a:lvl4pPr', 'a:lvl5pPr',
          'a:lvl6pPr', 'a:lvl7pPr', 'a:lvl8pPr', 'a:lvl9pPr',
          'a:gs', 'gs',
          'a:lin', 'lin',
          'a:path', 'path',
          'a:tc', 'tc',
          'a:tr', 'tr',
          'a:gridCol', 'gridCol',
          'p:txBody', 'txBody',
          'p:timing', 'timing',
          'p:seq', 'seq',
          'p:par', 'par',
          'p:childTnLst', 'childTnLst',
          'Relationship',
          'Override',
          'Default',
        ]
        return arrayElements.includes(name)
      },
    })

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    })
  }

  /**
   * Parse XML string to object
   */
  parse(xml: string): any {
    try {
      return this.parser.parse(xml)
    } catch (error) {
      console.error('XML parse error:', error)
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build XML string from object
   */
  build(obj: any): string {
    return this.builder.build(obj)
  }

  /**
   * Ensure value is an array
   */
  ensureArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  /**
   * Get attribute value with fallback
   */
  getAttr(element: any, name: string, defaultValue?: string): string | undefined {
    if (!element) return defaultValue

    // Try with namespace prefix
    const value = element[`@_${name}`] ?? element[name]

    // Try without namespace
    if (value === undefined) {
      const shortName = name.includes(':') ? name.split(':')[1] : name
      return element[`@_${shortName}`] ?? element[shortName] ?? defaultValue
    }

    return value ?? defaultValue
  }

  /**
   * Get child element with namespace handling
   */
  getChild(element: any, name: string): any {
    if (!element) return undefined

    let result: any = undefined

    // Try exact name
    if (element[name] !== undefined) {
      result = element[name]
    } else {
      // Try with different namespace prefixes
      const namespaces = ['a:', 'p:', 'r:', 'c:', 'dgm:', 'mc:', 'w:', 'wp:', '']
      const localName = name.includes(':') ? name.split(':')[1] : name

      for (const ns of namespaces) {
        const fullName = `${ns}${localName}`
        if (element[fullName] !== undefined) {
          result = element[fullName]
          break
        }
      }
    }

    // If result is a single-element array, unwrap it
    // (unless it's a known array element that should stay as array)
    if (Array.isArray(result) && result.length === 1) {
      const arrayElements = ['p', 'r', 't', 'br', 'fld', 'gs', 'lin', 'tc', 'sp', 'pic', 'graphicFrame', 'grpSp', 'cxnSp']
      const localName = name.includes(':') ? name.split(':')[1] : name
      if (!arrayElements.includes(localName)) {
        result = result[0]
      }
    }

    return result
  }

  /**
   * Get text content from element
   */
  getText(element: any): string {
    if (!element) return ''
    if (typeof element === 'string') return element

    // Handle array (e.g., a:t is always parsed as array)
    if (Array.isArray(element)) {
      return element.map(e => this.getText(e)).join('')
    }

    if (element['#text'] !== undefined) return String(element['#text'])
    return ''
  }

  /**
   * Parse EMU (English Metric Units) to pixels
   * 1 EMU = 1/914400 inches
   * 96 DPI: 1 inch = 96 pixels
   * 1 EMU = 96/914400 pixels ≈ 0.0001049 pixels
   */
  emuToPixels(emu: number | string | undefined, dpi: number = 96): number {
    if (emu === undefined || emu === null) return 0
    const value = typeof emu === 'string' ? parseInt(emu, 10) : emu
    if (isNaN(value)) return 0
    return (value / 914400) * dpi
  }

  /**
   * Parse EMU to points
   * 1 EMU = 1/914400 inches
   * 1 inch = 72 points
   */
  emuToPoints(emu: number | string | undefined): number {
    if (emu === undefined || emu === null) return 0
    const value = typeof emu === 'string' ? parseInt(emu, 10) : emu
    if (isNaN(value)) return 0
    return (value / 914400) * 72
  }

  /**
   * Parse angle from OOXML format (60000ths of a degree)
   */
  parseAngle(angle: number | string | undefined): number {
    if (angle === undefined || angle === null) return 0
    const value = typeof angle === 'string' ? parseInt(angle, 10) : angle
    if (isNaN(value)) return 0
    return value / 60000
  }

  /**
   * Parse percentage from OOXML format (1000ths of a percent)
   */
  parsePercentage(percentage: number | string | undefined): number {
    if (percentage === undefined || percentage === null) return 100
    const value = typeof percentage === 'string' ? parseInt(percentage, 10) : percentage
    if (isNaN(value)) return 100
    return value / 1000
  }

  /**
   * Parse font size from OOXML format (100ths of a point)
   */
  parseFontSize(size: number | string | undefined): number {
    if (size === undefined || size === null) return 12
    const value = typeof size === 'string' ? parseInt(size, 10) : size
    if (isNaN(value)) return 12
    return value / 100
  }

  /**
   * Parse color from various OOXML color formats
   * Returns color with all modifiers (lumMod, lumOff, satMod, shade, tint, alpha)
   */
  parseColor(colorElement: any): {
    type: string
    value: string
    alpha?: number
    lumMod?: number
    lumOff?: number
    satMod?: number
    shade?: number
    tint?: number
  } | null {
    if (!colorElement) return null

    // Helper to parse all color modifiers from a color element
    const parseModifiers = (clrElement: any) => {
      return {
        alpha: this.parseColorModifier(clrElement, 'alpha'),
        lumMod: this.parseColorModifier(clrElement, 'lumMod'),
        lumOff: this.parseColorModifier(clrElement, 'lumOff'),
        satMod: this.parseColorModifier(clrElement, 'satMod'),
        shade: this.parseColorModifier(clrElement, 'shade'),
        tint: this.parseColorModifier(clrElement, 'tint'),
      }
    }

    // srgbClr - RGB color
    const srgbClr = this.getChild(colorElement, 'srgbClr')
    if (srgbClr) {
      const val = this.getAttr(srgbClr, 'val') || '000000'
      const mods = parseModifiers(srgbClr)
      return { type: 'rgb', value: `#${val}`, ...mods }
    }

    // schemeClr - Theme color
    const schemeClr = this.getChild(colorElement, 'schemeClr')
    if (schemeClr) {
      const val = this.getAttr(schemeClr, 'val') || 'tx1'
      const mods = parseModifiers(schemeClr)
      return { type: 'scheme', value: val, ...mods }
    }

    // prstClr - Preset color
    const prstClr = this.getChild(colorElement, 'prstClr')
    if (prstClr) {
      const val = this.getAttr(prstClr, 'val') || 'black'
      const mods = parseModifiers(prstClr)
      return { type: 'preset', value: val, ...mods }
    }

    // hslClr - HSL color
    const hslClr = this.getChild(colorElement, 'hslClr')
    if (hslClr) {
      const hue = this.getAttr(hslClr, 'hue') || '0'
      const sat = this.getAttr(hslClr, 'sat') || '0'
      const lum = this.getAttr(hslClr, 'lum') || '0'
      const mods = parseModifiers(hslClr)
      return { type: 'hsl', value: `hsl(${parseInt(hue) / 60000}, ${parseInt(sat) / 1000}%, ${parseInt(lum) / 1000}%)`, ...mods }
    }

    // sysClr - System color
    const sysClr = this.getChild(colorElement, 'sysClr')
    if (sysClr) {
      const lastClr = this.getAttr(sysClr, 'lastClr')
      const mods = parseModifiers(sysClr)
      if (lastClr) {
        return { type: 'rgb', value: `#${lastClr}`, ...mods }
      }
      const val = this.getAttr(sysClr, 'val') || 'windowText'
      return { type: 'system', value: val, ...mods }
    }

    return null
  }

  /**
   * Parse color modifier (alpha, lumMod, lumOff, satMod, shade, tint)
   * Values are in EMU format (100000 = 100%)
   */
  private parseColorModifier(colorElement: any, modifierName: string): number | undefined {
    const modifier = this.getChild(colorElement, modifierName)
    if (!modifier) return undefined
    const val = this.getAttr(modifier, 'val')
    if (!val) return undefined
    // Return raw value (will be divided by 100000 in ColorResolver)
    return parseInt(val, 10)
  }

  /**
   * Check if element exists and is truthy
   */
  exists(element: any): boolean {
    return element !== undefined && element !== null
  }

  /**
   * Parse boolean attribute
   */
  parseBoolean(value: string | boolean | undefined, defaultValue: boolean = false): boolean {
    if (value === undefined || value === null) return defaultValue
    if (typeof value === 'boolean') return value
    return value === 'true' || value === '1' || value === 'on'
  }
}
