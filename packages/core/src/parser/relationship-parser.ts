/**
 * Relationship Parser - Parse OOXML relationship files
 */

import { XMLParser } from './xml-parser'

/** Relationship types */
export const RELATIONSHIP_TYPES = {
  SLIDE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  SLIDE_LAYOUT: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  SLIDE_MASTER: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  THEME: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  NOTES_SLIDE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
  NOTES_MASTER: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster',
  HANDOUT_MASTER: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster',
  IMAGE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  AUDIO: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio',
  VIDEO: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/video',
  OLE_OBJECT: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject',
  CHART: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
  DIAGRAM_DATA: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData',
  DIAGRAM_LAYOUT: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout',
  DIAGRAM_QUICK_STYLE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramQuickStyle',
  DIAGRAM_COLORS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramColors',
  HYPERLINK: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
  EXTERNAL_LINK: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink',
  COMMENTS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments',
  TABLE_STYLES: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles',
  PRES_PROPS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps',
  VIEW_PROPS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps',
} as const

/**
 * Relationship info
 */
export interface RelationshipInfo {
  id: string
  type: string
  target: string
  targetMode?: 'External' | 'Internal'
}

/**
 * Relationship Parser
 */
export class RelationshipParser {
  private xmlParser: XMLParser

  constructor(xmlParser: XMLParser) {
    this.xmlParser = xmlParser
  }

  /**
   * Parse relationships XML
   */
  parse(xml: any, basePath: string): Map<string, { target: string; type: string }> {
    const relationships = new Map<string, { target: string; type: string }>()

    if (!xml) return relationships

    const rels = xml.Relationships
    if (!rels) return relationships

    const relList = this.xmlParser.ensureArray(rels.Relationship)

    for (const rel of relList) {
      const id = this.xmlParser.getAttr(rel, 'Id')
      const type = this.xmlParser.getAttr(rel, 'Type') || ''
      const target = this.xmlParser.getAttr(rel, 'Target') || ''
      const targetMode = this.xmlParser.getAttr(rel, 'TargetMode')

      if (id) {
        relationships.set(id, {
          target,
          type,
        })
      }
    }

    return relationships
  }

  /**
   * Parse to RelationshipInfo array
   */
  parseToArray(xml: any): RelationshipInfo[] {
    const relationships: RelationshipInfo[] = []

    if (!xml) return relationships

    const rels = xml.Relationships
    if (!rels) return relationships

    const relList = this.xmlParser.ensureArray(rels.Relationship)

    for (const rel of relList) {
      const id = this.xmlParser.getAttr(rel, 'Id')
      const type = this.xmlParser.getAttr(rel, 'Type') || ''
      const target = this.xmlParser.getAttr(rel, 'Target') || ''
      const targetMode = this.xmlParser.getAttr(rel, 'TargetMode') as 'External' | 'Internal' | undefined

      if (id) {
        relationships.push({
          id,
          type,
          target,
          targetMode,
        })
      }
    }

    return relationships
  }

  /**
   * Get relationship by ID
   */
  getById(relationships: Map<string, { target: string; type: string }>, id: string): { target: string; type: string } | undefined {
    return relationships.get(id)
  }

  /**
   * Get relationships by type
   */
  getByType(relationships: Map<string, { target: string; type: string }>, type: string): { id: string; target: string }[] {
    const results: { id: string; target: string }[] = []

    for (const [id, rel] of relationships) {
      if (rel.type === type || rel.type.includes(type)) {
        results.push({ id, target: rel.target })
      }
    }

    return results
  }

  /**
   * Check if relationship is external
   */
  isExternal(rel: RelationshipInfo): boolean {
    return rel.targetMode === 'External'
  }

  /**
   * Get short type name from full URL
   */
  getShortType(fullType: string): string {
    const parts = fullType.split('/')
    return parts[parts.length - 1] || fullType
  }
}
