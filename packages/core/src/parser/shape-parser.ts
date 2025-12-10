/**
 * Shape Parser - Parse shape elements from OOXML
 */

import { XMLParser } from './xml-parser'
import { TextParser } from './text-parser'
import type {
  SlideElement,
  Shape,
  Picture,
  Table,
  Chart,
  Diagram,
  GroupShape,
  Connector,
  Media,
  OleObject,
  Transform,
  Geometry,
  Fill,
  LineStyle,
  Effects,
  PlaceholderInfo,
  PlaceholderType,
  PresetGeometry,
  TextBody,
  TableRow,
  TableCell,
  ChartData,
} from '../types'

/**
 * Shape Parser
 */
export class ShapeParser {
  private xmlParser: XMLParser
  private textParser: TextParser

  constructor(xmlParser: XMLParser) {
    this.xmlParser = xmlParser
    this.textParser = new TextParser(xmlParser)
  }

  /**
   * Parse all shapes from a shape tree
   */
  parseShapeTree(spTree: any, relationships: Map<string, { target: string; type: string }>): SlideElement[] {
    const elements: SlideElement[] = []

    if (!spTree) {
      console.warn('[ShapeParser] spTree is null/undefined')
      return elements
    }

    // Parse shapes (sp)
    const shapes = this.xmlParser.ensureArray(this.xmlParser.getChild(spTree, 'sp'))
    for (const sp of shapes) {
      const shape = this.parseShape(sp, relationships)
      if (shape) {
        elements.push(shape)
      }
    }

    // Parse pictures (pic)
    const pictures = this.xmlParser.ensureArray(this.xmlParser.getChild(spTree, 'pic'))
    for (const pic of pictures) {
      const picture = this.parsePicture(pic, relationships)
      if (picture) elements.push(picture)
    }

    // Parse graphic frames (graphicFrame) - charts, tables, diagrams
    const graphicFrames = this.xmlParser.ensureArray(this.xmlParser.getChild(spTree, 'graphicFrame'))
    for (const gf of graphicFrames) {
      const element = this.parseGraphicFrame(gf, relationships)
      if (element) elements.push(element)
    }

    // Parse group shapes (grpSp)
    const groups = this.xmlParser.ensureArray(this.xmlParser.getChild(spTree, 'grpSp'))
    for (const grp of groups) {
      const group = this.parseGroupShape(grp, relationships)
      if (group) elements.push(group)
    }

    // Parse connectors (cxnSp)
    const connectors = this.xmlParser.ensureArray(this.xmlParser.getChild(spTree, 'cxnSp'))
    for (const cxn of connectors) {
      const connector = this.parseConnector(cxn, relationships)
      if (connector) elements.push(connector)
    }

    return elements
  }

  /**
   * Parse a shape element
   */
  parseShape(sp: any, relationships: Map<string, { target: string; type: string }>): Shape | null {
    if (!sp) return null

    const nvSpPr = this.xmlParser.getChild(sp, 'nvSpPr')
    const spPr = this.xmlParser.getChild(sp, 'spPr')
    const txBody = this.xmlParser.getChild(sp, 'txBody')
    const style = this.xmlParser.getChild(sp, 'style')

    const baseProps = this.parseNonVisualProperties(nvSpPr)
    const transform = this.parseTransform(spPr)
    const geometry = this.parseGeometry(spPr)
    const fill = this.parseFill(spPr, style, relationships)
    const line = this.parseLine(spPr, style)
    const effects = this.parseEffects(spPr)
    const placeholder = this.parsePlaceholder(nvSpPr)
    const textBody = txBody ? this.textParser.parseTextBody(txBody) : undefined

    return {
      type: 'shape',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      geometry,
      fill,
      line,
      effects,
      textBody,
      placeholder,
    }
  }

