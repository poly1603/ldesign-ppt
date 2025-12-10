/**
 * Color Resolver - Resolves scheme colors to actual RGB values
 */

import type { Color, ColorScheme, Theme } from '../types'

/** Default Office theme colors (fallback) */
const DEFAULT_THEME_COLORS: Record<string, string> = {
  // Light/Dark
  dk1: '#000000',
  lt1: '#FFFFFF',
  dk2: '#1F497D',
  lt2: '#EEECE1',
  // Accent colors (Office default blue theme)
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  // Hyperlinks
  hlink: '#0563C1',
  folHlink: '#954F72',
  // Background/Text aliases
  bg1: '#FFFFFF',
  bg2: '#EEECE1',
  tx1: '#000000',
  tx2: '#1F497D',
}

/**
 * Color Resolver class
 */
export class ColorResolver {
  private colorScheme: ColorScheme | null = null
  private schemeColors: Record<string, string> = { ...DEFAULT_THEME_COLORS }

  /**
   * Set the theme to use for color resolution
   */
  setTheme(theme: Theme | null): void {
    if (theme?.colorScheme) {
      this.colorScheme = theme.colorScheme
      this.buildSchemeColors()
    }
  }

  /**
   * Build scheme color lookup from theme
   */
  private buildSchemeColors(): void {
    if (!this.colorScheme?.colors) return

    const colors = this.colorScheme.colors

    // Map theme colors
    if (colors.dk1) this.schemeColors.dk1 = this.colorToHex(colors.dk1)
    if (colors.lt1) this.schemeColors.lt1 = this.colorToHex(colors.lt1)
    if (colors.dk2) this.schemeColors.dk2 = this.colorToHex(colors.dk2)
    if (colors.lt2) this.schemeColors.lt2 = this.colorToHex(colors.lt2)
    if (colors.accent1) this.schemeColors.accent1 = this.colorToHex(colors.accent1)
    if (colors.accent2) this.schemeColors.accent2 = this.colorToHex(colors.accent2)
    if (colors.accent3) this.schemeColors.accent3 = this.colorToHex(colors.accent3)
    if (colors.accent4) this.schemeColors.accent4 = this.colorToHex(colors.accent4)
    if (colors.accent5) this.schemeColors.accent5 = this.colorToHex(colors.accent5)
    if (colors.accent6) this.schemeColors.accent6 = this.colorToHex(colors.accent6)
    if (colors.hlink) this.schemeColors.hlink = this.colorToHex(colors.hlink)
    if (colors.folHlink) this.schemeColors.folHlink = this.colorToHex(colors.folHlink)

    // Set background/text aliases
    this.schemeColors.bg1 = this.schemeColors.lt1
    this.schemeColors.bg2 = this.schemeColors.lt2
    this.schemeColors.tx1 = this.schemeColors.dk1
    this.schemeColors.tx2 = this.schemeColors.dk2
  }

  /**
   * Convert Color object to hex string
   */
  private colorToHex(color: Color): string {
    if (color.type === 'rgb') {
      let value = color.value
      if (!value.startsWith('#')) {
        value = `#${value}`
      }
      return value
    }
    return color.value
  }

  /**
   * Resolve a Color object to CSS color string
   */
  resolve(color: Color | undefined | null): string {
    if (!color) return 'transparent'

    let baseColor: string

    switch (color.type) {
      case 'rgb':
        baseColor = color.value.startsWith('#') ? color.value : `#${color.value}`
        break

      case 'scheme':
        baseColor = this.schemeColors[color.value] || DEFAULT_THEME_COLORS[color.value] || '#000000'
        break

      case 'preset':
        baseColor = this.resolvePresetColor(color.value)
        break

      case 'hsl':
        baseColor = color.value
        break

      default:
        baseColor = '#000000'
    }

    // Apply color modifiers
    baseColor = this.applyModifiers(baseColor, color)

    return baseColor
  }

  /**
   * Apply color modifiers (lumMod, lumOff, satMod, shade, tint)
   */
  private applyModifiers(hex: string, color: Color): string {
    if (!color.lumMod && !color.lumOff && !color.satMod && !color.shade && !color.tint) {
      return hex
    }

    // Parse hex to RGB
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex

    // Convert to HSL for easier manipulation
    let hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b)

