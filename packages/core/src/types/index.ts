/**
 * @ldesign/ppt-core - Type Definitions
 * 
 * Core type definitions for PPT/PPTX parsing and rendering
 */

// ==================== Basic Types ====================

/** Point coordinates in EMUs (English Metric Units) */
export interface Point {
  x: number
  y: number
}

/** Size dimensions in EMUs */
export interface Size {
  width: number
  height: number
}

/** Rectangle bounds */
export interface Rect extends Point, Size { }

/** Color representation */
export interface Color {
  type: 'rgb' | 'scheme' | 'hsl' | 'preset'
  value: string
  alpha?: number
  // Color modifiers
  lumMod?: number
  lumOff?: number
  satMod?: number
  shade?: number
  tint?: number
}

/** Gradient stop */
export interface GradientStop {
  position: number // 0-100000 (percentage * 1000)
  color: Color
}

/** Gradient fill */
export interface GradientFill {
  type: 'linear' | 'radial' | 'rectangular' | 'path'
  angle?: number // in degrees (0-360)
  stops: GradientStop[]
  rotateWithShape?: boolean
}

/** Pattern fill */
export interface PatternFill {
  preset: string
  foregroundColor: Color
  backgroundColor: Color
}

/** Picture fill */
export interface PictureFill {
  embed?: string // relationship ID
  stretch?: boolean
  tile?: {
    tx: number
    ty: number
    sx: number
    sy: number
    flip?: 'none' | 'x' | 'y' | 'xy'
    alignment?: string
  }
}

/** Fill type */
export interface Fill {
  type: 'none' | 'solid' | 'gradient' | 'pattern' | 'picture'
  solid?: Color
  gradient?: GradientFill
  pattern?: PatternFill
  picture?: PictureFill
}

/** Line/stroke style */
export interface LineStyle {
  width?: number // in EMUs
  fill?: Fill
  dashType?: 'solid' | 'dot' | 'dash' | 'dashDot' | 'longDash' | 'longDashDot' | 'longDashDotDot'
  capType?: 'flat' | 'round' | 'square'
  joinType?: 'bevel' | 'miter' | 'round'
  headEnd?: ArrowStyle
  tailEnd?: ArrowStyle
}

/** Arrow style */
export interface ArrowStyle {
  type: 'none' | 'triangle' | 'stealth' | 'diamond' | 'oval' | 'arrow'
  width: 'sm' | 'med' | 'lg'
  length: 'sm' | 'med' | 'lg'
}

/** Shadow effect */
export interface ShadowEffect {
  type: 'outer' | 'inner'
  color: Color
  blurRadius: number
  distance: number
  direction: number // angle in degrees
  alignment?: string
  rotateWithShape?: boolean
}

/** Glow effect */
export interface GlowEffect {
  color: Color
  radius: number
}

/** Reflection effect */
export interface ReflectionEffect {
  blurRadius: number
  startOpacity: number
  endOpacity: number
  distance: number
  direction: number
  fadeDirection: number
  startPosition: number
  endPosition: number
}

/** 3D effect */
export interface Effect3D {
  bevel?: {
    type: string
    width: number
    height: number
  }
  extrusion?: {
    color?: Color
    height: number
  }
  contour?: {
    color?: Color
    width: number
  }
  material?: string
  lightRig?: {
    type: string
    direction: string
  }
  camera?: {
    type: string
    fov?: number
  }
}

/** Combined effects */
export interface Effects {
  shadow?: ShadowEffect
  glow?: GlowEffect
  reflection?: ReflectionEffect
  softEdge?: number
  effect3d?: Effect3D
}

// ==================== Text Types ====================

/** Font properties */
export interface FontProperties {
  typeface?: string
  panose?: string
  pitchFamily?: number
  charset?: number
  // East Asian fonts
  eastAsia?: string
  // Complex script fonts
  cs?: string
}

/** Text run properties */
export interface TextRunProperties {
  fontSize?: number // in hundredths of a point (e.g., 1800 = 18pt)
  bold?: boolean
  italic?: boolean
  underline?: 'none' | 'single' | 'double' | 'heavy' | 'dotted' | 'dottedHeavy' | 'dash' | 'dashHeavy' | 'dashLong' | 'dashLongHeavy' | 'dotDash' | 'dotDashHeavy' | 'dotDotDash' | 'dotDotDashHeavy' | 'wavy' | 'wavyHeavy' | 'wavyDouble'
  strike?: 'noStrike' | 'sngStrike' | 'dblStrike'
  baseline?: number // percentage, 0 = normal, 30000 = superscript, -25000 = subscript
  spacing?: number // character spacing in hundredths of a point
  fill?: Fill
  line?: LineStyle
  effects?: Effects
  font?: FontProperties
  highlight?: Color
  lang?: string
  altLang?: string
  hyperlink?: HyperlinkInfo
}

