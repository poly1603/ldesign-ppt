/**
 * Animation Parser - Parse animations and timing from OOXML
 */

import { XMLParser } from './xml-parser'
import type {
  SlideTiming,
  AnimationBuild,
  AnimationSequence,
  AnimationNode,
  AnimationCondition,
  AnimationEffect,
  AnimationPreset,
} from '../types'

/**
 * Animation Parser
 */
export class AnimationParser {
  private xmlParser: XMLParser

  constructor(xmlParser: XMLParser) {
    this.xmlParser = xmlParser
  }

  /**
   * Parse timing element
   */
  parseTiming(timing: any): SlideTiming {
    const tnLst = this.xmlParser.getChild(timing, 'tnLst')
    const bldLst = this.xmlParser.getChild(timing, 'bldLst')

    const result: SlideTiming = {}

    // Parse build list
    if (bldLst) {
      result.buildList = this.parseBuildList(bldLst)
    }

    // Parse timing node list (animation sequences)
    if (tnLst) {
      result.sequenceList = this.parseTimingNodeList(tnLst)
    }

    return result
  }

  /**
   * Parse build list
   */
  private parseBuildList(bldLst: any): AnimationBuild[] {
    const builds: AnimationBuild[] = []

    // Build paragraph animations
    const bldPs = this.xmlParser.ensureArray(this.xmlParser.getChild(bldLst, 'bldP'))
    for (const bldP of bldPs) {
      builds.push({
        spId: parseInt(this.xmlParser.getAttr(bldP, 'spId') || '0', 10),
        grpId: parseInt(this.xmlParser.getAttr(bldP, 'grpId') || '0', 10),
        animBg: this.xmlParser.parseBoolean(this.xmlParser.getAttr(bldP, 'animBg')),
        autoRev: this.xmlParser.parseBoolean(this.xmlParser.getAttr(bldP, 'autoUpdateAnimBg')),
      })
    }

    // Build diagram animations
    const bldDgms = this.xmlParser.ensureArray(this.xmlParser.getChild(bldLst, 'bldDgm'))
    for (const bldDgm of bldDgms) {
      builds.push({
        spId: parseInt(this.xmlParser.getAttr(bldDgm, 'spId') || '0', 10),
      })
    }

    // Build chart animations
    const bldCharts = this.xmlParser.ensureArray(this.xmlParser.getChild(bldLst, 'bldChart'))
    for (const bldChart of bldCharts) {
      builds.push({
        spId: parseInt(this.xmlParser.getAttr(bldChart, 'spId') || '0', 10),
      })
    }

    return builds
  }

  /**
   * Parse timing node list
   */
  private parseTimingNodeList(tnLst: any): AnimationSequence[] {
    const sequences: AnimationSequence[] = []

    // Parse parallel (par) nodes - main sequence
    const pars = this.xmlParser.ensureArray(this.xmlParser.getChild(tnLst, 'par'))
    for (const par of pars) {
      const sequence = this.parseParallelNode(par)
      if (sequence) {
        sequences.push(sequence)
      }
    }

    return sequences
  }

  /**
   * Parse parallel node
   */
  private parseParallelNode(par: any): AnimationSequence | null {
    const cTn = this.xmlParser.getChild(par, 'cTn')
    if (!cTn) return null

    const childTnLst = this.xmlParser.getChild(cTn, 'childTnLst')
    if (!childTnLst) return null

    const children = this.parseChildTnLst(childTnLst)

    return {
      concurrent: true,
      children,
    }
  }

