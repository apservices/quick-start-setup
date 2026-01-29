"use client"

// Guided capture steps - strict order
export const GUIDED_CAPTURE_STEPS = [
  { id: "front-neutral", instruction: "Look directly at the camera with a neutral expression", icon: "face" },
  { id: "front-eyes-closed", instruction: "Close your eyes gently", icon: "eye-closed" },
  { id: "front-right-15", instruction: "Turn your head slightly to the right", icon: "arrow-right" },
  { id: "front-right-30", instruction: "Turn your head more to the right", icon: "arrow-right" },
  { id: "front-left-15", instruction: "Turn your head slightly to the left", icon: "arrow-left" },
  { id: "front-left-30", instruction: "Turn your head more to the left", icon: "arrow-left" },
  { id: "up-15", instruction: "Tilt your head slightly upward", icon: "arrow-up" },
  { id: "down-15", instruction: "Tilt your head slightly downward", icon: "arrow-down" },
] as const

export type GuidedCaptureStepId = (typeof GUIDED_CAPTURE_STEPS)[number]["id"]

export interface CaptureSession {
  id: string
  forgeId: string
  mode: "GUIDED" | "MANUAL"
  status: "ACTIVE" | "COMPLETED" | "ABANDONED" | "EXPIRED"
  currentStepIndex: number
  completedSteps: GuidedCaptureStepId[]
  capturedImages: Map<string, CapturedImage>
  startedAt: Date
  expiresAt: Date
  lastActivityAt: Date
}

export interface CapturedImage {
  stepId: string
  dataUrl: string
  timestamp: Date
  validated: boolean
  validationError?: string
  retakeCount: number
}

export interface DeviceCapability {
  hasCamera: boolean
  hasFrontCamera: boolean
  cameraResolution: { width: number; height: number } | null
  deviceType: "mobile" | "tablet" | "desktop" | "unknown"
  browser: string
  isCompatible: boolean
  incompatibilityReason?: string
}

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

class CaptureSessionManager {
  private sessions: Map<string, CaptureSession> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage()
      this.startCleanupInterval()
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("atlas_capture_sessions")
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.forEach((session: CaptureSession) => {
          // Reconstruct Map from array
          const capturedImages = new Map<string, CapturedImage>()
          if (session.capturedImages) {
            Object.entries(session.capturedImages).forEach(([key, value]) => {
              capturedImages.set(key, {
                ...(value as CapturedImage),
                timestamp: new Date((value as CapturedImage).timestamp),
              })
            })
          }
          this.sessions.set(session.id, {
            ...session,
            startedAt: new Date(session.startedAt),
            expiresAt: new Date(session.expiresAt),
            lastActivityAt: new Date(session.lastActivityAt),
            capturedImages,
          })
        })
      }
    } catch {
      // Ignore load errors
    }
  }

  private saveToStorage() {
    try {
      const sessionsArray = Array.from(this.sessions.values()).map((session) => ({
        ...session,
        capturedImages: Object.fromEntries(session.capturedImages),
      }))
      localStorage.setItem("atlas_capture_sessions", JSON.stringify(sessionsArray))
    } catch {
      // Ignore save errors
    }
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = new Date()
      this.sessions.forEach((session, id) => {
        if (session.status === "ACTIVE" && session.expiresAt < now) {
          session.status = "EXPIRED"
          this.saveToStorage()
        }
      })
    }, 60000) // Check every minute
  }

  createSession(forgeId: string, mode: "GUIDED" | "MANUAL"): CaptureSession {
    // Check for existing active session for this forge
    const existing = this.getActiveSessionForForge(forgeId)
    if (existing) {
      return existing
    }

    const now = new Date()
    const session: CaptureSession = {
      id: `sess_${Date.now().toString(36)}`,
      forgeId,
      mode,
      status: "ACTIVE",
      currentStepIndex: 0,
      completedSteps: [],
      capturedImages: new Map(),
      startedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TIMEOUT),
      lastActivityAt: now,
    }

    this.sessions.set(session.id, session)
    this.saveToStorage()
    return session
  }

  getSession(sessionId: string): CaptureSession | undefined {
    return this.sessions.get(sessionId)
  }

  getActiveSessionForForge(forgeId: string): CaptureSession | undefined {
    return Array.from(this.sessions.values()).find((s) => s.forgeId === forgeId && s.status === "ACTIVE")
  }

  updateSessionActivity(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (session && session.status === "ACTIVE") {
      session.lastActivityAt = new Date()
      session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT)
      this.saveToStorage()
    }
  }

  addCapturedImage(
    sessionId: string,
    stepId: string,
    dataUrl: string,
    validated: boolean,
    validationError?: string,
  ): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "ACTIVE") return false

    const existing = session.capturedImages.get(stepId)
    const retakeCount = existing ? existing.retakeCount + 1 : 0

    session.capturedImages.set(stepId, {
      stepId,
      dataUrl,
      timestamp: new Date(),
      validated,
      validationError,
      retakeCount,
    })

    if (validated && !session.completedSteps.includes(stepId as GuidedCaptureStepId)) {
      session.completedSteps.push(stepId as GuidedCaptureStepId)
    }

    session.lastActivityAt = new Date()
    this.saveToStorage()
    return true
  }

  advanceToNextStep(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "ACTIVE") return false

    if (session.currentStepIndex < GUIDED_CAPTURE_STEPS.length - 1) {
      session.currentStepIndex++
      session.lastActivityAt = new Date()
      this.saveToStorage()
      return true
    }
    return false
  }

  completeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "ACTIVE") return false

    session.status = "COMPLETED"
    this.saveToStorage()
    return true
  }

  abandonSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = "ABANDONED"
    this.saveToStorage()
    return true
  }

  getCapturedImagesForSession(sessionId: string): CapturedImage[] {
    const session = this.sessions.get(sessionId)
    if (!session) return []
    return Array.from(session.capturedImages.values())
  }
}