/** Hyperlink info */
export interface HyperlinkInfo {
  url?: string
  action?: string
  slideIndex?: number
  tooltip?: string
}

/** Text run (inline text with formatting) */
export interface TextRun {
  type: 'text' | 'break' | 'field'
  text?: string
  properties?: TextRunProperties
  fieldType?: string // for field type: slidenum, datetime, etc.
}

/** Paragraph properties */
export interface ParagraphProperties {
  alignment?: 'left' | 'center' | 'right' | 'justify' | 'justifyLow' | 'distributed'
  level?: number // indent level (0-8)
  indent?: number // first line indent in EMUs
  marginLeft?: number
  marginRight?: number
  spaceBefore?: number | { percentage: number }
  spaceAfter?: number | { percentage: number }
  lineSpacing?: number | { percentage: number }
  bullet?: BulletProperties
  tabStops?: TabStop[]
  defaultRunProperties?: TextRunProperties
}

/** Bullet properties */
export interface BulletProperties {
  type: 'none' | 'auto' | 'char' | 'picture'
  char?: string
  font?: FontProperties
  color?: Color
  size?: number | { percentage: number }
  startAt?: number
  pictureId?: string
}

/** Tab stop */
export interface TabStop {
  position: number
  alignment: 'left' | 'center' | 'right' | 'decimal'
}

/** Paragraph with text runs */
export interface Paragraph {
  properties?: ParagraphProperties
  runs: TextRun[]
  endProperties?: TextRunProperties
}

/** Text body */
export interface TextBody {
  paragraphs: Paragraph[]
  bodyProperties?: TextBodyProperties
  listStyles?: ListStyle[]
}

/** Text body properties */
export interface TextBodyProperties {
  anchor?: 'top' | 'middle' | 'bottom' | 'topCentered' | 'middleCentered' | 'bottomCentered'
  anchorCenter?: boolean
  wrap?: 'none' | 'square'
  leftInset?: number
  rightInset?: number
  topInset?: number
  bottomInset?: number
  columns?: number
  columnSpacing?: number
  rotation?: number
  vertical?: 'horz' | 'vert' | 'vert270' | 'wordArtVert' | 'eaVert' | 'mongolianVert' | 'wordArtVertRtl'
  autoFit?: 'none' | 'normal' | 'shape'
}

/** List style definition */
export interface ListStyle {
  level: number
  bullet?: BulletProperties
  paragraph?: ParagraphProperties
}

// ==================== Shape Types ====================

