/**
 * Slide Parser - Parse slide content from OOXML
 */

import { XMLParser } from './xml-parser'
import { ShapeParser } from './shape-parser'
import { AnimationParser } from './animation-parser'
import type {
  Slide,
  SlideMaster,
  SlideLayout,
  SlideElement,
  SlideBackground,
  SlideTransition,
  SlideNotes,
  SlideTiming,
  Theme,
  LayoutType,
  ParserOptions,
} from '../types'

/**
 * Slide Parser
 */
export class SlideParser {
  private xmlParser: XMLParser
  private shapeParser: ShapeParser
  private animationParser: AnimationParser
  private options: ParserOptions

  constructor(xmlParser: XMLParser, options: ParserOptions) {
    this.xmlParser = xmlParser
    this.shapeParser = new ShapeParser(xmlParser)
    this.animationParser = new AnimationParser(xmlParser)
    this.options = options
  }

  /**
   * Parse a slide
   */
  parseSlide(
    xml: any,
    id: number,
    index: number,
    layoutId: string,
    masterId: string,
    relationships: Map<string, { target: string; type: string }>,
    notesXml?: any
  ): Slide {
    const sld = xml['p:sld'] || xml.sld || xml
    const cSld = this.xmlParser.getChild(sld, 'cSld')
    const clrMapOvr = this.xmlParser.getChild(sld, 'clrMapOvr')
    const transition = this.xmlParser.getChild(sld, 'transition')
    const timing = this.xmlParser.getChild(sld, 'timing')

    // Parse shape tree
    const spTree = this.xmlParser.getChild(cSld, 'spTree')
    const elements = this.shapeParser.parseShapeTree(spTree, relationships)

    // Parse background
    const bg = this.xmlParser.getChild(cSld, 'bg')
    const background = this.parseBackground(bg)

    // Parse slide name
    const name = this.xmlParser.getAttr(cSld, 'name')

    // Parse hidden attribute
    const hidden = this.xmlParser.parseBoolean(this.xmlParser.getAttr(sld, 'show'), true) === false

    // Parse transition
    const slideTransition = transition ? this.parseTransition(transition) : undefined

    // Parse timing/animations
    let slideTiming: SlideTiming | undefined
    if (this.options.parseAnimations && timing) {
      slideTiming = this.animationParser.parseTiming(timing)
    }

    // Parse notes
    let notes: SlideNotes | undefined
    if (this.options.parseNotes && notesXml) {
      notes = this.parseNotes(notesXml, relationships)
    }

    return {
      id,
      index,
      name,
      hidden,
      layoutId,
      masterId,
      background,
      elements,
      transition: slideTransition,
      timing: slideTiming,
      notes,
    }
  }

  /**
   * Parse a slide master
   */
  parseMaster(
    xml: any,
    path: string,
    theme: Theme,
    relationships: Map<string, { target: string; type: string }>
  ): SlideMaster {
    const sldMaster = xml['p:sldMaster'] || xml.sldMaster || xml
    const cSld = this.xmlParser.getChild(sldMaster, 'cSld')
    const clrMap = this.xmlParser.getChild(sldMaster, 'clrMap')
    const txStyles = this.xmlParser.getChild(sldMaster, 'txStyles')

    // Parse shape tree
    const spTree = this.xmlParser.getChild(cSld, 'spTree')
    const elements = this.shapeParser.parseShapeTree(spTree, relationships)

    // Parse background
    const bg = this.xmlParser.getChild(cSld, 'bg')
    const background = this.parseBackground(bg)

    // Parse name
    const name = this.xmlParser.getAttr(cSld, 'name')

    // Parse text styles
    const textStyles = txStyles ? this.parseTextStyles(txStyles) : undefined

    return {
      id: path,
      name,
      theme,
      background,
      elements,
      textStyles,
      layouts: [], // Will be populated later
    }
  }