// Singleton instance
let sessionManagerInstance: CaptureSessionManager | null = null

export const captureSessionManager: CaptureSessionManager =
  typeof window !== "undefined"
    ? sessionManagerInstance || (sessionManagerInstance = new CaptureSessionManager())
    : (null as unknown as CaptureSessionManager)

// Device compatibility detection
export async function detectDeviceCapabilities(): Promise<DeviceCapability> {
  const result: DeviceCapability = {
    hasCamera: false,
    hasFrontCamera: false,
    cameraResolution: null,
    deviceType: "unknown",
    browser: "unknown",
    isCompatible: false,
  }

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    result.incompatibilityReason = "Browser environment not available"
    return result
  }

  // Detect device type
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipod/.test(userAgent)) {
    result.deviceType = "mobile"
  } else if (/ipad/.test(userAgent)) {
    result.deviceType = "tablet"
  } else if (/android/.test(userAgent)) {
    result.deviceType = /mobile/.test(userAgent) ? "mobile" : "tablet"
  } else {
    result.deviceType = "desktop"
  }

  // Detect browser
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    result.browser = "safari"
  } else if (/chrome/.test(userAgent)) {
    result.browser = "chrome"
  } else if (/firefox/.test(userAgent)) {
    result.browser = "firefox"
  } else {
    result.browser = "other"
  }

  // Check for camera support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    result.incompatibilityReason = "Camera API not supported by this browser"
    return result
  }

  try {
    // Enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter((d) => d.kind === "videoinput")
    result.hasCamera = videoDevices.length > 0

    if (!result.hasCamera) {
      result.incompatibilityReason = "No camera detected on this device"
      return result
    }

    // Check for front camera (usually labeled "user" facing)
    result.hasFrontCamera = videoDevices.some(
      (d) => d.label.toLowerCase().includes("front") || d.label.toLowerCase().includes("user"),
    )

    // Try to get camera capabilities
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })

    const track = stream.getVideoTracks()[0]
    if (track) {
      const settings = track.getSettings()
      result.cameraResolution = {
        width: settings.width || 0,
        height: settings.height || 0,
      }

      // Minimum resolution requirement: 1280x720
      const minWidth = 1280
      const minHeight = 720
      if (result.cameraResolution.width < minWidth || result.cameraResolution.height < minHeight) {
        result.incompatibilityReason = `Camera resolution too low. Minimum ${minWidth}x${minHeight} required, detected ${result.cameraResolution.width}x${result.cameraResolution.height}`
      }
    }

    // Stop the stream
    stream.getTracks().forEach((track) => track.stop())

    // Final compatibility check
    result.isCompatible =
      result.hasCamera &&
      !result.incompatibilityReason &&
      (result.deviceType === "mobile" || result.deviceType === "tablet")

    if (!result.isCompatible && !result.incompatibilityReason) {
      if (result.deviceType === "desktop") {
        result.incompatibilityReason =
          "Guided capture is optimized for mobile devices. Please use Manual Upload on desktop."
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        result.incompatibilityReason = "Camera permission denied. Please allow camera access."
      } else if (error.name === "NotFoundError") {
        result.incompatibilityReason = "No camera found on this device"
      } else {
        result.incompatibilityReason = `Camera error: ${error.message}`
      }
    }
  }

  return result
}

// Image validation utilities
export interface ImageValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

export function validateCapturedImage(imageData: string, _stepId: string): ImageValidationResult {
  // Basic validation - in production, this would use ML face detection
  const result: ImageValidationResult = { valid: true, warnings: [] }

  // Check if image data exists
  if (!imageData || !imageData.startsWith("data:image")) {
    return { valid: false, error: "Invalid image data" }
  }

  // Estimate image size from base64 (rough estimate)
  const base64Length = imageData.length - (imageData.indexOf(",") + 1)
  const estimatedSize = (base64Length * 3) / 4

  // Minimum size check (at least 100KB for a decent quality image)
  if (estimatedSize < 100000) {
    result.warnings?.push("Image may be too compressed for optimal quality")
  }

  // In production: Add face detection, lighting analysis, framing validation
  // For now, we'll do basic validation

  return result
}