/** Shape preset type */
export type PresetGeometry =
  | 'rect' | 'ellipse' | 'triangle' | 'rtTriangle' | 'parallelogram'
  | 'trapezoid' | 'diamond' | 'pentagon' | 'hexagon' | 'heptagon'
  | 'octagon' | 'decagon' | 'dodecagon' | 'star4' | 'star5' | 'star6'
  | 'star7' | 'star8' | 'star10' | 'star12' | 'star16' | 'star24' | 'star32'
  | 'roundRect' | 'round1Rect' | 'round2SameRect' | 'round2DiagRect'
  | 'snip1Rect' | 'snip2SameRect' | 'snip2DiagRect' | 'snipRoundRect'
  | 'plaque' | 'teardrop' | 'homePlate' | 'chevron' | 'pieWedge' | 'pie'
  | 'blockArc' | 'donut' | 'noSmoking' | 'rightArrow' | 'leftArrow' | 'upArrow'
  | 'downArrow' | 'stripedRightArrow' | 'notchedRightArrow' | 'bentUpArrow'
  | 'leftRightArrow' | 'upDownArrow' | 'leftUpArrow' | 'leftRightUpArrow'
  | 'quadArrow' | 'leftArrowCallout' | 'rightArrowCallout' | 'upArrowCallout'
  | 'downArrowCallout' | 'leftRightArrowCallout' | 'upDownArrowCallout'
  | 'quadArrowCallout' | 'bentArrow' | 'uturnArrow' | 'circularArrow'
  | 'leftCircularArrow' | 'leftRightCircularArrow' | 'curvedRightArrow'
  | 'curvedLeftArrow' | 'curvedUpArrow' | 'curvedDownArrow' | 'swooshArrow'
  | 'cube' | 'can' | 'lightningBolt' | 'heart' | 'sun' | 'moon' | 'smileyFace'
  | 'irregularSeal1' | 'irregularSeal2' | 'foldedCorner' | 'bevel' | 'frame'
  | 'halfFrame' | 'corner' | 'diagStripe' | 'chord' | 'arc' | 'leftBracket'
  | 'rightBracket' | 'leftBrace' | 'rightBrace' | 'bracketPair' | 'bracePair'
  | 'straightConnector1' | 'bentConnector2' | 'bentConnector3' | 'bentConnector4'
  | 'bentConnector5' | 'curvedConnector2' | 'curvedConnector3' | 'curvedConnector4'
  | 'curvedConnector5' | 'callout1' | 'callout2' | 'callout3' | 'accentCallout1'
  | 'accentCallout2' | 'accentCallout3' | 'borderCallout1' | 'borderCallout2'
  | 'borderCallout3' | 'accentBorderCallout1' | 'accentBorderCallout2'
  | 'accentBorderCallout3' | 'wedgeRectCallout' | 'wedgeRoundRectCallout'
  | 'wedgeEllipseCallout' | 'cloudCallout' | 'cloud' | 'ribbon' | 'ribbon2'
  | 'ellipseRibbon' | 'ellipseRibbon2' | 'leftRightRibbon' | 'verticalScroll'
  | 'horizontalScroll' | 'wave' | 'doubleWave' | 'plus' | 'flowChartProcess'
  | 'flowChartDecision' | 'flowChartInputOutput' | 'flowChartPredefinedProcess'
  | 'flowChartInternalStorage' | 'flowChartDocument' | 'flowChartMultidocument'
  | 'flowChartTerminator' | 'flowChartPreparation' | 'flowChartManualInput'
  | 'flowChartManualOperation' | 'flowChartConnector' | 'flowChartPunchedCard'
  | 'flowChartPunchedTape' | 'flowChartSummingJunction' | 'flowChartOr'
  | 'flowChartCollate' | 'flowChartSort' | 'flowChartExtract' | 'flowChartMerge'
  | 'flowChartOfflineStorage' | 'flowChartOnlineStorage' | 'flowChartMagneticTape'
  | 'flowChartMagneticDisk' | 'flowChartMagneticDrum' | 'flowChartDisplay'
  | 'flowChartDelay' | 'flowChartAlternateProcess' | 'flowChartOffpageConnector'
  | 'actionButtonBlank' | 'actionButtonHome' | 'actionButtonHelp' | 'actionButtonInformation'
  | 'actionButtonForwardNext' | 'actionButtonBackPrevious' | 'actionButtonEnd'
  | 'actionButtonBeginning' | 'actionButtonReturn' | 'actionButtonDocument'
  | 'actionButtonSound' | 'actionButtonMovie' | 'gear6' | 'gear9' | 'funnel'
  | 'mathPlus' | 'mathMinus' | 'mathMultiply' | 'mathDivide' | 'mathEqual'
  | 'mathNotEqual' | 'cornerTabs' | 'squareTabs' | 'plaqueTabs' | 'chartX'
  | 'chartStar' | 'chartPlus' | 'line' | string

/** Custom geometry path commands */
export interface PathCommand {
  type: 'moveTo' | 'lineTo' | 'arcTo' | 'quadBezTo' | 'cubicBezTo' | 'close'
  points?: Point[]
  wR?: number
  hR?: number
  startAngle?: number
  swingAngle?: number
}

/** Custom geometry */
export interface CustomGeometry {
  paths: {
    fill?: 'none' | 'norm' | 'lighten' | 'lightenLess' | 'darken' | 'darkenLess'
    stroke?: boolean
    commands: PathCommand[]
  }[]
  guides?: GeometryGuide[]
  adjustHandles?: AdjustHandle[]
  connectionSites?: Point[]
  textRect?: Rect
}

/** Geometry guide for calculations */
export interface GeometryGuide {
  name: string
  formula: string
}

/** Adjustment handle */
export interface AdjustHandle {
  position: Point
  rangeX?: { min: string; max: string }
  rangeY?: { min: string; max: string }
}

/** Geometry definition */
export interface Geometry {
  type: 'preset' | 'custom'
  preset?: PresetGeometry
  custom?: CustomGeometry
  adjustValues?: Record<string, number>
}

/** Transform properties */
export interface Transform {
  offset: Point
  extents: Size
  rotation?: number // in degrees (60000ths of a degree in OOXML)
  flipH?: boolean
  flipV?: boolean
}

// ==================== Shape Element Types ====================