  /**
   * Parse a slide layout
   */
  parseLayout(
    xml: any,
    path: string,
    masterId: string,
    relationships: Map<string, { target: string; type: string }>
  ): SlideLayout {
    const sldLayout = xml['p:sldLayout'] || xml.sldLayout || xml
    const cSld = this.xmlParser.getChild(sldLayout, 'cSld')

    // Parse shape tree
    const spTree = this.xmlParser.getChild(cSld, 'spTree')
    const elements = this.shapeParser.parseShapeTree(spTree, relationships)

    // Parse background
    const bg = this.xmlParser.getChild(cSld, 'bg')
    const background = this.parseBackground(bg)

    // Parse name and type
    const name = this.xmlParser.getAttr(cSld, 'name')
    const type = this.xmlParser.getAttr(sldLayout, 'type') as LayoutType || 'custom'

    // Parse show flags
    const showMasterSp = this.xmlParser.parseBoolean(this.xmlParser.getAttr(sldLayout, 'showMasterSp'), true)
    const showMasterPhAnim = this.xmlParser.parseBoolean(this.xmlParser.getAttr(sldLayout, 'showMasterPhAnim'), true)

    return {
      id: path,
      name,
      type,
      masterId,
      background,
      elements,
      showMasterElements: showMasterSp,
      showMasterBackground: showMasterPhAnim,
    }
  }

  /**
   * Parse background
   */
  private parseBackground(bg: any): SlideBackground | undefined {
    if (!bg) return undefined

    const bgPr = this.xmlParser.getChild(bg, 'bgPr')
    const bgRef = this.xmlParser.getChild(bg, 'bgRef')

    if (bgPr) {
      // Direct background properties
      const solidFill = this.xmlParser.getChild(bgPr, 'solidFill')
      const gradFill = this.xmlParser.getChild(bgPr, 'gradFill')
      const blipFill = this.xmlParser.getChild(bgPr, 'blipFill')

      if (solidFill) {
        const color = this.xmlParser.parseColor(solidFill)
        return {
          fill: {
            type: 'solid',
            solid: color ? {
              type: color.type as any,
              value: color.value,
              alpha: color.alpha,
              lumMod: color.lumMod,
              lumOff: color.lumOff,
              satMod: color.satMod,
              shade: color.shade,
              tint: color.tint,
            } : undefined,
          },
        }
      }

      if (gradFill) {
        // Parse gradient fill
        const gsLst = this.xmlParser.getChild(gradFill, 'gsLst')
        const stops = this.xmlParser.ensureArray(this.xmlParser.getChild(gsLst, 'gs'))

        const gradientStops = stops.map((gs: any) => {
          const pos = parseInt(this.xmlParser.getAttr(gs, 'pos') || '0', 10)
          const color = this.xmlParser.parseColor(gs)
          return {
            position: pos,
            color: color ? {
              type: color.type as any,
              value: color.value,
              alpha: color.alpha,
              lumMod: color.lumMod,
              lumOff: color.lumOff,
              satMod: color.satMod,
              shade: color.shade,
              tint: color.tint,
            } : { type: 'rgb' as const, value: '#000000' },
          }
        })

        const lin = this.xmlParser.getChild(gradFill, 'lin')
        const angle = lin ? this.xmlParser.parseAngle(this.xmlParser.getAttr(lin, 'ang')) : 0

        return {
          fill: {
            type: 'gradient',
            gradient: {
              type: 'linear',
              angle,
              stops: gradientStops,
            },
          },
        }
      }

      if (blipFill) {
        const blip = this.xmlParser.getChild(blipFill, 'blip')
        const embed = this.xmlParser.getAttr(blip, 'r:embed') || this.xmlParser.getAttr(blip, 'embed') || ''

        return {
          fill: {
            type: 'picture',
            picture: {
              embed,
              stretch: !!this.xmlParser.getChild(blipFill, 'stretch'),
            },
          },
        }
      }
    }

    if (bgRef) {
      // Background style reference
      const idx = parseInt(this.xmlParser.getAttr(bgRef, 'idx') || '0', 10)
      const color = this.xmlParser.parseColor(bgRef)

      return {
        fill: {
          type: 'solid',
          solid: color ? {
            type: color.type as any,
            value: color.value,
            alpha: color.alpha,
          } : undefined,
        },
      }
    }

    return undefined
  }

