/**
 * Text Parser - Parse text content from OOXML
 */

import { XMLParser } from './xml-parser'
import type {
  TextBody,
  TextBodyProperties,
  Paragraph,
  ParagraphProperties,
  TextRun,
  TextRunProperties,
  BulletProperties,
  FontProperties,
  ListStyle,
  HyperlinkInfo,
} from '../types'

/**
 * Text Parser
 */
export class TextParser {
  private xmlParser: XMLParser

  constructor(xmlParser: XMLParser) {
    this.xmlParser = xmlParser
  }

  /**
   * Parse text body
   */
  parseTextBody(txBody: any): TextBody {
    const bodyPr = this.xmlParser.getChild(txBody, 'bodyPr')
    const lstStyle = this.xmlParser.getChild(txBody, 'lstStyle')

    // Parse paragraphs
    const pElements = this.xmlParser.ensureArray(this.xmlParser.getChild(txBody, 'p'))
    const paragraphs = pElements.map(p => this.parseParagraph(p))

    return {
      paragraphs,
      bodyProperties: this.parseBodyProperties(bodyPr),
      listStyles: this.parseListStyles(lstStyle),
    }
  }

  /**
   * Parse body properties
   */
  private parseBodyProperties(bodyPr: any): TextBodyProperties | undefined {
    if (!bodyPr) return undefined

    return {
      anchor: this.xmlParser.getAttr(bodyPr, 'anchor') as TextBodyProperties['anchor'],
      anchorCenter: this.xmlParser.parseBoolean(this.xmlParser.getAttr(bodyPr, 'anchorCtr')),
      wrap: this.xmlParser.getAttr(bodyPr, 'wrap') as TextBodyProperties['wrap'],
      leftInset: parseInt(this.xmlParser.getAttr(bodyPr, 'lIns') || '91440', 10),
      rightInset: parseInt(this.xmlParser.getAttr(bodyPr, 'rIns') || '91440', 10),
      topInset: parseInt(this.xmlParser.getAttr(bodyPr, 'tIns') || '45720', 10),
      bottomInset: parseInt(this.xmlParser.getAttr(bodyPr, 'bIns') || '45720', 10),
      columns: parseInt(this.xmlParser.getAttr(bodyPr, 'numCol') || '1', 10),
      columnSpacing: parseInt(this.xmlParser.getAttr(bodyPr, 'spcCol') || '0', 10),
      rotation: this.xmlParser.parseAngle(this.xmlParser.getAttr(bodyPr, 'rot')),
      vertical: this.xmlParser.getAttr(bodyPr, 'vert') as TextBodyProperties['vertical'],
      autoFit: this.parseAutoFit(bodyPr),
    }
  }

  /**
   * Parse auto-fit mode
   */
  private parseAutoFit(bodyPr: any): TextBodyProperties['autoFit'] {
    if (this.xmlParser.getChild(bodyPr, 'noAutofit')) return 'none'
    if (this.xmlParser.getChild(bodyPr, 'normAutofit')) return 'normal'
    if (this.xmlParser.getChild(bodyPr, 'spAutoFit')) return 'shape'
    return 'none'
  }

  /**
   * Parse list styles
   */
  private parseListStyles(lstStyle: any): ListStyle[] | undefined {
    if (!lstStyle) return undefined

    const styles: ListStyle[] = []

    for (let level = 1; level <= 9; level++) {
      const lvlPr = this.xmlParser.getChild(lstStyle, `lvl${level}pPr`)
      if (lvlPr) {
        styles.push({
          level: level - 1,
          bullet: this.parseBullet(lvlPr),
          paragraph: this.parseParagraphProperties(lvlPr),
        })
      }
    }

    return styles.length > 0 ? styles : undefined
  }

  /**
   * Parse paragraph
   */
  parseParagraph(p: any): Paragraph {
    const pPr = this.xmlParser.getChild(p, 'pPr')
    const endParaRPr = this.xmlParser.getChild(p, 'endParaRPr')

    // Parse runs
    const runs: TextRun[] = []

    // Get all child elements in order
    const children = this.getOrderedChildren(p)

    for (const child of children) {
      if (child.type === 'r') {
        runs.push(this.parseTextRun(child.element))
      } else if (child.type === 'br') {
        runs.push({ type: 'break' })
      } else if (child.type === 'fld') {
        runs.push(this.parseField(child.element))
      }
    }

    return {
      properties: this.parseParagraphProperties(pPr),
      runs,
      endProperties: this.parseRunProperties(endParaRPr),
    }
  }