/** Base shape properties */
export interface BaseShapeProperties {
  id: number
  name: string
  description?: string
  hidden?: boolean
  transform: Transform
  geometry?: Geometry
  fill?: Fill
  line?: LineStyle
  effects?: Effects
}

/** Standard shape */
export interface Shape extends BaseShapeProperties {
  type: 'shape'
  textBody?: TextBody
  placeholder?: PlaceholderInfo
}

/** Placeholder info */
export interface PlaceholderInfo {
  type: PlaceholderType
  index?: number
  hasCustomPrompt?: boolean
}

/** Placeholder types */
export type PlaceholderType =
  | 'title' | 'body' | 'centered' | 'subtitle' | 'date' | 'footer' | 'slideNumber'
  | 'content' | 'chart' | 'table' | 'clipArt' | 'diagram' | 'media' | 'slideImage'
  | 'picture' | 'object'

/** Picture/Image shape */
export interface Picture extends BaseShapeProperties {
  type: 'picture'
  blipFill: {
    embed: string // relationship ID
    stretch?: boolean
    srcRect?: { left: number; top: number; right: number; bottom: number }
    tile?: PictureFill['tile']
  }
  placeholder?: PlaceholderInfo
}

/** Table cell */
export interface TableCell {
  text?: TextBody
  rowSpan?: number
  colSpan?: number
  hMerge?: boolean
  vMerge?: boolean
  fill?: Fill
  borders?: {
    left?: LineStyle
    right?: LineStyle
    top?: LineStyle
    bottom?: LineStyle
    insideH?: LineStyle
    insideV?: LineStyle
    tl2br?: LineStyle
    tr2bl?: LineStyle
  }
  margin?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  anchor?: 'top' | 'middle' | 'bottom'
}

/** Table row */
export interface TableRow {
  height: number
  cells: TableCell[]
}

/** Table shape */
export interface Table extends BaseShapeProperties {
  type: 'table'
  rows: TableRow[]
  columns: { width: number }[]
  tableStyle?: string
  firstRow?: boolean
  lastRow?: boolean
  firstCol?: boolean
  lastCol?: boolean
  bandRow?: boolean
  bandCol?: boolean
}

/** Chart data series */
export interface ChartSeries {
  name?: string
  categories?: (string | number)[]
  values: number[]
  fill?: Fill
  line?: LineStyle
  marker?: {
    symbol?: string
    size?: number
    fill?: Fill
    line?: LineStyle
  }
  labels?: {
    showValue?: boolean
    showCategory?: boolean
    showSeriesName?: boolean
    showPercent?: boolean
    position?: string
  }
  trendline?: {
    type: string
    order?: number
    period?: number
    forward?: number
    backward?: number
    intercept?: number
    displayEquation?: boolean
    displayRSqr?: boolean
  }
}

/** Chart axis */
export interface ChartAxis {
  type: 'category' | 'value' | 'date' | 'series'
  position?: 'bottom' | 'left' | 'top' | 'right'
  title?: TextBody
  majorTickMark?: 'none' | 'inside' | 'outside' | 'cross'
  minorTickMark?: 'none' | 'inside' | 'outside' | 'cross'
  tickLabelPosition?: 'none' | 'high' | 'low' | 'nextTo'
  majorGridlines?: LineStyle
  minorGridlines?: LineStyle
  numberFormat?: string
  min?: number
  max?: number
  majorUnit?: number
  minorUnit?: number
  logBase?: number
  orientation?: 'minMax' | 'maxMin'
  crossesAt?: number | 'min' | 'max' | 'auto'
  labelRotation?: number
  line?: LineStyle
  fill?: Fill
}

/** Chart legend */
export interface ChartLegend {
  position: 'top' | 'bottom' | 'left' | 'right' | 'topRight'
  overlay?: boolean
  textProperties?: TextRunProperties
  fill?: Fill
  line?: LineStyle
}

/** Chart title */
export interface ChartTitle {
  text?: TextBody
  overlay?: boolean
  position?: string
}

/** Chart plot area */
export interface ChartPlotArea {
  fill?: Fill
  line?: LineStyle
}

/** Chart data */
export interface ChartData {
  type: 'bar' | 'column' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar' | 'surface' | 'stock' | 'combo'
  series: ChartSeries[]
  categories?: (string | number)[]
  categoryAxis?: ChartAxis
  valueAxis?: ChartAxis
  secondaryValueAxis?: ChartAxis
  seriesAxis?: ChartAxis
  legend?: ChartLegend
  title?: ChartTitle
  plotArea?: ChartPlotArea
  // Type-specific options
  barDirection?: 'bar' | 'col'
  grouping?: 'clustered' | 'stacked' | 'percentStacked' | 'standard'
  varyColors?: boolean
  gapWidth?: number
  overlap?: number
  firstSliceAngle?: number
  holeSize?: number
  wireframe?: boolean
  smooth?: boolean
  scatterStyle?: 'line' | 'lineMarker' | 'marker' | 'smooth' | 'smoothMarker'
  bubbleScale?: number
  bubble3D?: boolean
}