    // Apply luminance modifier (percentage, 100000 = 100%)
    if (color.lumMod !== undefined) {
      hsl.l = hsl.l * (color.lumMod / 100000)
    }

    // Apply luminance offset (percentage, 100000 = 100%)
    if (color.lumOff !== undefined) {
      hsl.l = hsl.l + (color.lumOff / 100000)
    }

    // Apply saturation modifier
    if (color.satMod !== undefined) {
      hsl.s = hsl.s * (color.satMod / 100000)
    }

    // Apply shade (darken) - mix with black
    // PPTXjs: A 10% shade is 10% of the input color combined with 90% black
    if (color.shade !== undefined) {
      const shadeFactor = color.shade / 100000
      // Convert back to RGB for proper shade calculation
      const tempRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l)
      tempRgb.r = Math.round(tempRgb.r * shadeFactor)
      tempRgb.g = Math.round(tempRgb.g * shadeFactor)
      tempRgb.b = Math.round(tempRgb.b * shadeFactor)
      hsl = this.rgbToHsl(tempRgb.r, tempRgb.g, tempRgb.b)
    }

    // Apply tint (lighten) - mix with white
    // PPTXjs: A 10% tint is 10% of the input color combined with 90% white
    if (color.tint !== undefined) {
      const tintFactor = color.tint / 100000
      // Convert back to RGB for proper tint calculation
      const tempRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l)
      tempRgb.r = Math.round(tempRgb.r + (255 - tempRgb.r) * (1 - tintFactor))
      tempRgb.g = Math.round(tempRgb.g + (255 - tempRgb.g) * (1 - tintFactor))
      tempRgb.b = Math.round(tempRgb.b + (255 - tempRgb.b) * (1 - tintFactor))
      hsl = this.rgbToHsl(tempRgb.r, tempRgb.g, tempRgb.b)
    }

    // Clamp values
    hsl.l = Math.max(0, Math.min(1, hsl.l))
    hsl.s = Math.max(0, Math.min(1, hsl.s))

    // Convert back to RGB
    const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l)
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b)
  }

  /**
   * Resolve preset color name to hex
   * Based on PPTXjs preset color list (140+ colors)
   */
  private resolvePresetColor(name: string): string {
    const presetColors: Record<string, string> = {
      // Basic colors
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      // Gray variants
      gray: '#808080',
      grey: '#808080',
      darkGray: '#a9a9a9',
      darkGrey: '#a9a9a9',
      lightGray: '#d3d3d3',
      lightGrey: '#d3d3d3',
      dimGray: '#696969',
      dimGrey: '#696969',
      slateGray: '#708090',
      slateGrey: '#708090',
      lightSlateGray: '#778899',
      lightSlateGrey: '#778899',
      // Extended colors (from PPTXjs)
      aliceBlue: '#f0f8ff',
      antiqueWhite: '#faebd7',
      aqua: '#00ffff',
      aquamarine: '#7fffd4',
      azure: '#f0ffff',
      beige: '#f5f5dc',
      bisque: '#ffe4c4',
      blanchedAlmond: '#ffebcd',
      blueViolet: '#8a2be2',
      brown: '#a52a2a',
      burlyWood: '#deb887',
      cadetBlue: '#5f9ea0',
      chartreuse: '#7fff00',
      chocolate: '#d2691e',
      coral: '#ff7f50',
      cornflowerBlue: '#6495ed',
      cornsilk: '#fff8dc',
      crimson: '#dc143c',
      darkBlue: '#00008b',
      darkCyan: '#008b8b',
      darkGoldenRod: '#b8860b',
      darkGreen: '#006400',
      darkKhaki: '#bdb76b',
      darkMagenta: '#8b008b',
      darkOliveGreen: '#556b2f',
      darkOrange: '#ff8c00',
      darkOrchid: '#9932cc',
      darkRed: '#8b0000',
      darkSalmon: '#e9967a',
      darkSeaGreen: '#8fbc8f',
      darkSlateBlue: '#483d8b',
      darkSlateGray: '#2f4f4f',
      darkSlateGrey: '#2f4f4f',
      darkTurquoise: '#00ced1',
      darkViolet: '#9400d3',
      deepPink: '#ff1493',
      deepSkyBlue: '#00bfff',
      dodgerBlue: '#1e90ff',
      fireBrick: '#b22222',
      floralWhite: '#fffaf0',
      forestGreen: '#228b22',
      fuchsia: '#ff00ff',
      gainsboro: '#dcdcdc',
      ghostWhite: '#f8f8ff',
      gold: '#ffd700',
      goldenRod: '#daa520',
      greenYellow: '#adff2f',
      honeyDew: '#f0fff0',
      hotPink: '#ff69b4',
      indianRed: '#cd5c5c',
      indigo: '#4b0082',
      ivory: '#fffff0',
      khaki: '#f0e68c',
      lavender: '#e6e6fa',
      lavenderBlush: '#fff0f5',
      lawnGreen: '#7cfc00',
      lemonChiffon: '#fffacd',
      lightBlue: '#add8e6',
      lightCoral: '#f08080',
      lightCyan: '#e0ffff',
      lightGoldenRodYellow: '#fafad2',
      lightGreen: '#90ee90',
      lightPink: '#ffb6c1',
      lightSalmon: '#ffa07a',
      lightSeaGreen: '#20b2aa',
      lightSkyBlue: '#87cefa',
      lightSteelBlue: '#b0c4de',
      lightYellow: '#ffffe0',
      lime: '#00ff00',
      limeGreen: '#32cd32',
      linen: '#faf0e6',
      maroon: '#800000',
      mediumAquaMarine: '#66cdaa',
      mediumBlue: '#0000cd',
      mediumOrchid: '#ba55d3',
      mediumPurple: '#9370db',
      mediumSeaGreen: '#3cb371',
      mediumSlateBlue: '#7b68ee',
      mediumSpringGreen: '#00fa9a',
      mediumTurquoise: '#48d1cc',
      mediumVioletRed: '#c71585',
      midnightBlue: '#191970',
      mintCream: '#f5fffa',
      mistyRose: '#ffe4e1',
      moccasin: '#ffe4b5',
      navajoWhite: '#ffdead',
      navy: '#000080',
      oldLace: '#fdf5e6',
      olive: '#808000',
      oliveDrab: '#6b8e23',
      orange: '#ffa500',
      orangeRed: '#ff4500',
      orchid: '#da70d6',
      paleGoldenRod: '#eee8aa',
      paleGreen: '#98fb98',
      paleTurquoise: '#afeeee',
      paleVioletRed: '#db7093',
      papayaWhip: '#ffefd5',
      peachPuff: '#ffdab9',
      peru: '#cd853f',
      pink: '#ffc0cb',
      plum: '#dda0dd',
      powderBlue: '#b0e0e6',
      purple: '#800080',
      rebeccaPurple: '#663399',
      rosyBrown: '#bc8f8f',
      royalBlue: '#4169e1',
      saddleBrown: '#8b4513',
      salmon: '#fa8072',
      sandyBrown: '#f4a460',
      seaGreen: '#2e8b57',
      seaShell: '#fff5ee',
      sienna: '#a0522d',
      silver: '#c0c0c0',
      skyBlue: '#87ceeb',
      slateBlue: '#6a5acd',
      snow: '#fffafa',
      springGreen: '#00ff7f',
      steelBlue: '#4682b4',
      tan: '#d2b48c',
      teal: '#008080',
      thistle: '#d8bfd8',
      tomato: '#ff6347',
      turquoise: '#40e0d0',
      violet: '#ee82ee',
      wheat: '#f5deb3',
      whiteSmoke: '#f5f5f5',
      yellowGreen: '#9acd32',
    }
    // Try exact match first, then lowercase
    return presetColors[name] || presetColors[name.toLowerCase()] || '#000000'
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return { h, s, l }
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }
  }
}

/** Singleton instance */
let colorResolverInstance: ColorResolver | null = null

/**
 * Get the color resolver instance
 */
export function getColorResolver(): ColorResolver {
  if (!colorResolverInstance) {
    colorResolverInstance = new ColorResolver()
  }
  return colorResolverInstance
}

/**
 * Create a new color resolver with theme
 */
export function createColorResolver(theme?: Theme | null): ColorResolver {
  const resolver = new ColorResolver()
  if (theme) {
    resolver.setTheme(theme)
  }
  return resolver
}