  /**
   * Get ordered children for paragraph
   */
  private getOrderedChildren(p: any): { type: string; element: any }[] {
    const children: { type: string; element: any }[] = []

    // Text runs
    const rElements = this.xmlParser.ensureArray(this.xmlParser.getChild(p, 'r'))
    for (const r of rElements) {
      children.push({ type: 'r', element: r })
    }

    // Line breaks
    const brElements = this.xmlParser.ensureArray(this.xmlParser.getChild(p, 'br'))
    for (const br of brElements) {
      children.push({ type: 'br', element: br })
    }

    // Fields
    const fldElements = this.xmlParser.ensureArray(this.xmlParser.getChild(p, 'fld'))
    for (const fld of fldElements) {
      children.push({ type: 'fld', element: fld })
    }

    return children
  }

  /**
   * Parse paragraph properties
   */
  parseParagraphProperties(pPr: any): ParagraphProperties | undefined {
    if (!pPr) return undefined

    const spcBef = this.xmlParser.getChild(pPr, 'spcBef')
    const spcAft = this.xmlParser.getChild(pPr, 'spcAft')
    const lnSpc = this.xmlParser.getChild(pPr, 'lnSpc')

    return {
      alignment: this.xmlParser.getAttr(pPr, 'algn') as ParagraphProperties['alignment'],
      level: parseInt(this.xmlParser.getAttr(pPr, 'lvl') || '0', 10),
      indent: parseInt(this.xmlParser.getAttr(pPr, 'indent') || '0', 10),
      marginLeft: parseInt(this.xmlParser.getAttr(pPr, 'marL') || '0', 10),
      marginRight: parseInt(this.xmlParser.getAttr(pPr, 'marR') || '0', 10),
      spaceBefore: this.parseSpacing(spcBef),
      spaceAfter: this.parseSpacing(spcAft),
      lineSpacing: this.parseSpacing(lnSpc),
      bullet: this.parseBullet(pPr),
      tabStops: this.parseTabStops(pPr),
      defaultRunProperties: this.parseRunProperties(this.xmlParser.getChild(pPr, 'defRPr')),
    }
  }

  /**
   * Parse spacing value
   */
  private parseSpacing(spacing: any): number | { percentage: number } | undefined {
    if (!spacing) return undefined

    const spcPts = this.xmlParser.getChild(spacing, 'spcPts')
    if (spcPts) {
      return parseInt(this.xmlParser.getAttr(spcPts, 'val') || '0', 10)
    }

    const spcPct = this.xmlParser.getChild(spacing, 'spcPct')
    if (spcPct) {
      return { percentage: parseInt(this.xmlParser.getAttr(spcPct, 'val') || '100000', 10) / 1000 }
    }

    return undefined
  }

  /**
   * Parse bullet properties
   */
  private parseBullet(pPr: any): BulletProperties | undefined {
    if (!pPr) return undefined

    // No bullet
    if (this.xmlParser.getChild(pPr, 'buNone')) {
      return { type: 'none' }
    }

    // Auto numbered
    const buAutoNum = this.xmlParser.getChild(pPr, 'buAutoNum')
    if (buAutoNum) {
      return {
        type: 'auto',
        startAt: parseInt(this.xmlParser.getAttr(buAutoNum, 'startAt') || '1', 10),
      }
    }

    // Character bullet
    const buChar = this.xmlParser.getChild(pPr, 'buChar')
    if (buChar) {
      return {
        type: 'char',
        char: this.xmlParser.getAttr(buChar, 'char') || '•',
        font: this.parseBulletFont(pPr),
        color: this.parseBulletColor(pPr),
        size: this.parseBulletSize(pPr),
      }
    }

    // Picture bullet
    const buBlip = this.xmlParser.getChild(pPr, 'buBlip')
    if (buBlip) {
      const blip = this.xmlParser.getChild(buBlip, 'blip')
      return {
        type: 'picture',
        pictureId: this.xmlParser.getAttr(blip, 'r:embed') || this.xmlParser.getAttr(blip, 'embed'),
      }
    }

    return undefined
  }

  /**
   * Parse bullet font
   */
  private parseBulletFont(pPr: any): FontProperties | undefined {
    const buFont = this.xmlParser.getChild(pPr, 'buFont')
    if (!buFont) return undefined

    return {
      typeface: this.xmlParser.getAttr(buFont, 'typeface'),
      pitchFamily: parseInt(this.xmlParser.getAttr(buFont, 'pitchFamily') || '0', 10),
      charset: parseInt(this.xmlParser.getAttr(buFont, 'charset') || '0', 10),
    }
  }

  /**
   * Parse bullet color
   */
  private parseBulletColor(pPr: any): any {
    const buClr = this.xmlParser.getChild(pPr, 'buClr')
    if (!buClr) return undefined

    return this.xmlParser.parseColor(buClr)
  }

  /**
   * Parse bullet size
   */
  private parseBulletSize(pPr: any): number | { percentage: number } | undefined {
    const buSzPts = this.xmlParser.getChild(pPr, 'buSzPts')
    if (buSzPts) {
      return parseInt(this.xmlParser.getAttr(buSzPts, 'val') || '0', 10)
    }

    const buSzPct = this.xmlParser.getChild(pPr, 'buSzPct')
    if (buSzPct) {
      return { percentage: parseInt(this.xmlParser.getAttr(buSzPct, 'val') || '100000', 10) / 1000 }
    }

    return undefined
  }