/** Chart shape */
export interface Chart extends BaseShapeProperties {
  type: 'chart'
  chartData: ChartData
  externalData?: string // external file path
}

/** SmartArt diagram node */
export interface DiagramNode {
  id: string
  text?: TextBody
  children?: DiagramNode[]
  fill?: Fill
  line?: LineStyle
}

/** SmartArt diagram */
export interface Diagram extends BaseShapeProperties {
  type: 'diagram'
  layoutType: string
  nodes: DiagramNode[]
  colorStyle?: string
  quickStyle?: string
}

/** OLE object */
export interface OleObject extends BaseShapeProperties {
  type: 'ole'
  progId: string
  embed?: string
  link?: string
  showAsIcon?: boolean
  iconEmbed?: string
}

/** Video/Audio media */
export interface Media extends BaseShapeProperties {
  type: 'media'
  mediaType: 'video' | 'audio'
  embed?: string
  link?: string
  poster?: string // preview image
  loop?: boolean
  autoPlay?: boolean
  muted?: boolean
  startTime?: number
  endTime?: number
  volume?: number
}

/** Connector shape */
export interface Connector extends BaseShapeProperties {
  type: 'connector'
  startConnection?: { shapeId: number; site: number }
  endConnection?: { shapeId: number; site: number }
}

/** Group shape */
export interface GroupShape extends BaseShapeProperties {
  type: 'group'
  children: SlideElement[]
  childTransform: Transform
}

/** All slide element types */
export type SlideElement = Shape | Picture | Table | Chart | Diagram | OleObject | Media | Connector | GroupShape

// ==================== Slide Types ====================

/** Slide background */
export interface SlideBackground {
  fill?: Fill
  shadeToTitle?: boolean
}

/** Slide transition */
export interface SlideTransition {
  type: SlideTransitionType
  duration?: number // in milliseconds
  direction?: 'left' | 'right' | 'up' | 'down' | 'leftUp' | 'leftDown' | 'rightUp' | 'rightDown'
  advanceOnClick?: boolean
  advanceAfterTime?: number // auto-advance time in ms
  sound?: {
    embed: string
    name?: string
    loop?: boolean
  }
}

/** Slide transition types */
export type SlideTransitionType =
  | 'none' | 'fade' | 'push' | 'wipe' | 'split' | 'reveal' | 'randomBars'
  | 'strips' | 'zoom' | 'fly' | 'cut' | 'cover' | 'pull' | 'random'
  | 'blinds' | 'checker' | 'circle' | 'comb' | 'conveyor' | 'cube'
  | 'diamond' | 'dissolve' | 'doors' | 'drape' | 'fall' | 'ferris'
  | 'flash' | 'flip' | 'flythrough' | 'gallery' | 'glitter' | 'honeycomb'
  | 'morph' | 'newsflash' | 'orbit' | 'origami' | 'pageFlip' | 'pan'
  | 'plus' | 'prism' | 'prestige' | 'ripple' | 'rotate' | 'shred'
  | 'switch' | 'uncover' | 'vortex' | 'wedge' | 'wind' | 'window'
  | 'warp' | 'wheelReverse' | string

/** Slide notes */
export interface SlideNotes {
  elements: SlideElement[]
  textBody?: TextBody
}

/** Slide definition */
export interface Slide {
  id: number
  index: number
  name?: string
  hidden?: boolean
  layoutId?: string
  masterId?: string
  background?: SlideBackground
  elements: SlideElement[]
  transition?: SlideTransition
  timing?: SlideTiming
  notes?: SlideNotes
}

// ==================== Animation Types ====================

/** Animation timing */
export interface SlideTiming {
  buildList?: AnimationBuild[]
  sequenceList?: AnimationSequence[]
}

/** Animation build (main sequence, trigger, etc) */
export interface AnimationBuild {
  spId?: number // target shape ID
  grpId?: number // group ID for build by paragraph
  animBg?: boolean // animate background
  autoRev?: boolean // auto reverse
  nodeType?: 'clickEffect' | 'withEffect' | 'afterEffect' | 'mainSeq' | 'interactiveSeq' | 'afterGroup'
}

