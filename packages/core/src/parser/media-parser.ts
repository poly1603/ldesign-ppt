/**
 * Media Parser - Parse media files (images, video, audio)
 */

/**
 * Media info
 */
export interface MediaInfo {
  path: string
  type: 'image' | 'video' | 'audio' | 'unknown'
  mimeType: string
  extension: string
}

/**
 * Media Parser
 */
export class MediaParser {
  /**
   * MIME type mappings
   */
  private static MIME_TYPES: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    ico: 'image/x-icon',
    emf: 'image/emf',
    wmf: 'image/wmf',

    // Video
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',

    // Audio
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    wma: 'audio/x-ms-wma',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
  }

  /**
   * Get media info from path
   */
  getMediaInfo(path: string): MediaInfo {
    const extension = this.getExtension(path)
    const mimeType = this.getMimeType(extension)
    const type = this.getMediaType(extension)

    return {
      path,
      type,
      mimeType,
      extension,
    }
  }

  /**
   * Get file extension
   */
  getExtension(path: string): string {
    const parts = path.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  }

  /**
   * Get MIME type from extension
   */
  getMimeType(extension: string): string {
    return MediaParser.MIME_TYPES[extension] || 'application/octet-stream'
  }

  /**
   * Get media type from extension
   */
  getMediaType(extension: string): MediaInfo['type'] {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'emf', 'wmf']
    const videoExts = ['mp4', 'm4v', 'mov', 'avi', 'wmv', 'webm', 'mkv', 'flv']
    const audioExts = ['mp3', 'm4a', 'wav', 'wma', 'ogg', 'flac', 'aac']

    if (imageExts.includes(extension)) return 'image'
    if (videoExts.includes(extension)) return 'video'
    if (audioExts.includes(extension)) return 'audio'
    return 'unknown'
  }

  /**
   * Check if file is an image
   */
  isImage(path: string): boolean {
    return this.getMediaType(this.getExtension(path)) === 'image'
  }

  /**
   * Check if file is a video
   */
  isVideo(path: string): boolean {
    return this.getMediaType(this.getExtension(path)) === 'video'
  }

  /**
   * Check if file is audio
   */
  isAudio(path: string): boolean {
    return this.getMediaType(this.getExtension(path)) === 'audio'
  }

  /**
   * Create blob URL from ArrayBuffer
   */
  createBlobUrl(data: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([data], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  /**
   * Create data URL from ArrayBuffer
   */
  async createDataUrl(data: ArrayBuffer, mimeType: string): Promise<string> {
    const blob = new Blob([data], { type: mimeType })
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Revoke blob URL to free memory
   */
  revokeBlobUrl(url: string): void {
    URL.revokeObjectURL(url)
  }

  /**
   * Parse EMF/WMF to SVG (simplified - would need full implementation)
   */
  parseMetafile(data: ArrayBuffer, type: 'emf' | 'wmf'): string | null {
    // EMF/WMF parsing is complex and would require a dedicated library
    // This is a placeholder for future implementation
    console.warn(`${type.toUpperCase()} to SVG conversion not implemented`)
    return null
  }

  /**
   * Get image dimensions from blob
   */
  async getImageDimensions(data: ArrayBuffer, mimeType: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(data: ArrayBuffer, mimeType: string): Promise<{
    duration: number
    width: number
    height: number
  } | null> {
    return new Promise((resolve) => {
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const video = document.createElement('video')

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        })
      }

      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      video.src = url
    })
  }

  /**
   * Get audio metadata
   */
  async getAudioMetadata(data: ArrayBuffer, mimeType: string): Promise<{
    duration: number
  } | null> {
    return new Promise((resolve) => {
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const audio = document.createElement('audio')

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve({
          duration: audio.duration,
        })
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      audio.src = url
    })
  }
}