  /**
   * Parse a picture element
   */
  parsePicture(pic: any, relationships: Map<string, { target: string; type: string }>): Picture | null {
    if (!pic) return null

    const nvPicPr = this.xmlParser.getChild(pic, 'nvPicPr')
    const blipFill = this.xmlParser.getChild(pic, 'blipFill')
    const spPr = this.xmlParser.getChild(pic, 'spPr')

    const baseProps = this.parseNonVisualProperties(nvPicPr)
    const transform = this.parseTransform(spPr)
    const geometry = this.parseGeometry(spPr)
    const fill = this.parseFill(spPr)
    const line = this.parseLine(spPr)
    const effects = this.parseEffects(spPr)
    const placeholder = this.parsePlaceholder(nvPicPr)

    // Parse blip fill
    const blip = this.xmlParser.getChild(blipFill, 'blip')
    const embedId = this.xmlParser.getAttr(blip, 'r:embed') || this.xmlParser.getAttr(blip, 'embed')

    let embed = ''
    if (embedId && relationships.has(embedId)) {
      embed = relationships.get(embedId)!.target
    }

    // Parse stretch/tile
    const stretch = this.xmlParser.getChild(blipFill, 'stretch')
    const tile = this.xmlParser.getChild(blipFill, 'tile')
    const srcRect = this.xmlParser.getChild(blipFill, 'srcRect')

    return {
      type: 'picture',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      geometry,
      fill,
      line,
      effects,
      blipFill: {
        embed,
        stretch: !!stretch,
        srcRect: srcRect ? {
          left: parseInt(this.xmlParser.getAttr(srcRect, 'l') || '0', 10),
          top: parseInt(this.xmlParser.getAttr(srcRect, 't') || '0', 10),
          right: parseInt(this.xmlParser.getAttr(srcRect, 'r') || '0', 10),
          bottom: parseInt(this.xmlParser.getAttr(srcRect, 'b') || '0', 10),
        } : undefined,
        tile: tile ? {
          tx: parseInt(this.xmlParser.getAttr(tile, 'tx') || '0', 10),
          ty: parseInt(this.xmlParser.getAttr(tile, 'ty') || '0', 10),
          sx: parseInt(this.xmlParser.getAttr(tile, 'sx') || '100000', 10),
          sy: parseInt(this.xmlParser.getAttr(tile, 'sy') || '100000', 10),
          flip: this.xmlParser.getAttr(tile, 'flip') as any,
          alignment: this.xmlParser.getAttr(tile, 'algn'),
        } : undefined,
      },
      placeholder,
    }
  }

  /**
   * Parse a graphic frame element (table, chart, diagram)
   */
  parseGraphicFrame(gf: any, relationships: Map<string, { target: string; type: string }>): Table | Chart | Diagram | Media | OleObject | null {
    if (!gf) return null

    const nvGraphicFramePr = this.xmlParser.getChild(gf, 'nvGraphicFramePr')
    const xfrm = this.xmlParser.getChild(gf, 'xfrm')
    const graphic = this.xmlParser.getChild(gf, 'graphic')
    const graphicData = this.xmlParser.getChild(graphic, 'graphicData')

    if (!graphicData) return null

    const uri = this.xmlParser.getAttr(graphicData, 'uri')
    const baseProps = this.parseNonVisualProperties(nvGraphicFramePr)
    const transform = this.parseXfrm(xfrm)

    // Table
    if (uri?.includes('table') || this.xmlParser.getChild(graphicData, 'tbl')) {
      return this.parseTable(graphicData, baseProps, transform)
    }

    // Chart
    if (uri?.includes('chart') || this.xmlParser.getChild(graphicData, 'chart')) {
      return this.parseChart(graphicData, baseProps, transform, relationships)
    }

    // Diagram/SmartArt
    if (uri?.includes('diagram') || this.xmlParser.getChild(graphicData, 'relIds')) {
      return this.parseDiagram(graphicData, baseProps, transform, relationships)
    }

    // OLE Object
    if (uri?.includes('oleObject')) {
      return this.parseOleObject(graphicData, baseProps, transform, relationships)
    }

    return null
  }