/** Animation sequence */
export interface AnimationSequence {
  concurrent?: boolean
  prevCondition?: AnimationCondition
  nextCondition?: AnimationCondition
  children: AnimationNode[]
}

/** Animation condition */
export interface AnimationCondition {
  event: AnimationEvent
  delay?: number
  targetId?: number
}

/** Animation events */
export type AnimationEvent =
  | 'onClick' | 'onBegin' | 'onEnd' | 'begin' | 'end'
  | 'onPrev' | 'onNext' | 'onStopAudio' | 'onMouseOver' | 'onMouseOut'

/** Animation node types */
export interface AnimationNode {
  type: 'parallel' | 'sequence' | 'effect' | 'set' | 'animate' | 'animateColor' | 'animateMotion' | 'animateRotation' | 'animateScale' | 'command' | 'audio' | 'video'
  children?: AnimationNode[]
  // Common properties
  begin?: string | number
  duration?: number | 'indefinite'
  fill?: 'freeze' | 'hold' | 'remove' | 'transition'
  repeatCount?: number | 'indefinite'
  repeatDuration?: number
  restart?: 'always' | 'whenNotActive' | 'never'
  acceleration?: number // 0-100%
  deceleration?: number // 0-100%
  autoReverse?: boolean
  // Target
  targetId?: number
  targetElement?: string
  subTarget?: string // paragraph index, etc
  // Effect specific
  effect?: AnimationEffect
  // Animate specific
  attributeName?: string
  from?: string | number
  to?: string | number
  by?: string | number
  values?: (string | number)[]
  keyTimes?: number[]
  calcMode?: 'discrete' | 'linear' | 'spline' | 'paced'
  keySplines?: string[]
  // Motion path
  path?: string
  pathEditMode?: 'relative' | 'fixed'
  // Color animation
  colorSpace?: 'rgb' | 'hsl'
  direction?: 'cw' | 'ccw'
  // Scale animation
  zoomContents?: boolean
  // Command
  commandType?: string
  commandValue?: string
  // Media
  mediaEmbed?: string
}

/** Animation effect preset */
export interface AnimationEffect {
  preset: AnimationPreset
  presetClass: 'entrance' | 'exit' | 'emphasis' | 'path' | 'action' | 'mediaPause' | 'mediaPlay' | 'mediaStop'
  presetSubtype?: number
}

/** Animation preset types */
export type AnimationPreset =
  // Entrance
  | 'appear' | 'fly' | 'blinds' | 'box' | 'checkerboard' | 'circle' | 'crawl'
  | 'diamond' | 'dissolve' | 'fade' | 'flash' | 'peek' | 'plus' | 'random'
  | 'randomBars' | 'split' | 'strips' | 'wedge' | 'wheel' | 'wipe' | 'zoom'
  | 'bounce' | 'boomerang' | 'credits' | 'curve' | 'drop' | 'float' | 'pinwheel'
  | 'spiral' | 'stretch' | 'swivel' | 'whip' | 'ascend' | 'centerRevolve'
  | 'compress' | 'descend' | 'easeIn' | 'expand' | 'fadeZoom' | 'flipFlop'
  | 'glide' | 'grow' | 'growTurn' | 'riseUp' | 'spinner' | 'swish' | 'thread'
  | 'unfold' | 'waveEffect' | 'zipEffect'
  // Exit  
  | 'disappear' | 'flyOut' | 'blindsOut' | 'boxOut' | 'checkerboardOut' | 'circleOut'
  | 'crawlOut' | 'diamondOut' | 'dissolveOut' | 'fadeOut' | 'flashOut' | 'peekOut'
  | 'plusOut' | 'randomOut' | 'randomBarsOut' | 'splitOut' | 'stripsOut' | 'wedgeOut'
  | 'wheelOut' | 'wipeOut' | 'zoomOut' | 'bounceOut' | 'boomerangOut' | 'creditsOut'
  | 'curveOut' | 'dropOut' | 'floatOut' | 'pinwheelOut' | 'spiralOut' | 'stretchOut'
  | 'swivelOut' | 'whipOut' | 'shrink' | 'sink' | 'collapseOut' | 'foldOut'
  // Emphasis
  | 'pulse' | 'colorPulse' | 'teeter' | 'spin' | 'growShrink' | 'desaturate'
  | 'darken' | 'lighten' | 'transparency' | 'objectColor' | 'complementaryColor'
  | 'lineColor' | 'fillColor' | 'blink' | 'boldFlash' | 'boldReveal' | 'wave'
  | 'brush' | 'colorBlend' | 'colorWave' | 'flicker' | 'shimmer' | 'vertGrow'
  // Motion paths
  | 'arc' | 'bounce' | 'curvy' | 'decayingWave' | 'diagonal' | 'funnel'
  | 'heart' | 'heartbeat' | 'horizontalFigure' | 'invertedSquare' | 'invertedTriangle'
  | 'loopDeLoop' | 'neutron' | 'peanut' | 'pointStar4' | 'pointStar5' | 'pointStar6'
  | 'pointStar8' | 'sShape' | 'sine' | 'sineWave' | 'spiralLeft' | 'spiralRight'
  | 'spring' | 'square' | 'stairs' | 'swoosh' | 'teardrop' | 'trapezoid'
  | 'triangle' | 'turnDown' | 'turnRight' | 'turnUp' | 'turnUpRight'
  | 'verticalFigure8' | 'zig' | 'custom' | string