  /**
   * Parse tab stops
   */
  private parseTabStops(pPr: any): { position: number; alignment: 'left' | 'center' | 'right' | 'decimal' }[] | undefined {
    const tabLst = this.xmlParser.getChild(pPr, 'tabLst')
    if (!tabLst) return undefined

    const tabs = this.xmlParser.ensureArray(this.xmlParser.getChild(tabLst, 'tab'))
    return tabs.map((tab: any) => ({
      position: parseInt(this.xmlParser.getAttr(tab, 'pos') || '0', 10),
      alignment: (this.xmlParser.getAttr(tab, 'algn') || 'left') as 'left' | 'center' | 'right' | 'decimal',
    }))
  }

  /**
   * Parse text run
   */
  parseTextRun(r: any): TextRun {
    const rPr = this.xmlParser.getChild(r, 'rPr')
    const t = this.xmlParser.getChild(r, 't')

    return {
      type: 'text',
      text: this.xmlParser.getText(t),
      properties: this.parseRunProperties(rPr),
    }
  }

  /**
   * Parse field (slide number, date, etc.)
   */
  private parseField(fld: any): TextRun {
    const rPr = this.xmlParser.getChild(fld, 'rPr')
    const t = this.xmlParser.getChild(fld, 't')
    const type = this.xmlParser.getAttr(fld, 'type')

    return {
      type: 'field',
      text: this.xmlParser.getText(t),
      properties: this.parseRunProperties(rPr),
      fieldType: type,
    }
  }

  /**
   * Parse run properties
   */
  parseRunProperties(rPr: any): TextRunProperties | undefined {
    if (!rPr) return undefined

    const solidFill = this.xmlParser.getChild(rPr, 'solidFill')
    const ln = this.xmlParser.getChild(rPr, 'ln')
    const latin = this.xmlParser.getChild(rPr, 'latin')
    const ea = this.xmlParser.getChild(rPr, 'ea')
    const cs = this.xmlParser.getChild(rPr, 'cs')
    const hlinkClick = this.xmlParser.getChild(rPr, 'hlinkClick')
    const highlight = this.xmlParser.getChild(rPr, 'highlight')

    return {
      fontSize: parseInt(this.xmlParser.getAttr(rPr, 'sz') || '0', 10) || undefined,
      bold: this.xmlParser.parseBoolean(this.xmlParser.getAttr(rPr, 'b')),
      italic: this.xmlParser.parseBoolean(this.xmlParser.getAttr(rPr, 'i')),
      underline: this.xmlParser.getAttr(rPr, 'u') as TextRunProperties['underline'],
      strike: this.xmlParser.getAttr(rPr, 'strike') as TextRunProperties['strike'],
      baseline: parseInt(this.xmlParser.getAttr(rPr, 'baseline') || '0', 10) || undefined,
      spacing: parseInt(this.xmlParser.getAttr(rPr, 'spc') || '0', 10) || undefined,
      fill: solidFill ? {
        type: 'solid',
        solid: this.xmlParser.parseColor(solidFill) as any,
      } : undefined,
      line: ln ? {
        width: parseInt(this.xmlParser.getAttr(ln, 'w') || '0', 10),
      } : undefined,
      font: latin ? {
        typeface: this.xmlParser.getAttr(latin, 'typeface'),
        panose: this.xmlParser.getAttr(latin, 'panose'),
        pitchFamily: parseInt(this.xmlParser.getAttr(latin, 'pitchFamily') || '0', 10),
        charset: parseInt(this.xmlParser.getAttr(latin, 'charset') || '0', 10),
        eastAsia: ea ? this.xmlParser.getAttr(ea, 'typeface') : undefined,
        cs: cs ? this.xmlParser.getAttr(cs, 'typeface') : undefined,
      } : undefined,
      lang: this.xmlParser.getAttr(rPr, 'lang'),
      altLang: this.xmlParser.getAttr(rPr, 'altLang'),
      hyperlink: hlinkClick ? this.parseHyperlink(hlinkClick) : undefined,
      highlight: highlight ? this.xmlParser.parseColor(highlight) as any : undefined,
    }
  }

  /**
   * Parse hyperlink
   */
  private parseHyperlink(hlinkClick: any): HyperlinkInfo {
    return {
      url: this.xmlParser.getAttr(hlinkClick, 'r:id') || this.xmlParser.getAttr(hlinkClick, 'id'),
      action: this.xmlParser.getAttr(hlinkClick, 'action'),
      tooltip: this.xmlParser.getAttr(hlinkClick, 'tooltip'),
    }
  }
}
