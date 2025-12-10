/**
 * PPTX Parser - Main parser for Office Open XML Presentation files
 */

import JSZip from 'jszip'
import type {
  Presentation,
  PresentationProperties,
  PresentationMetadata,
  PresentationResources,
  Slide,
  SlideMaster,
  SlideLayout,
  Theme,
  ParserOptions,
  ParseResult,
  ParseWarning,
  ParseError,
} from '../types'
import { XMLParser } from './xml-parser'
import { RelationshipParser } from './relationship-parser'
import { SlideParser } from './slide-parser'
import { ThemeParser } from './theme-parser'
import { MediaParser } from './media-parser'

/** Default parser options */
const DEFAULT_OPTIONS: ParserOptions = {
  parseAnimations: true,
  parseNotes: true,
  parseComments: false,
  parseCustomXml: false,
  extractEmbedded: true,
  imageLoading: 'eager',
  fontHandling: 'fallback',
}

/** Content type constants */
const CONTENT_TYPES = {
  PRESENTATION: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
  SLIDE: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  SLIDE_LAYOUT: 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
  SLIDE_MASTER: 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
  THEME: 'application/vnd.openxmlformats-officedocument.theme+xml',
  NOTES_SLIDE: 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml',
  NOTES_MASTER: 'application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml',
  HANDOUT_MASTER: 'application/vnd.openxmlformats-officedocument.presentationml.handoutMaster+xml',
  COMMENTS: 'application/vnd.openxmlformats-officedocument.presentationml.comments+xml',
  CORE_PROPS: 'application/vnd.openxmlformats-package.core-properties+xml',
  EXTENDED_PROPS: 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
}

/**
 * Main PPTX parser class
 */
export class PPTXParser {
  private options: ParserOptions
  private zip: JSZip | null = null
  private xmlParser: XMLParser
  private relationshipParser: RelationshipParser
  private slideParser: SlideParser
  private themeParser: ThemeParser
  private mediaParser: MediaParser

  private warnings: ParseWarning[] = []
  private errors: ParseError[] = []

  // Caches
  private contentTypes: Map<string, string> = new Map()
  private relationships: Map<string, Map<string, { target: string; type: string }>> = new Map()
  private themes: Map<string, Theme> = new Map()
  private masters: Map<string, SlideMaster> = new Map()
  private layouts: Map<string, SlideLayout> = new Map()

  constructor(options: Partial<ParserOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.xmlParser = new XMLParser()
    this.relationshipParser = new RelationshipParser(this.xmlParser)
    this.slideParser = new SlideParser(this.xmlParser, this.options)
    this.themeParser = new ThemeParser(this.xmlParser)
    this.mediaParser = new MediaParser()
  }

  /**
   * Parse a PPTX file from ArrayBuffer
   */
  async parse(data: ArrayBuffer): Promise<ParseResult> {
    this.reset()
    console.log('[PPTXParser] Starting parse, data size:', (data.byteLength / 1024 / 1024).toFixed(2), 'MB')

    try {
      // Load ZIP archive
      console.log('[PPTXParser] Loading ZIP archive...')
      this.zip = await JSZip.loadAsync(data)
      console.log('[PPTXParser] ZIP loaded, files:', Object.keys(this.zip.files).length)

      // Parse content types
      console.log('[PPTXParser] Parsing content types...')
      await this.parseContentTypes()

      // Parse presentation relationships
      console.log('[PPTXParser] Parsing relationships...')
      await this.parseRelationships('ppt/presentation.xml')

      // Parse themes
      console.log('[PPTXParser] Parsing themes...')
      await this.parseThemes()

      // Parse slide masters
      console.log('[PPTXParser] Parsing slide masters...')
      await this.parseSlideMasters()

      // Parse slide layouts
      console.log('[PPTXParser] Parsing slide layouts...')
      await this.parseSlideLayouts()

      // Parse presentation properties
      console.log('[PPTXParser] Parsing presentation properties...')
      const properties = await this.parsePresentationProperties()

      // Parse metadata
      console.log('[PPTXParser] Parsing metadata...')
      const metadata = await this.parseMetadata()

      // Parse slides
      console.log('[PPTXParser] Parsing slides...')
      const slides = await this.parseSlides()
      console.log('[PPTXParser] Slides parsed:', slides.length)

      // Parse resources (images, media)
      console.log('[PPTXParser] Parsing resources...')
      const resources = await this.parseResources()
      console.log('[PPTXParser] Resources parsed, images:', resources.images.size)

      // Build presentation object
      const presentation: Presentation = {
        properties,
        metadata,
        masters: Array.from(this.masters.values()),
        slides,
        resources,
      }

      console.log('[PPTXParser] Parse complete!')
      return {
        presentation,
        warnings: this.warnings,
        errors: this.errors.filter(e => !e.fatal),
      }
    } catch (error) {
      console.error('[PPTXParser] Parse error:', error)
      const parseError: ParseError = {
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        fatal: true,
      }
      this.errors.push(parseError)

      throw error
    }
  }