// ==================== Theme & Master Types ====================

/** Color scheme */
export interface ColorScheme {
  name: string
  colors: {
    dk1: Color   // dark 1
    lt1: Color   // light 1
    dk2: Color   // dark 2
    lt2: Color   // light 2
    accent1: Color
    accent2: Color
    accent3: Color
    accent4: Color
    accent5: Color
    accent6: Color
    hlink: Color // hyperlink
    folHlink: Color // followed hyperlink
  }
}

/** Font scheme */
export interface FontScheme {
  name: string
  majorFont: FontCollection
  minorFont: FontCollection
}

/** Font collection */
export interface FontCollection {
  latin: FontProperties
  eastAsian: FontProperties
  complexScript: FontProperties
  supplementalFonts?: { script: string; typeface: string }[]
}

/** Format scheme (styles) */
export interface FormatScheme {
  name: string
  fillStyles: Fill[]
  lineStyles: LineStyle[]
  effectStyles: Effects[]
  backgroundFills: Fill[]
}

/** Theme definition */
export interface Theme {
  name: string
  colorScheme: ColorScheme
  fontScheme: FontScheme
  formatScheme: FormatScheme
}

/** Slide master */
export interface SlideMaster {
  id: string
  name?: string
  theme: Theme
  background?: SlideBackground
  elements: SlideElement[]
  textStyles?: {
    title?: ParagraphProperties[]
    body?: ParagraphProperties[]
    other?: ParagraphProperties[]
  }
  layouts: SlideLayout[]
}

/** Slide layout */
export interface SlideLayout {
  id: string
  name?: string
  type: LayoutType
  masterId: string
  background?: SlideBackground
  elements: SlideElement[]
  showMasterElements?: boolean
  showMasterBackground?: boolean
}

/** Layout types */
export type LayoutType =
  | 'title' | 'titleAndContent' | 'sectionHeader' | 'twoContent'
  | 'twoTextAndTwoContent' | 'titleOnly' | 'blank' | 'contentWithCaption'
  | 'pictureWithCaption' | 'comparison' | 'verticalTitle' | 'verticalText'
  | 'object' | 'custom' | string

// ==================== Presentation Types ====================

/** Presentation properties */
export interface PresentationProperties {
  slideWidth: number
  slideHeight: number
  firstSlideNumber?: number
  showSpecialPHs?: boolean
  rtl?: boolean
  removePersonalInfo?: boolean
  compatibilityMode?: boolean
  strictFirstAndLastChars?: boolean
  embedTrueTypeFonts?: boolean
  saveSubsetFonts?: boolean
}

/** Embedded font */
export interface EmbeddedFont {
  name: string
  type: 'regular' | 'bold' | 'italic' | 'boldItalic'
  data: ArrayBuffer
}

/** Custom show */
export interface CustomShow {
  id: string
  name: string
  slideIds: number[]
}

/** Presentation metadata */
export interface PresentationMetadata {
  title?: string
  subject?: string
  creator?: string
  keywords?: string
  description?: string
  lastModifiedBy?: string
  revision?: number
  created?: Date
  modified?: Date
  category?: string
  contentStatus?: string
  contentType?: string
  identifier?: string
  language?: string
  version?: string
}

/** Main presentation structure */
export interface Presentation {
  properties: PresentationProperties
  metadata: PresentationMetadata
  masters: SlideMaster[]
  slides: Slide[]
  resources: PresentationResources
  embeddedFonts?: EmbeddedFont[]
  customShows?: CustomShow[]
}