  /**
   * Parse child timing node list
   */
  private parseChildTnLst(childTnLst: any): AnimationNode[] {
    const nodes: AnimationNode[] = []

    // Parse sequence nodes (seq)
    const seqs = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'seq'))
    for (const seq of seqs) {
      const node = this.parseSequenceNode(seq)
      if (node) nodes.push(node)
    }

    // Parse parallel nodes (par)
    const pars = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'par'))
    for (const par of pars) {
      const node = this.parseParNode(par)
      if (node) nodes.push(node)
    }

    // Parse set nodes
    const sets = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'set'))
    for (const set of sets) {
      const node = this.parseSetNode(set)
      if (node) nodes.push(node)
    }

    // Parse animate nodes
    const animates = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'anim'))
    for (const anim of animates) {
      const node = this.parseAnimateNode(anim)
      if (node) nodes.push(node)
    }

    // Parse animEffect nodes
    const animEffects = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'animEffect'))
    for (const animEffect of animEffects) {
      const node = this.parseAnimEffectNode(animEffect)
      if (node) nodes.push(node)
    }

    // Parse animClr nodes (color animation)
    const animClrs = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'animClr'))
    for (const animClr of animClrs) {
      const node = this.parseAnimColorNode(animClr)
      if (node) nodes.push(node)
    }

    // Parse animMotion nodes (motion path)
    const animMotions = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'animMotion'))
    for (const animMotion of animMotions) {
      const node = this.parseAnimMotionNode(animMotion)
      if (node) nodes.push(node)
    }

    // Parse animRot nodes (rotation)
    const animRots = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'animRot'))
    for (const animRot of animRots) {
      const node = this.parseAnimRotationNode(animRot)
      if (node) nodes.push(node)
    }

    // Parse animScale nodes
    const animScales = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'animScale'))
    for (const animScale of animScales) {
      const node = this.parseAnimScaleNode(animScale)
      if (node) nodes.push(node)
    }

    // Parse audio nodes
    const audios = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'audio'))
    for (const audio of audios) {
      const node = this.parseAudioNode(audio)
      if (node) nodes.push(node)
    }

    // Parse video nodes
    const videos = this.xmlParser.ensureArray(this.xmlParser.getChild(childTnLst, 'video'))
    for (const video of videos) {
      const node = this.parseVideoNode(video)
      if (node) nodes.push(node)
    }

    return nodes
  }

  /**
   * Parse sequence node
   */
  private parseSequenceNode(seq: any): AnimationNode | null {
    const cTn = this.xmlParser.getChild(seq, 'cTn')
    if (!cTn) return null

    const childTnLst = this.xmlParser.getChild(cTn, 'childTnLst')
    const children = childTnLst ? this.parseChildTnLst(childTnLst) : []

    return {
      type: 'sequence',
      children,
      ...this.parseCommonTimingProps(cTn),
    }
  }

  /**
   * Parse par node
   */
  private parseParNode(par: any): AnimationNode | null {
    const cTn = this.xmlParser.getChild(par, 'cTn')
    if (!cTn) return null

    const childTnLst = this.xmlParser.getChild(cTn, 'childTnLst')
    const children = childTnLst ? this.parseChildTnLst(childTnLst) : []

    return {
      type: 'parallel',
      children,
      ...this.parseCommonTimingProps(cTn),
    }
  }

  /**
   * Parse set node
   */
  private parseSetNode(set: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(set, 'cBhvr')
    const to = this.xmlParser.getChild(set, 'to')

    return {
      type: 'set',
      ...this.parseBehaviorProps(cBhvr),
      to: this.xmlParser.getAttr(to, 'val'),
    }
  }

  /**
   * Parse animate node
   */
  private parseAnimateNode(anim: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(anim, 'cBhvr')
    const tavLst = this.xmlParser.getChild(anim, 'tavLst')

    const node: AnimationNode = {
      type: 'animate',
      ...this.parseBehaviorProps(cBhvr),
      calcMode: this.xmlParser.getAttr(anim, 'calcmode') as AnimationNode['calcMode'],
    }

    // Parse time-animate values
    if (tavLst) {
      const tavs = this.xmlParser.ensureArray(this.xmlParser.getChild(tavLst, 'tav'))
      node.keyTimes = []
      node.values = []

      for (const tav of tavs) {
        const tm = this.xmlParser.getAttr(tav, 'tm')
        const val = this.xmlParser.getChild(tav, 'val')

        if (tm) {
          node.keyTimes.push(parseInt(tm, 10) / 100000)
        }
        if (val) {
          const strVal = this.xmlParser.getAttr(val, 'strVal') || this.xmlParser.getAttr(val, 'fltVal')
          if (strVal) {
            node.values.push(strVal)
          }
        }
      }
    }

    return node
  }

  /**
   * Parse animEffect node
   */
  private parseAnimEffectNode(animEffect: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(animEffect, 'cBhvr')
    const filter = this.xmlParser.getAttr(animEffect, 'filter')
    const transition = this.xmlParser.getAttr(animEffect, 'transition')

    return {
      type: 'effect',
      ...this.parseBehaviorProps(cBhvr),
      effect: this.parseEffectFromFilter(filter, transition),
    }
  }

  /**
   * Parse effect from filter string
   */
  private parseEffectFromFilter(filter: string | undefined, transition: string | undefined): AnimationEffect | undefined {
    if (!filter) return undefined

    // Parse filter format: "type(param1=val1,param2=val2)"
    const match = filter.match(/^(\w+)(?:\(([^)]*)\))?$/)
    if (!match) return undefined

    const [, preset, params] = match

    let presetClass: AnimationEffect['presetClass'] = 'entrance'
    if (transition === 'out') {
      presetClass = 'exit'
    }

    return {
      preset: preset as AnimationPreset,
      presetClass,
    }
  }

  /**
   * Parse animClr node (color animation)
   */
  private parseAnimColorNode(animClr: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(animClr, 'cBhvr')
    const by = this.xmlParser.getChild(animClr, 'by')
    const from = this.xmlParser.getChild(animClr, 'from')
    const to = this.xmlParser.getChild(animClr, 'to')

    const node: AnimationNode = {
      type: 'animateColor',
      ...this.parseBehaviorProps(cBhvr),
      colorSpace: this.xmlParser.getAttr(animClr, 'clrSpc') as 'rgb' | 'hsl',
      direction: this.xmlParser.getAttr(animClr, 'dir') as 'cw' | 'ccw',
    }

    if (from) {
      const color = this.xmlParser.parseColor(from)
      if (color) node.from = color.value
    }
    if (to) {
      const color = this.xmlParser.parseColor(to)
      if (color) node.to = color.value
    }

    return node
  }

  /**
   * Parse animMotion node (motion path)
   */
  private parseAnimMotionNode(animMotion: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(animMotion, 'cBhvr')

    return {
      type: 'animateMotion',
      ...this.parseBehaviorProps(cBhvr),
      path: this.xmlParser.getAttr(animMotion, 'path'),
      pathEditMode: this.xmlParser.getAttr(animMotion, 'ptsTypes') as 'relative' | 'fixed',
    }
  }

  /**
   * Parse animRot node (rotation animation)
   */
  private parseAnimRotationNode(animRot: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(animRot, 'cBhvr')

    return {
      type: 'animateRotation',
      ...this.parseBehaviorProps(cBhvr),
      by: parseInt(this.xmlParser.getAttr(animRot, 'by') || '0', 10),
      from: parseInt(this.xmlParser.getAttr(animRot, 'from') || '0', 10),
      to: parseInt(this.xmlParser.getAttr(animRot, 'to') || '0', 10),
    }
  }

  /**
   * Parse animScale node
   */
  private parseAnimScaleNode(animScale: any): AnimationNode | null {
    const cBhvr = this.xmlParser.getChild(animScale, 'cBhvr')
    const by = this.xmlParser.getChild(animScale, 'by')
    const from = this.xmlParser.getChild(animScale, 'from')
    const to = this.xmlParser.getChild(animScale, 'to')

    return {
      type: 'animateScale',
      ...this.parseBehaviorProps(cBhvr),
      zoomContents: this.xmlParser.parseBoolean(this.xmlParser.getAttr(animScale, 'zoomContents')),
    }
  }

  /**
   * Parse audio node
   */
  private parseAudioNode(audio: any): AnimationNode | null {
    const cMediaNode = this.xmlParser.getChild(audio, 'cMediaNode')
    const cTn = this.xmlParser.getChild(cMediaNode, 'cTn')
    const tgtEl = this.xmlParser.getChild(cMediaNode, 'tgtEl')

    return {
      type: 'audio',
      ...this.parseCommonTimingProps(cTn),
      ...this.parseTargetElement(tgtEl),
    }
  }

  /**
   * Parse video node
   */
  private parseVideoNode(video: any): AnimationNode | null {
    const cMediaNode = this.xmlParser.getChild(video, 'cMediaNode')
    const cTn = this.xmlParser.getChild(cMediaNode, 'cTn')
    const tgtEl = this.xmlParser.getChild(cMediaNode, 'tgtEl')

    return {
      type: 'video',
      ...this.parseCommonTimingProps(cTn),
      ...this.parseTargetElement(tgtEl),
    }
  }

  /**
   * Parse common timing properties
   */
  private parseCommonTimingProps(cTn: any): Partial<AnimationNode> {
    if (!cTn) return {}

    const stCondLst = this.xmlParser.getChild(cTn, 'stCondLst')
    const endCondLst = this.xmlParser.getChild(cTn, 'endCondLst')

    const props: Partial<AnimationNode> = {
      duration: this.parseDuration(this.xmlParser.getAttr(cTn, 'dur')),
      fill: this.xmlParser.getAttr(cTn, 'fill') as AnimationNode['fill'],
      repeatCount: this.parseRepeatCount(this.xmlParser.getAttr(cTn, 'repeatCount')),
      repeatDuration: parseInt(this.xmlParser.getAttr(cTn, 'repeatDur') || '0', 10) || undefined,
      restart: this.xmlParser.getAttr(cTn, 'restart') as AnimationNode['restart'],
      acceleration: parseInt(this.xmlParser.getAttr(cTn, 'accel') || '0', 10) / 1000 || undefined,
      deceleration: parseInt(this.xmlParser.getAttr(cTn, 'decel') || '0', 10) / 1000 || undefined,
      autoReverse: this.xmlParser.parseBoolean(this.xmlParser.getAttr(cTn, 'autoRev')),
    }

    // Parse start condition
    if (stCondLst) {
      const cond = this.xmlParser.getChild(stCondLst, 'cond')
      if (cond) {
        props.begin = this.xmlParser.getAttr(cond, 'delay')
      }
    }

    return props
  }

  /**
   * Parse behavior properties
   */
  private parseBehaviorProps(cBhvr: any): Partial<AnimationNode> {
    if (!cBhvr) return {}

    const cTn = this.xmlParser.getChild(cBhvr, 'cTn')
    const tgtEl = this.xmlParser.getChild(cBhvr, 'tgtEl')
    const attrNameLst = this.xmlParser.getChild(cBhvr, 'attrNameLst')

    const props: Partial<AnimationNode> = {
      ...this.parseCommonTimingProps(cTn),
      ...this.parseTargetElement(tgtEl),
    }

    // Parse attribute name
    if (attrNameLst) {
      const attrName = this.xmlParser.getChild(attrNameLst, 'attrName')
      if (attrName) {
        props.attributeName = this.xmlParser.getText(attrName)
      }
    }

    return props
  }

  /**
   * Parse target element
   */
  private parseTargetElement(tgtEl: any): Partial<AnimationNode> {
    if (!tgtEl) return {}

    const spTgt = this.xmlParser.getChild(tgtEl, 'spTgt')
    if (spTgt) {
      const spId = this.xmlParser.getAttr(spTgt, 'spid')
      const txEl = this.xmlParser.getChild(spTgt, 'txEl')

      const props: Partial<AnimationNode> = {
        targetId: spId ? parseInt(spId, 10) : undefined,
      }

      // Parse text element target (paragraph, character range)
      if (txEl) {
        const pRg = this.xmlParser.getChild(txEl, 'pRg')
        const charRg = this.xmlParser.getChild(txEl, 'charRg')

        if (pRg) {
          const st = this.xmlParser.getAttr(pRg, 'st')
          const end = this.xmlParser.getAttr(pRg, 'end')
          props.subTarget = `p${st}-${end}`
        } else if (charRg) {
          const st = this.xmlParser.getAttr(charRg, 'st')
          const end = this.xmlParser.getAttr(charRg, 'end')
          props.subTarget = `c${st}-${end}`
        }
      }

      return props
    }

    return {}
  }

  /**
   * Parse duration value
   */
  private parseDuration(dur: string | undefined): number | 'indefinite' | undefined {
    if (!dur) return undefined
    if (dur === 'indefinite') return 'indefinite'
    return parseInt(dur, 10)
  }

  /**
   * Parse repeat count
   */
  private parseRepeatCount(count: string | undefined): number | 'indefinite' | undefined {
    if (!count) return undefined
    if (count === 'indefinite') return 'indefinite'
    return parseInt(count, 10) / 1000
  }
}