  /**
   * Parse a PPTX file from File/Blob
   */
  async parseFile(file: File | Blob): Promise<ParseResult> {
    const buffer = await file.arrayBuffer()
    return this.parse(buffer)
  }

  /**
   * Parse a PPTX file from URL
   */
  async parseUrl(url: string): Promise<ParseResult> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch PPTX file: ${response.status} ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    return this.parse(buffer)
  }

  /**
   * Reset parser state
   */
  private reset(): void {
    this.zip = null
    this.warnings = []
    this.errors = []
    this.contentTypes.clear()
    this.relationships.clear()
    this.themes.clear()
    this.masters.clear()
    this.layouts.clear()
  }

  /**
   * Read and parse an XML file from the ZIP
   */
  private async readXml(path: string): Promise<any> {
    if (!this.zip) throw new Error('ZIP not loaded')

    const file = this.zip.file(path)
    if (!file) {
      this.addWarning('FILE_NOT_FOUND', `File not found: ${path}`, path)
      return null
    }

    const content = await file.async('string')
    return this.xmlParser.parse(content)
  }

  /**
   * Read a binary file from the ZIP
   */
  private async readBinary(path: string): Promise<ArrayBuffer | null> {
    if (!this.zip) throw new Error('ZIP not loaded')

    const file = this.zip.file(path)
    if (!file) {
      return null
    }

    return file.async('arraybuffer')
  }

  /**
   * Parse [Content_Types].xml
   */
  private async parseContentTypes(): Promise<void> {
    const xml = await this.readXml('[Content_Types].xml')
    if (!xml) {
      throw new Error('Missing [Content_Types].xml')
    }

    const types = xml.Types

    // Parse default types
    const defaults = this.xmlParser.ensureArray(types.Default)
    for (const def of defaults) {
      const ext = def['@_Extension']
      const contentType = def['@_ContentType']
      if (ext && contentType) {
        this.contentTypes.set(`.${ext}`, contentType)
      }
    }

    // Parse override types
    const overrides = this.xmlParser.ensureArray(types.Override)
    for (const override of overrides) {
      const partName = override['@_PartName']
      const contentType = override['@_ContentType']
      if (partName && contentType) {
        this.contentTypes.set(partName, contentType)
      }
    }
  }

  /**
   * Parse relationships file
   */
  private async parseRelationships(forPath: string): Promise<Map<string, { target: string; type: string }>> {
    const relsPath = this.getRelationshipsPath(forPath)

    // Check cache
    if (this.relationships.has(forPath)) {
      return this.relationships.get(forPath)!
    }

    const xml = await this.readXml(relsPath)
    const rels = this.relationshipParser.parse(xml, forPath)

    this.relationships.set(forPath, rels)
    return rels
  }

  /**
   * Get relationships file path for a given file
   */
  private getRelationshipsPath(filePath: string): string {
    const parts = filePath.split('/')
    const fileName = parts.pop()!
    return [...parts, '_rels', `${fileName}.rels`].join('/')
  }

  /**
   * Parse themes
   */
  private async parseThemes(): Promise<void> {
    if (!this.zip) return

    // Find all theme files
    const themeFiles = Object.keys(this.zip.files).filter(
      path => path.startsWith('ppt/theme/') && path.endsWith('.xml')
    )

    for (const themePath of themeFiles) {
      const xml = await this.readXml(themePath)
      if (xml) {
        const theme = this.themeParser.parse(xml)
        this.themes.set(themePath, theme)
      }
    }
  }

  /**
   * Parse slide masters
   */
  private async parseSlideMasters(): Promise<void> {
    if (!this.zip) return

    // Find all slide master files
    const masterFiles = Object.keys(this.zip.files).filter(
      path => path.startsWith('ppt/slideMasters/') && path.endsWith('.xml') && !path.includes('_rels')
    )

    for (const masterPath of masterFiles) {
      const xml = await this.readXml(masterPath)
      if (!xml) continue

      // Get master relationships
      const rels = await this.parseRelationships(masterPath)

      // Find theme for this master
      let theme: Theme | undefined
      for (const [, rel] of rels) {
        if (rel.type.includes('theme')) {
          const themePath = this.resolvePath(masterPath, rel.target)
          theme = this.themes.get(themePath)
          break
        }
      }

      if (!theme) {
        theme = this.themes.values().next().value
      }

      const master = this.slideParser.parseMaster(xml, masterPath, theme!, rels)
      this.masters.set(masterPath, master)
    }
  }

  /**
   * Parse slide layouts
   */
  private async parseSlideLayouts(): Promise<void> {
    if (!this.zip) return

    // Find all slide layout files
    const layoutFiles = Object.keys(this.zip.files).filter(
      path => path.startsWith('ppt/slideLayouts/') && path.endsWith('.xml') && !path.includes('_rels')
    )

    for (const layoutPath of layoutFiles) {
      const xml = await this.readXml(layoutPath)
      if (!xml) continue

      // Get layout relationships
      const rels = await this.parseRelationships(layoutPath)

      // Find master for this layout
      let masterId = ''
      for (const [, rel] of rels) {
        if (rel.type.includes('slideMaster')) {
          masterId = this.resolvePath(layoutPath, rel.target)
          break
        }
      }

      const layout = this.slideParser.parseLayout(xml, layoutPath, masterId, rels)
      this.layouts.set(layoutPath, layout)

      // Add layout to master
      const master = this.masters.get(masterId)
      if (master) {
        master.layouts.push(layout)
      }
    }
  }

  /**
   * Parse presentation properties
   */
  private async parsePresentationProperties(): Promise<PresentationProperties> {
    const xml = await this.readXml('ppt/presentation.xml')
    if (!xml) {
      throw new Error('Missing presentation.xml')
    }

    const pres = xml['p:presentation'] || xml.presentation
    const sldSz = pres['p:sldSz'] || pres.sldSz

    return {
      slideWidth: parseInt(sldSz?.['@_cx'] || '9144000', 10), // Default: 10 inches
      slideHeight: parseInt(sldSz?.['@_cy'] || '6858000', 10), // Default: 7.5 inches
      firstSlideNumber: parseInt(pres['@_firstSlideNum'] || '1', 10),
      rtl: pres['@_rtl'] === 'true' || pres['@_rtl'] === '1',
      removePersonalInfo: pres['@_removePersonalInfoOnSave'] === 'true',
      embedTrueTypeFonts: pres['@_embedTrueTypeFonts'] === 'true',
      saveSubsetFonts: pres['@_saveSubsetFonts'] === 'true',
    }
  }

  /**
   * Parse document metadata
   */
  private async parseMetadata(): Promise<PresentationMetadata> {
    const metadata: PresentationMetadata = {}

    // Parse core properties
    const coreXml = await this.readXml('docProps/core.xml')
    if (coreXml) {
      const props = coreXml['cp:coreProperties'] || coreXml.coreProperties || coreXml

      metadata.title = this.extractText(props['dc:title'] || props.title)
      metadata.subject = this.extractText(props['dc:subject'] || props.subject)
      metadata.creator = this.extractText(props['dc:creator'] || props.creator)
      metadata.keywords = this.extractText(props['cp:keywords'] || props.keywords)
      metadata.description = this.extractText(props['dc:description'] || props.description)
      metadata.lastModifiedBy = this.extractText(props['cp:lastModifiedBy'] || props.lastModifiedBy)
      metadata.revision = parseInt(this.extractText(props['cp:revision'] || props.revision) || '0', 10)
      metadata.category = this.extractText(props['cp:category'] || props.category)
      metadata.contentStatus = this.extractText(props['cp:contentStatus'] || props.contentStatus)

      const created = this.extractText(props['dcterms:created'] || props.created)
      const modified = this.extractText(props['dcterms:modified'] || props.modified)

      if (created) metadata.created = new Date(created)
      if (modified) metadata.modified = new Date(modified)
    }

    // Parse extended properties
    const extXml = await this.readXml('docProps/app.xml')
    if (extXml) {
      const props = extXml.Properties || extXml
      metadata.version = this.extractText(props.AppVersion)
    }

    return metadata
  }

  /**
   * Parse all slides
   */
  private async parseSlides(): Promise<Slide[]> {
    const slides: Slide[] = []

    // Get slide order from presentation.xml
    const presXml = await this.readXml('ppt/presentation.xml')
    if (!presXml) return slides

    const pres = presXml['p:presentation'] || presXml.presentation
    const sldIdLst = pres['p:sldIdLst'] || pres.sldIdLst

    if (!sldIdLst) return slides

    const sldIds = this.xmlParser.ensureArray(sldIdLst['p:sldId'] || sldIdLst.sldId)
    const presRels = await this.parseRelationships('ppt/presentation.xml')

    for (let i = 0; i < sldIds.length; i++) {
      const sldId = sldIds[i]
      const slideId = parseInt(sldId['@_id'], 10)
      const rId = sldId['@_r:id'] || sldId['@_rid']

      // Get slide path from relationship
      const rel = presRels.get(rId)
      if (!rel) continue

      const slidePath = `ppt/${rel.target.replace('../', '')}`
      const slideXml = await this.readXml(slidePath)
      if (!slideXml) continue

      // Get slide relationships
      const slideRels = await this.parseRelationships(slidePath)

      // Find layout for this slide
      let layoutId = ''
      for (const [, slideRel] of slideRels) {
        if (slideRel.type.includes('slideLayout')) {
          layoutId = this.resolvePath(slidePath, slideRel.target)
          break
        }
      }

      const layout = this.layouts.get(layoutId)
      const masterId = layout?.masterId || ''

      // Parse notes if enabled
      let notesXml = null
      if (this.options.parseNotes) {
        for (const [, slideRel] of slideRels) {
          if (slideRel.type.includes('notesSlide')) {
            const notesPath = this.resolvePath(slidePath, slideRel.target)
            notesXml = await this.readXml(notesPath)
            break
          }
        }
      }

      const slide = this.slideParser.parseSlide(
        slideXml,
        slideId,
        i,
        layoutId,
        masterId,
        slideRels,
        notesXml
      )

      slides.push(slide)
    }

    return slides
  }

  /**
   * Parse resources (images, media)
   */
  private async parseResources(): Promise<PresentationResources> {
    const resources: PresentationResources = {
      images: new Map(),
      media: new Map(),
      embeddings: new Map(),
      themes: this.themes,
      fonts: new Map(),
    }

    if (!this.zip || this.options.imageLoading === 'none') {
      return resources
    }

    // Extract images
    const imageFiles = Object.keys(this.zip.files).filter(
      path => path.startsWith('ppt/media/') && /\.(png|jpg|jpeg|gif|bmp|webp|svg|emf|wmf|tiff?)$/i.test(path)
    )

    for (const imagePath of imageFiles) {
      if (this.options.imageLoading === 'eager') {
        const data = await this.readBinary(imagePath)
        if (data) {
          resources.images.set(imagePath, data)
        }
      }
    }

    // Extract media files
    if (this.options.extractEmbedded) {
      const mediaFiles = Object.keys(this.zip.files).filter(
        path => path.startsWith('ppt/media/') && /\.(mp4|m4v|mov|avi|wmv|mp3|m4a|wav|wma)$/i.test(path)
      )

      for (const mediaPath of mediaFiles) {
        const data = await this.readBinary(mediaPath)
        if (data) {
          resources.media.set(mediaPath, data)
        }
      }

      // Extract embeddings
      const embeddingFiles = Object.keys(this.zip.files).filter(
        path => path.startsWith('ppt/embeddings/')
      )

      for (const embPath of embeddingFiles) {
        const data = await this.readBinary(embPath)
        if (data) {
          resources.embeddings.set(embPath, data)
        }
      }
    }

    // Extract embedded fonts
    const fontFiles = Object.keys(this.zip.files).filter(
      path => path.startsWith('ppt/fonts/') && /\.(fntdata|odttf|ttf|otf)$/i.test(path)
    )

    for (const fontPath of fontFiles) {
      const data = await this.readBinary(fontPath)
      if (data) {
        resources.fonts.set(fontPath, data)
      }
    }

    return resources
  }

  /**
   * Resolve relative path
   */
  private resolvePath(basePath: string, relativePath: string): string {
    if (!relativePath.startsWith('..')) {
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/'))
      return `${baseDir}/${relativePath}`
    }

    const baseParts = basePath.split('/')
    baseParts.pop() // Remove filename

    const relParts = relativePath.split('/')

    for (const part of relParts) {
      if (part === '..') {
        baseParts.pop()
      } else if (part !== '.') {
        baseParts.push(part)
      }
    }

    return baseParts.join('/')
  }

  /**
   * Extract text content from XML element
   */
  private extractText(element: any): string | undefined {
    if (!element) return undefined
    if (typeof element === 'string') return element
    if (element['#text']) return element['#text']
    return undefined
  }

  /**
   * Add warning
   */
  private addWarning(code: string, message: string, location?: string, element?: string): void {
    this.warnings.push({ code, message, location, element })
  }

  /**
   * Add error
   */
  private addError(code: string, message: string, fatal: boolean = false, location?: string, element?: string): void {
    this.errors.push({ code, message, fatal, location, element })
  }

  /**
   * Get lazy loader for resources
   */
  getLazyLoader(): ResourceLazyLoader {
    return new ResourceLazyLoader(this.zip!)
  }
}

/**
 * Lazy loader for resources
 */
export class ResourceLazyLoader {
  private zip: JSZip

  constructor(zip: JSZip) {
    this.zip = zip
  }

  /**
   * Load an image by path
   */
  async loadImage(path: string): Promise<ArrayBuffer | null> {
    const file = this.zip.file(path)
    if (!file) return null
    return file.async('arraybuffer')
  }

  /**
   * Load media by path
   */
  async loadMedia(path: string): Promise<ArrayBuffer | null> {
    const file = this.zip.file(path)
    if (!file) return null
    return file.async('arraybuffer')
  }

  /**
   * Create blob URL for resource
   */
  async createBlobUrl(path: string, mimeType?: string): Promise<string | null> {
    const data = await this.loadImage(path)
    if (!data) return null

    const detectedMime = mimeType || this.getMimeType(path)
    const blob = new Blob([data], { type: detectedMime })
    return URL.createObjectURL(blob)
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      emf: 'image/emf',
      wmf: 'image/wmf',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      mp4: 'video/mp4',
      m4v: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      wmv: 'video/x-ms-wmv',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      wma: 'audio/x-ms-wma',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}
