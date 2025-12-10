/**
 * Timing Controller - Controls animation timing and scheduling
 */

import type { AnimationNode, SlideTiming } from '../types'

/** Timeline item */
export interface TimelineItem {
  id: string
  startTime: number
  duration: number
  node: AnimationNode
  state: 'pending' | 'running' | 'completed'
}

/** Timeline event */
export interface TimelineEvent {
  type: 'start' | 'complete' | 'update'
  item: TimelineItem
  time: number
}

/**
 * Timing Controller
 */
export class TimingController {
  private timeline: TimelineItem[] = []
  private currentTime: number = 0
  private isRunning: boolean = false
  private rafId: number | null = null
  private startTimestamp: number = 0
  private speed: number = 1

  private eventListeners: Map<string, Set<(event: TimelineEvent) => void>> = new Map()

  /**
   * Build timeline from slide timing
   */
  buildTimeline(timing: SlideTiming): void {
    this.timeline = []
    let currentOffset = 0

    if (!timing.sequenceList) return

    for (const sequence of timing.sequenceList) {
      currentOffset = this.processNodes(sequence.children, currentOffset)
    }

    // Sort by start time
    this.timeline.sort((a, b) => a.startTime - b.startTime)
  }

  /**
   * Process animation nodes
   */
  private processNodes(nodes: AnimationNode[], offset: number): number {
    let maxEndTime = offset

    for (const node of nodes) {
      const duration = typeof node.duration === 'number' ? node.duration : 500
      const delay = typeof node.begin === 'string' ? parseInt(node.begin) || 0 : 0
      const startTime = offset + delay

      if (node.type === 'sequence' && node.children) {
        // Sequential - one after another
        let seqOffset = startTime
        for (const child of node.children) {
          const childDuration = typeof child.duration === 'number' ? child.duration : 500
          this.addToTimeline(child, seqOffset, childDuration)
          seqOffset += childDuration
        }
        maxEndTime = Math.max(maxEndTime, seqOffset)
      } else if (node.type === 'parallel' && node.children) {
        // Parallel - all start together
        let parallelMaxEnd = startTime
        for (const child of node.children) {
          const childDuration = typeof child.duration === 'number' ? child.duration : 500
          this.addToTimeline(child, startTime, childDuration)
          parallelMaxEnd = Math.max(parallelMaxEnd, startTime + childDuration)
        }
        maxEndTime = Math.max(maxEndTime, parallelMaxEnd)
      } else {
        // Leaf node
        this.addToTimeline(node, startTime, duration)
        maxEndTime = Math.max(maxEndTime, startTime + duration)
      }
    }

    return maxEndTime
  }

  /**
   * Add item to timeline
   */
  private addToTimeline(node: AnimationNode, startTime: number, duration: number): void {
    const id = `anim_${this.timeline.length}_${Date.now()}`

    this.timeline.push({
      id,
      startTime,
      duration,
      node,
      state: 'pending',
    })
  }

  /**
   * Start playback
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.startTimestamp = performance.now() - this.currentTime / this.speed
    this.tick()
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Stop and reset
   */
  stop(): void {
    this.pause()
    this.currentTime = 0

    // Reset all items
    for (const item of this.timeline) {
      item.state = 'pending'
    }
  }

  /**
   * Seek to time
   */
  seek(time: number): void {
    this.currentTime = time
    this.startTimestamp = performance.now() - time / this.speed

    // Update item states
    for (const item of this.timeline) {
      if (time < item.startTime) {
        item.state = 'pending'
      } else if (time >= item.startTime + item.duration) {
        item.state = 'completed'
      } else {
        item.state = 'running'
      }
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = speed
    if (this.isRunning) {
      this.startTimestamp = performance.now() - this.currentTime / this.speed
    }
  }

  /**
   * Main tick function
   */
  private tick(): void {
    if (!this.isRunning) return

    const now = performance.now()
    this.currentTime = (now - this.startTimestamp) * this.speed

    // Process timeline items
    for (const item of this.timeline) {
      if (item.state === 'pending' && this.currentTime >= item.startTime) {
        // Start animation
        item.state = 'running'
        this.emit({ type: 'start', item, time: this.currentTime })
      } else if (item.state === 'running') {
        // Update animation
        this.emit({ type: 'update', item, time: this.currentTime })

        // Check if completed
        if (this.currentTime >= item.startTime + item.duration) {
          item.state = 'completed'
          this.emit({ type: 'complete', item, time: this.currentTime })
        }
      }
    }

    // Check if all completed
    const allCompleted = this.timeline.every(item => item.state === 'completed')
    if (allCompleted) {
      this.isRunning = false
      return
    }

    this.rafId = requestAnimationFrame(() => this.tick())
  }

  /**
   * Get items at current time
   */
  getActiveItems(): TimelineItem[] {
    return this.timeline.filter(item => item.state === 'running')
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    if (this.timeline.length === 0) return 1

    const totalDuration = this.getTotalDuration()
    return Math.min(1, this.currentTime / totalDuration)
  }

  /**
   * Get total duration
   */
  getTotalDuration(): number {
    if (this.timeline.length === 0) return 0

    return Math.max(...this.timeline.map(item => item.startTime + item.duration))
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.currentTime
  }

  /**
   * Is playing
   */
  isPlaying(): boolean {
    return this.isRunning
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (event: TimelineEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (event: TimelineEvent) => void): void {
    this.eventListeners.get(event)?.delete(callback)
  }

  /**
   * Emit event
   */
  private emit(event: TimelineEvent): void {
    this.eventListeners.get(event.type)?.forEach(cb => cb(event))
    this.eventListeners.get('*')?.forEach(cb => cb(event))
  }

  /**
   * Clear timeline
   */
  clear(): void {
    this.stop()
    this.timeline = []
  }

  /**
   * Destroy
   */
  destroy(): void {
    this.clear()
    this.eventListeners.clear()
  }
}
