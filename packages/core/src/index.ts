/**
 * @ldesign/ppt-core
 * 
 * A powerful, framework-agnostic PPT/PPTX rendering library
 */

// Core exports
export { PPTXParser } from './parser/pptx-parser'
export { ResourceLazyLoader } from './parser/pptx-parser'
export { PPTRenderer } from './renderer/ppt-renderer'
export { AnimationEngine } from './animation/animation-engine'
export { TransitionManager } from './animation/transition-manager'
export { TimingController } from './animation/timing-controller'

// Re-export all types
export type {
  // Presentation types
  Presentation,
  PresentationProperties,
  PresentationMetadata,
  PresentationResources,

  // Slide types
  Slide,
  SlideMaster,
  SlideLayout,
  SlideElement,
  SlideBackground,
  SlideTransition,
  SlideNotes,
  SlideTiming,
  LayoutType,

  // Shape types
  Shape,
  Picture,
  Table,
  Chart,
  GroupShape,
  Connector,
  Diagram,
  Media,
  OleObject,

  // Transform and geometry
  Transform,
  Geometry,
  PresetGeometry,

  // Style types
  Fill,
  LineStyle,
  Effects,
  Color,
  GradientStop,

  // Text types
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

  // Table types
  TableRow,
  TableCell,

  // Chart types
  ChartData,
  ChartSeries,

  // Theme types
  Theme,
  ColorScheme,
  FontScheme,
  FormatScheme,
  FontCollection,

  // Animation types
  AnimationEffect,
  AnimationPreset,
  AnimationNode,
  AnimationSequence,
  AnimationBuild,
  AnimationCondition,

  // Placeholder types
  PlaceholderInfo,
  PlaceholderType,

  // Parser types
  ParserOptions,
  ParseResult,
  ParseWarning,
  ParseError,

  // Renderer types
  RenderOptions,
  RendererEvents,
  RendererState,
} from './types'

// Parser sub-exports
export { XMLParser } from './parser/xml-parser'
export { RelationshipParser } from './parser/relationship-parser'
export { SlideParser } from './parser/slide-parser'
export { ShapeParser } from './parser/shape-parser'
export { TextParser } from './parser/text-parser'
export { ThemeParser } from './parser/theme-parser'
export { AnimationParser } from './parser/animation-parser'
export { MediaParser } from './parser/media-parser'

// Renderer sub-exports
export { SlideRenderer } from './renderer/slide-renderer'
export { ShapeRenderer } from './renderer/shape-renderer'
export { TextRenderer } from './renderer/text-renderer'
export { AnimationController } from './renderer/animation-controller'
export { GeometryRenderer } from './renderer/geometry-renderer'

// Version
export const VERSION = '0.1.0'

// Internal imports for helper functions
import { PPTXParser as InternalParser } from './parser/pptx-parser'
import { PPTRenderer as InternalRenderer } from './renderer/ppt-renderer'

/**
 * Create a PPT renderer with default options
 */
export function createRenderer(
  options: Partial<import('./types').RenderOptions> = {},
  events: import('./types').RendererEvents = {}
): InternalRenderer {
  return new InternalRenderer(options, events)
}

/**
 * Parse a PPTX file
 */
export async function parsePPTX(
  source: ArrayBuffer | File | Blob | string,
  options: Partial<import('./types').ParserOptions> = {}
): Promise<import('./types').ParseResult> {
  const parser = new InternalParser(options)

  if (source instanceof ArrayBuffer) {
    return parser.parse(source)
  } else if (source instanceof File || source instanceof Blob) {
    return parser.parseFile(source)
  } else if (typeof source === 'string') {
    return parser.parseUrl(source)
  }

  throw new Error('Invalid source type')
}