/** Presentation resources (images, media, etc) */
export interface PresentationResources {
  images: Map<string, ArrayBuffer>
  media: Map<string, ArrayBuffer>
  embeddings: Map<string, ArrayBuffer>
  themes: Map<string, Theme>
  fonts: Map<string, ArrayBuffer>
}

// ==================== Renderer Types ====================

/** Render options */
export interface RenderOptions {
  /** Container element or selector */
  container: HTMLElement | string
  /** Initial slide index */
  initialSlide?: number
  /** Enable animations */
  enableAnimations?: boolean
  /** Enable slide transitions */
  enableTransitions?: boolean
  /** Scale mode */
  scaleMode?: 'fit' | 'fill' | 'stretch' | 'none'
  /** Background color for letterboxing */
  backgroundColor?: string
  /** Enable touch/swipe navigation */
  enableTouch?: boolean
  /** Enable keyboard navigation */
  enableKeyboard?: boolean
  /** Show controls */
  showControls?: boolean
  /** Control position */
  controlPosition?: 'bottom' | 'sides'
  /** Show progress bar */
  showProgress?: boolean
  /** Show slide numbers */
  showSlideNumber?: boolean | 'current' | 'total' | 'currentTotal'
  /** Auto-play slideshow */
  autoPlay?: boolean
  /** Auto-play interval in ms */
  autoPlayInterval?: number
  /** Loop slideshow */
  loop?: boolean
  /** Lazy load slides */
  lazyLoad?: boolean | number
  /** High DPI rendering */
  highDpi?: boolean
  /** Max device pixel ratio for high DPI */
  maxPixelRatio?: number
  /** WebGL rendering (experimental) */
  useWebGL?: boolean
  /** Custom CSS classes */
  classNames?: {
    container?: string
    slide?: string
    element?: string
    active?: string
    animating?: string
  }
}

/** Renderer events */
export interface RendererEvents {
  /** Slide changed */
  slideChange?: (index: number, slide: Slide) => void
  /** Animation started */
  animationStart?: (target: SlideElement, animation: AnimationNode) => void
  /** Animation complete */
  animationComplete?: (target: SlideElement, animation: AnimationNode) => void
  /** All animations on slide complete */
  slideAnimationsComplete?: (index: number) => void
  /** Slideshow started */
  slideshowStart?: () => void
  /** Slideshow ended */
  slideshowEnd?: () => void
  /** Ready (presentation loaded and rendered) */
  ready?: (presentation: Presentation) => void
  /** Error */
  error?: (error: Error) => void
  /** Loading progress */
  progress?: (percent: number, stage: string) => void
}

/** Renderer state */
export interface RendererState {
  currentSlide: number
  totalSlides: number
  isPlaying: boolean
  isFullscreen: boolean
  isPaused: boolean
  animationStep: number
  totalAnimationSteps: number
  scale: number
  width: number
  height: number
}

// ==================== Parser Types ====================

/** Parser options */
export interface ParserOptions {
  /** Parse animations */
  parseAnimations?: boolean
  /** Parse notes */
  parseNotes?: boolean
  /** Parse comments */
  parseComments?: boolean
  /** Parse custom XML parts */
  parseCustomXml?: boolean
  /** Extract embedded objects */
  extractEmbedded?: boolean
  /** Image loading strategy */
  imageLoading?: 'eager' | 'lazy' | 'none'
  /** Font handling */
  fontHandling?: 'embed' | 'system' | 'fallback'
  /** Password for encrypted files */
  password?: string
}

/** Parse result */
export interface ParseResult {
  presentation: Presentation
  warnings: ParseWarning[]
  errors: ParseError[]
}

/** Parse warning */
export interface ParseWarning {
  code: string
  message: string
  location?: string
  element?: string
}

/** Parse error */
export interface ParseError {
  code: string
  message: string
  location?: string
  element?: string
  fatal: boolean
}

// ==================== Export Types ====================

/** Export format */
export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'html'

/** Export options */
export interface ExportOptions {
  format: ExportFormat
  quality?: number // 0-1 for lossy formats
  scale?: number
  slides?: number[] | 'all'
  includeNotes?: boolean
  includeAnimations?: boolean
  backgroundColor?: string
  // PDF specific
  pageSize?: 'slide' | 'a4' | 'letter' | 'custom'
  pageWidth?: number
  pageHeight?: number
  pageOrientation?: 'portrait' | 'landscape'
  // HTML specific
  embedResources?: boolean
  includePlayer?: boolean
}

/** Export result */
export interface ExportResult {
  format: ExportFormat
  data: ArrayBuffer | string | Blob
  mimeType: string
  filename?: string
  slides?: { index: number; data: ArrayBuffer | string }[]
}