  /**
   * Parse slide transition
   */
  private parseTransition(transition: any): SlideTransition {
    const type = this.getTransitionType(transition)
    const duration = parseInt(this.xmlParser.getAttr(transition, 'spd') || '0', 10)
    const advClick = this.xmlParser.parseBoolean(this.xmlParser.getAttr(transition, 'advClick'), true)
    const advTm = this.xmlParser.getAttr(transition, 'advTm')

    return {
      type,
      duration: this.getTransitionDuration(this.xmlParser.getAttr(transition, 'spd')),
      advanceOnClick: advClick,
      advanceAfterTime: advTm ? parseInt(advTm, 10) : undefined,
    }
  }

  /**
   * Get transition type from transition element
   */
  private getTransitionType(transition: any): string {
    // Check for various transition types
    const types = [
      'fade', 'push', 'wipe', 'split', 'blinds', 'checker', 'circle', 'comb',
      'cover', 'cut', 'diamond', 'dissolve', 'newsflash', 'plus', 'pull',
      'random', 'randomBar', 'strips', 'wedge', 'wheel', 'zoom',
      // Extended transitions
      'conveyor', 'doors', 'fall', 'ferris', 'flip', 'flythrough', 'gallery',
      'glitter', 'honeycomb', 'morph', 'orbit', 'origami', 'pan', 'prism',
      'reveal', 'ripple', 'rotate', 'shred', 'switch', 'vortex', 'warp',
      'window', 'wind',
    ]

    for (const type of types) {
      const element = this.xmlParser.getChild(transition, type) ||
        this.xmlParser.getChild(transition, `p:${type}`) ||
        this.xmlParser.getChild(transition, `p14:${type}`)
      if (element) {
        return type
      }
    }

    return 'none'
  }

  /**
   * Get transition duration from speed attribute
   */
  private getTransitionDuration(speed: string | undefined): number {
    switch (speed) {
      case 'slow': return 1000
      case 'med': return 500
      case 'fast': return 250
      default: return 500
    }
  }

  /**
   * Parse notes slide
   */
  private parseNotes(
    notesXml: any,
    relationships: Map<string, { target: string; type: string }>
  ): SlideNotes {
    const notes = notesXml['p:notes'] || notesXml.notes || notesXml
    const cSld = this.xmlParser.getChild(notes, 'cSld')

    // Parse shape tree
    const spTree = this.xmlParser.getChild(cSld, 'spTree')
    const elements = this.shapeParser.parseShapeTree(spTree, relationships)

    return {
      elements,
    }
  }

  /**
   * Parse text styles from slide master
   */
  private parseTextStyles(txStyles: any): SlideMaster['textStyles'] {
    return {
      title: this.parseTextStyle(this.xmlParser.getChild(txStyles, 'titleStyle')),
      body: this.parseTextStyle(this.xmlParser.getChild(txStyles, 'bodyStyle')),
      other: this.parseTextStyle(this.xmlParser.getChild(txStyles, 'otherStyle')),
    }
  }

  /**
   * Parse individual text style
   */
  private parseTextStyle(style: any): any[] | undefined {
    if (!style) return undefined

    const levels: any[] = []

    for (let i = 1; i <= 9; i++) {
      const lvl = this.xmlParser.getChild(style, `lvl${i}pPr`)
      if (lvl) {
        levels.push(lvl)
      }
    }

    return levels.length > 0 ? levels : undefined
  }
}