  /**
   * Parse a table
   */
  private parseTable(graphicData: any, baseProps: any, transform: Transform): Table {
    const tbl = this.xmlParser.getChild(graphicData, 'tbl')
    const tblPr = this.xmlParser.getChild(tbl, 'tblPr')
    const tblGrid = this.xmlParser.getChild(tbl, 'tblGrid')

    // Parse columns
    const gridCols = this.xmlParser.ensureArray(this.xmlParser.getChild(tblGrid, 'gridCol'))
    const columns = gridCols.map((col: any) => ({
      width: parseInt(this.xmlParser.getAttr(col, 'w') || '0', 10),
    }))

    // Parse rows
    const trElements = this.xmlParser.ensureArray(this.xmlParser.getChild(tbl, 'tr'))
    const rows: TableRow[] = trElements.map((tr: any) => {
      const height = parseInt(this.xmlParser.getAttr(tr, 'h') || '0', 10)
      const tcElements = this.xmlParser.ensureArray(this.xmlParser.getChild(tr, 'tc'))

      const cells: TableCell[] = tcElements.map((tc: any) => {
        const tcPr = this.xmlParser.getChild(tc, 'tcPr')
        const txBody = this.xmlParser.getChild(tc, 'txBody')

        return {
          text: txBody ? this.textParser.parseTextBody(txBody) : undefined,
          rowSpan: parseInt(this.xmlParser.getAttr(tc, 'rowSpan') || '1', 10),
          colSpan: parseInt(this.xmlParser.getAttr(tc, 'gridSpan') || '1', 10),
          hMerge: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tc, 'hMerge')),
          vMerge: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tc, 'vMerge')),
          fill: this.parseFill(tcPr),
          anchor: this.xmlParser.getAttr(tcPr, 'anchor') as any,
        }
      })

      return { height, cells }
    })

    return {
      type: 'table',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      rows,
      columns,
      tableStyle: this.xmlParser.getAttr(tblPr, 'tableStyleId'),
      firstRow: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'firstRow')),
      lastRow: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'lastRow')),
      firstCol: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'firstCol')),
      lastCol: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'lastCol')),
      bandRow: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'bandRow')),
      bandCol: this.xmlParser.parseBoolean(this.xmlParser.getAttr(tblPr, 'bandCol')),
    }
  }

  /**
   * Parse a chart
   */
  private parseChart(graphicData: any, baseProps: any, transform: Transform, relationships: Map<string, { target: string; type: string }>): Chart {
    const chartRef = this.xmlParser.getChild(graphicData, 'chart')
    const rId = this.xmlParser.getAttr(chartRef, 'r:id') || this.xmlParser.getAttr(chartRef, 'id')

    let externalData = ''
    if (rId && relationships.has(rId)) {
      externalData = relationships.get(rId)!.target
    }

    // Basic chart data structure - actual chart parsing would need the external chart file
    const chartData: ChartData = {
      type: 'bar',
      series: [],
    }

    return {
      type: 'chart',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      chartData,
      externalData,
    }
  }

  /**
   * Parse a SmartArt diagram
   */
  private parseDiagram(graphicData: any, baseProps: any, transform: Transform, relationships: Map<string, { target: string; type: string }>): Diagram {
    return {
      type: 'diagram',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      layoutType: 'unknown',
      nodes: [],
    }
  }

  /**
   * Parse an OLE object
   */
  private parseOleObject(graphicData: any, baseProps: any, transform: Transform, relationships: Map<string, { target: string; type: string }>): OleObject {
    const oleObj = this.xmlParser.getChild(graphicData, 'oleObj')

    return {
      type: 'ole',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      progId: this.xmlParser.getAttr(oleObj, 'progId') || 'Unknown',
    }
  }

  /**
   * Parse a group shape
   */
  parseGroupShape(grpSp: any, relationships: Map<string, { target: string; type: string }>): GroupShape | null {
    if (!grpSp) return null

    const nvGrpSpPr = this.xmlParser.getChild(grpSp, 'nvGrpSpPr')
    const grpSpPr = this.xmlParser.getChild(grpSp, 'grpSpPr')

    const baseProps = this.parseNonVisualProperties(nvGrpSpPr)
    const xfrm = this.xmlParser.getChild(grpSpPr, 'xfrm')

    const transform: Transform = {
      offset: {
        x: parseInt(this.xmlParser.getAttr(xfrm, 'off.x') || this.xmlParser.getAttr(this.xmlParser.getChild(xfrm, 'off'), 'x') || '0', 10),
        y: parseInt(this.xmlParser.getAttr(xfrm, 'off.y') || this.xmlParser.getAttr(this.xmlParser.getChild(xfrm, 'off'), 'y') || '0', 10),
      },
      extents: {
        width: parseInt(this.xmlParser.getAttr(xfrm, 'ext.cx') || this.xmlParser.getAttr(this.xmlParser.getChild(xfrm, 'ext'), 'cx') || '0', 10),
        height: parseInt(this.xmlParser.getAttr(xfrm, 'ext.cy') || this.xmlParser.getAttr(this.xmlParser.getChild(xfrm, 'ext'), 'cy') || '0', 10),
      },
      rotation: this.xmlParser.parseAngle(this.xmlParser.getAttr(xfrm, 'rot')),
      flipH: this.xmlParser.parseBoolean(this.xmlParser.getAttr(xfrm, 'flipH')),
      flipV: this.xmlParser.parseBoolean(this.xmlParser.getAttr(xfrm, 'flipV')),
    }

    const childXfrm = this.xmlParser.getChild(xfrm, 'chOff')
    const childExt = this.xmlParser.getChild(xfrm, 'chExt')

    const childTransform: Transform = {
      offset: {
        x: parseInt(this.xmlParser.getAttr(childXfrm, 'x') || '0', 10),
        y: parseInt(this.xmlParser.getAttr(childXfrm, 'y') || '0', 10),
      },
      extents: {
        width: parseInt(this.xmlParser.getAttr(childExt, 'cx') || '0', 10),
        height: parseInt(this.xmlParser.getAttr(childExt, 'cy') || '0', 10),
      },
    }

    // Parse child shapes
    const children = this.parseShapeTree(grpSp, relationships)

    return {
      type: 'group',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      children,
      childTransform,
    }
  }

  /**
   * Parse a connector shape
   */
  parseConnector(cxnSp: any, relationships: Map<string, { target: string; type: string }>): Connector | null {
    if (!cxnSp) return null

    const nvCxnSpPr = this.xmlParser.getChild(cxnSp, 'nvCxnSpPr')
    const spPr = this.xmlParser.getChild(cxnSp, 'spPr')

    const baseProps = this.parseNonVisualProperties(nvCxnSpPr)
    const transform = this.parseTransform(spPr)
    const geometry = this.parseGeometry(spPr)
    const line = this.parseLine(spPr)

    // Parse connection info
    const cNvCxnSpPr = this.xmlParser.getChild(nvCxnSpPr, 'cNvCxnSpPr')
    const stCxn = this.xmlParser.getChild(cNvCxnSpPr, 'stCxn')
    const endCxn = this.xmlParser.getChild(cNvCxnSpPr, 'endCxn')

    return {
      type: 'connector',
      id: baseProps.id,
      name: baseProps.name,
      description: baseProps.description,
      hidden: baseProps.hidden,
      transform,
      geometry,
      line,
      startConnection: stCxn ? {
        shapeId: parseInt(this.xmlParser.getAttr(stCxn, 'id') || '0', 10),
        site: parseInt(this.xmlParser.getAttr(stCxn, 'idx') || '0', 10),
      } : undefined,
      endConnection: endCxn ? {
        shapeId: parseInt(this.xmlParser.getAttr(endCxn, 'id') || '0', 10),
        site: parseInt(this.xmlParser.getAttr(endCxn, 'idx') || '0', 10),
      } : undefined,
    }
  }

  /**
   * Parse non-visual properties
   */
  private parseNonVisualProperties(nvPr: any): { id: number; name: string; description?: string; hidden?: boolean } {
    const cNvPr = this.xmlParser.getChild(nvPr, 'cNvPr')

    return {
      id: parseInt(this.xmlParser.getAttr(cNvPr, 'id') || '0', 10),
      name: this.xmlParser.getAttr(cNvPr, 'name') || '',
      description: this.xmlParser.getAttr(cNvPr, 'descr'),
      hidden: this.xmlParser.parseBoolean(this.xmlParser.getAttr(cNvPr, 'hidden')),
    }
  }

  /**
   * Parse transform from spPr
   */
  private parseTransform(spPr: any): Transform {
    const xfrm = this.xmlParser.getChild(spPr, 'xfrm')
    return this.parseXfrm(xfrm)
  }

  /**
   * Parse xfrm element
   */
  private parseXfrm(xfrm: any): Transform {
    if (!xfrm) {
      return {
        offset: { x: 0, y: 0 },
        extents: { width: 0, height: 0 },
      }
    }

    const off = this.xmlParser.getChild(xfrm, 'off')
    const ext = this.xmlParser.getChild(xfrm, 'ext')

    return {
      offset: {
        x: parseInt(this.xmlParser.getAttr(off, 'x') || '0', 10),
        y: parseInt(this.xmlParser.getAttr(off, 'y') || '0', 10),
      },
      extents: {
        width: parseInt(this.xmlParser.getAttr(ext, 'cx') || '0', 10),
        height: parseInt(this.xmlParser.getAttr(ext, 'cy') || '0', 10),
      },
      rotation: this.xmlParser.parseAngle(this.xmlParser.getAttr(xfrm, 'rot')),
      flipH: this.xmlParser.parseBoolean(this.xmlParser.getAttr(xfrm, 'flipH')),
      flipV: this.xmlParser.parseBoolean(this.xmlParser.getAttr(xfrm, 'flipV')),
    }
  }

  /**
   * Parse geometry
   */
  private parseGeometry(spPr: any): Geometry | undefined {
    if (!spPr) return undefined

    // Preset geometry
    const prstGeom = this.xmlParser.getChild(spPr, 'prstGeom')
    if (prstGeom) {
      const prst = this.xmlParser.getAttr(prstGeom, 'prst') as PresetGeometry

      // Parse adjustment values
      const avLst = this.xmlParser.getChild(prstGeom, 'avLst')
      const adjustValues: Record<string, number> = {}

      if (avLst) {
        const gdList = this.xmlParser.ensureArray(this.xmlParser.getChild(avLst, 'gd'))
        for (const gd of gdList) {
          const name = this.xmlParser.getAttr(gd, 'name')
          const fmla = this.xmlParser.getAttr(gd, 'fmla')
          if (name && fmla) {
            // Parse "val X" format
            const match = fmla.match(/val\s+(\d+)/)
            if (match) {
              adjustValues[name] = parseInt(match[1], 10)
            }
          }
        }
      }

      return {
        type: 'preset',
        preset: prst,
        adjustValues: Object.keys(adjustValues).length > 0 ? adjustValues : undefined,
      }
    }

    // Custom geometry
    const custGeom = this.xmlParser.getChild(spPr, 'custGeom')
    if (custGeom) {
      // Custom geometry parsing would go here
      return {
        type: 'custom',
        custom: {
          paths: [],
        },
      }
    }

    return undefined
  }

  /**
   * Parse fill
   */
  private parseFill(spPr: any, style?: any, relationships?: Map<string, { target: string; type: string }>): Fill | undefined {
    if (!spPr) return undefined

    // No fill
    if (this.xmlParser.getChild(spPr, 'noFill')) {
      return { type: 'none' }
    }

    // Solid fill
    const solidFill = this.xmlParser.getChild(spPr, 'solidFill')
    if (solidFill) {
      const color = this.xmlParser.parseColor(solidFill)
      if (color) {
        return {
          type: 'solid',
          solid: {
            type: color.type as any,
            value: color.value,
            alpha: color.alpha,
            lumMod: color.lumMod,
            lumOff: color.lumOff,
            satMod: color.satMod,
            shade: color.shade,
            tint: color.tint,
          },
        }
      }
    }

    // Gradient fill
    const gradFill = this.xmlParser.getChild(spPr, 'gradFill')
    if (gradFill) {
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
        type: 'gradient',
        gradient: {
          type: 'linear',
          angle,
          stops: gradientStops,
        },
      }
    }

    // Pattern fill
    const pattFill = this.xmlParser.getChild(spPr, 'pattFill')
    if (pattFill) {
      const fgClr = this.xmlParser.getChild(pattFill, 'fgClr')
      const bgClr = this.xmlParser.getChild(pattFill, 'bgClr')

      return {
        type: 'pattern',
        pattern: {
          preset: this.xmlParser.getAttr(pattFill, 'prst') || 'solid',
          foregroundColor: this.xmlParser.parseColor(fgClr) as any || { type: 'rgb', value: '#000000' },
          backgroundColor: this.xmlParser.parseColor(bgClr) as any || { type: 'rgb', value: '#FFFFFF' },
        },
      }
    }

    // Picture fill
    const blipFill = this.xmlParser.getChild(spPr, 'blipFill')
    if (blipFill) {
      const blip = this.xmlParser.getChild(blipFill, 'blip')
      const embedId = this.xmlParser.getAttr(blip, 'r:embed') || this.xmlParser.getAttr(blip, 'embed') || ''

      // Resolve relationship ID to actual image path
      let imagePath = embedId
      if (relationships && embedId) {
        const rel = relationships.get(embedId)
        if (rel && rel.target) {
          // Convert relative path to full path
          imagePath = rel.target.startsWith('../')
            ? 'ppt/' + rel.target.replace('../', '')
            : rel.target.startsWith('ppt/') ? rel.target : 'ppt/media/' + rel.target
        }
      }

      return {
        type: 'picture',
        picture: {
          embed: imagePath,
          stretch: !!this.xmlParser.getChild(blipFill, 'stretch'),
        },
      }
    }

    // Check style for fillRef (theme fill reference)
    if (style) {
      const fillRef = this.xmlParser.getChild(style, 'fillRef')
      if (fillRef) {
        // fillRef contains a color that should be used for the fill
        // The idx attribute indicates which fill style to use from theme
        const idx = this.xmlParser.getAttr(fillRef, 'idx')
        const color = this.xmlParser.parseColor(fillRef)

        if (color) {
          return {
            type: 'solid',
            solid: {
              type: color.type as any,
              value: color.value,
              alpha: color.alpha,
              lumMod: color.lumMod,
              lumOff: color.lumOff,
              satMod: color.satMod,
              shade: color.shade,
              tint: color.tint,
            },
          }
        }

        // If fillRef has idx but no color, use a fallback based on idx
        // idx 0 = no fill, idx 1 = solid fill using scheme color
        if (idx && parseInt(idx) > 0) {
          // Use scheme color 'lt1' (light 1) as default for non-zero fillRef
          return {
            type: 'solid',
            solid: {
              type: 'scheme',
              value: 'lt1', // Default to light 1
            },
          }
        }
      }
    }

    return undefined
  }

  /**
   * Parse line/stroke style
   */
  private parseLine(spPr: any, style?: any): LineStyle | undefined {
    const ln = this.xmlParser.getChild(spPr, 'ln')
    if (!ln) return undefined

    const width = parseInt(this.xmlParser.getAttr(ln, 'w') || '0', 10)

    // No line
    if (this.xmlParser.getChild(ln, 'noFill')) {
      return { width, fill: { type: 'none' } }
    }

    const fill = this.parseFill(ln)
    const prstDash = this.xmlParser.getChild(ln, 'prstDash')
    const dashType = this.xmlParser.getAttr(prstDash, 'val') as LineStyle['dashType']

    return {
      width,
      fill,
      dashType: dashType || 'solid',
      capType: this.xmlParser.getAttr(ln, 'cap') as LineStyle['capType'],
      joinType: this.parseJoinType(ln),
    }
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
   * Parse effects
   */
  private parseEffects(spPr: any): Effects | undefined {
    const effectLst = this.xmlParser.getChild(spPr, 'effectLst')
    if (!effectLst) return undefined

    const effects: Effects = {}

    // Outer shadow
    const outerShdw = this.xmlParser.getChild(effectLst, 'outerShdw')
    if (outerShdw) {
      const color = this.xmlParser.parseColor(outerShdw)
      effects.shadow = {
        type: 'outer',
        color: color ? {
          type: color.type as any,
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
      effects.glow = {
        color: color ? {
          type: color.type as any,
          value: color.value,
          alpha: color.alpha,
        } : { type: 'rgb', value: '#FFFF00' },
        radius: parseInt(this.xmlParser.getAttr(glow, 'rad') || '0', 10),
      }
    }

    // Soft edge
    const softEdge = this.xmlParser.getChild(effectLst, 'softEdge')
    if (softEdge) {
      effects.softEdge = parseInt(this.xmlParser.getAttr(softEdge, 'rad') || '0', 10)
    }

    return Object.keys(effects).length > 0 ? effects : undefined
  }

  /**
   * Parse placeholder info
   */
  private parsePlaceholder(nvPr: any): PlaceholderInfo | undefined {
    const nvPrContent = this.xmlParser.getChild(nvPr, 'nvPr')
    const ph = this.xmlParser.getChild(nvPrContent, 'ph')

    if (!ph) return undefined

    const type = this.xmlParser.getAttr(ph, 'type') as PlaceholderType || 'body'
    const idx = this.xmlParser.getAttr(ph, 'idx')

    return {
      type,
      index: idx ? parseInt(idx, 10) : undefined,
      hasCustomPrompt: this.xmlParser.parseBoolean(this.xmlParser.getAttr(ph, 'hasCustomPrompt')),
    }
  }
}
