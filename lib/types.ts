// Core domain types for THE FORJ CORE system

export type UserRole = "ADMIN" | "OPERATOR" | "MODEL" | "CLIENT"

export const ROLE_SCOPES: Record<UserRole, string[]> = {
  ADMIN: ["*"], // Full access
  OPERATOR: [
    "models:read",
    "models:create",
    "models:update",
    "forges:read",
    "forges:create",
    "forges:transition",
    "captures:read",
    "captures:upload",
    "validation:execute",
    "certification:execute",
    "capture_viewer:read",
    "vtp:generate",
    "vtp:read",
    "vtg:generate",
    "vtg:read",
    "assets:read",
    "licenses:read",
    "licenses:create",
  ],
  MODEL: [
    "models:read:self",
    "forges:read:self",
    "certificates:read:self",
    "capture_viewer:read:self",
    "vtp:read:self",
    "assets:read:self",
    "career:read",
    "career:consents",
  ],
  CLIENT: ["certificates:read", "assets:read:licensed", "assets:download:licensed", "licenses:read:self"],
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  linkedModelId?: string
  linkedClientId?: string
  createdAt: Date
  lastLoginAt: Date
}

export type PlanType = "BASIC" | "HYBRID" | "ENTERPRISE"

export interface Model {
  id: string
  name: string
  internalId: string
  status: "PENDING_CONSENT" | "ACTIVE" | "ARCHIVED"
  planType: PlanType
  consentGiven: boolean
  consentDate?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Forge states in strict order - no step can be skipped
export const FORGE_STATES = [
  "CREATED",
  "CAPTURED",
  "NORMALIZED",
  "SEEDED",
  "PARAMETRIZED",
  "VALIDATED",
  "CERTIFIED",
] as const

export type ForgeState = (typeof FORGE_STATES)[number]

export interface Forge {
  id: string
  modelId: string
  state: ForgeState
  version: number
  digitalTwinId?: string
  seedHash?: string
  captureProgress: number
  createdAt: Date
  updatedAt: Date
  certifiedAt?: Date
  createdBy: string
  blockchainTxHash?: string
  blockchainTimestamp?: Date
}

export type CaptureStage = "CAPTURE" | "NORMALIZED"

export interface CaptureAsset {
  id: string
  forgeId: string
  digitalTwinId?: string
  type: "PHOTO" | "VIDEO"
  stage: CaptureStage
  angle: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  resolution: { width: number; height: number }
  status: "VALID" | "INVALID" | "MISSING"
  uploadedAt: Date
}

export interface NormalizedAsset {
  id: string
  forgeId: string
  sourceAssetId: string
  processedAt: Date
}

export interface ValidationResult {
  id: string
  forgeId: string
  passed: boolean
  score: number
  previewUrl?: string
  validatedAt: Date
}

export type PreviewType = "NEUTRAL_PORTRAIT" | "LIGHT_LIFESTYLE" | "SIMPLE_EDITORIAL"

export interface VisualTwinPreview {
  id: string
  digitalTwinId: string
  generatedBy: string
  previewType: PreviewType
  imageUrl: string
  watermarked: true // Always true for previews
  expiresAt: Date
  createdAt: Date
  status: "ACTIVE" | "EXPIRED" | "DELETED"
}

export type VTGMode = "PREVIEW" | "LICENSED"
export type VTGCategory =
  | "NEUTRAL_PORTRAIT"
  | "LIGHT_LIFESTYLE"
  | "SIMPLE_EDITORIAL"
  | "PRODUCT_USAGE"
  | "CAMPAIGN"
  | "CUSTOM"
export type VTGJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED"

export interface VTGJob {
  id: string
  digitalTwinId: string
  mode: VTGMode
  category: VTGCategory
  presetId?: string
  status: VTGJobStatus
  priority: number // Based on plan: ENTERPRISE=3, HYBRID=2, BASIC=1
  result?: {
    assetId?: string
    previewId?: string
    error?: string
  }
  createdBy: string
  createdAt: Date
  completedAt?: Date
}

export type VisualAssetType = "PREVIEW" | "LICENSED"

export interface VisualAsset {
  id: string
  digitalTwinId: string
  vtgJobId: string
  type: VisualAssetType
  category: VTGCategory
  fileUrl: string
  hash: string
  licenseId?: string
  watermarked: boolean
  certificateId?: string
  metadata?: {
    resolution: { width: number; height: number }
    format: string
    size: number
  }
  createdAt: Date
}

export type LicenseUsageType = "COMMERCIAL" | "EDITORIAL"
export type LicenseStatus = "ACTIVE" | "EXPIRED" | "REVOKED"

export interface License {
  id: string
  digitalTwinId: string
  clientId: string
  usageType: LicenseUsageType
  territory: string[]
  validFrom: Date
  validUntil: Date
  status: LicenseStatus
  maxDownloads?: number
  currentDownloads: number
  createdBy: string
  createdAt: Date
  revokedAt?: Date
  revokedReason?: string
}

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_SESSION_REFRESH"
  | "MODEL_CREATED"
  | "MODEL_UPDATED"
  | "MODEL_ARCHIVED"
  | "CONSENT_GIVEN"
  | "FORGE_CREATED"
  | "FORGE_STATE_CHANGED"
  | "CAPTURE_UPLOADED"
  | "NORMALIZATION_STARTED"
  | "NORMALIZATION_COMPLETED"
  | "SEED_GENERATED"
  | "PARAMETRIZATION_STARTED"
  | "PARAMETRIZATION_COMPLETED"
  | "VALIDATION_STARTED"
  | "VALIDATION_COMPLETED"
  | "CERTIFICATION_COMPLETED"
  | "FORGE_ROLLBACK"
  | "CERTIFICATE_EXPORTED"
  | "API_ACCESS"
  | "RATE_LIMIT_HIT"
  | "SECURITY_EVENT"
  | "SYSTEM_ERROR"
  // Phase 2 audit actions
  | "PREVIEW_GENERATED"
  | "PREVIEW_EXPIRED"
  | "VTG_JOB_CREATED"
  | "VTG_JOB_COMPLETED"
  | "ASSET_CREATED"
  | "ASSET_DOWNLOADED"
  | "LICENSE_ACTIVATED"
  | "LICENSE_EXPIRED"
  | "LICENSE_REVOKED"
  | "CAPTURE_VIEWED"

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: AuditAction
  entityType?: string
  entityId?: string
  forgeId?: string
  modelId?: string
  digitalTwinId?: string
  metadata?: Record<string, unknown>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  integrityHash?: string
  previousLogHash?: string
}

export interface Certificate {
  id: string
  forgeId: string
  modelId: string
  digitalTwinId: string
  modelName: string
  version: number
  issuedAt: Date
  issuedBy: string
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  expiresAt?: Date
  revokedAt?: Date
  revokedReason?: string
  // Verification data
  verificationCode: string
  publicKey?: string
  signature?: string
  // Metadata
  planType: PlanType
  forgeVersion: number
}

export interface SystemConfig {
  environment: "development" | "staging" | "production"
  apiRateLimit: number
  sessionTimeout: number
  maxCaptureSize: number
  allowedFileTypes: string[]
  features: {
    blockchainCertification: boolean
    externalApi: boolean
    modelPortal: boolean
    brandPortal: boolean
    contractSystem: boolean
    licensingSystem: boolean
    visualTwinPreview: boolean
    visualTwinGenerator: boolean
    assetLibrary: boolean
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    requestId: string
    timestamp: Date
    rateLimit: {
      remaining: number
      reset: Date
    }
  }
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: Date
  services: {
    database: "up" | "down"
    storage: "up" | "down"
    processing: "up" | "down"
    certification: "up" | "down"
    vtg: "up" | "down"
  }
  metrics: {
    totalForges: number
    certifiedForges: number
    activeModels: number
    pendingValidations: number
    activePreviews: number
    activeLicenses: number
    errorRate: number
  }
}

// Capture angles required for a complete forge (72 total)
export const CAPTURE_ANGLES = [
  "front",
  "front-left-15",
  "front-left-30",
  "front-left-45",
  "front-right-15",
  "front-right-30",
  "front-right-45",
  "left-profile",
  "right-profile",
  "up-15",
  "up-30",
  "down-15",
  "down-30",
  "front-smile",
  "front-neutral",
  "front-eyes-closed",
  ...Array.from({ length: 56 }, (_, i) => `angle-${i + 17}`),
] as const

export type CaptureAngle = (typeof CAPTURE_ANGLES)[number]

export type CaptureMode = "GUIDED" | "MANUAL"

export type CaptureSessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED" | "EXPIRED"

export interface GuidedCaptureStep {
  id: string
  instruction: string
  icon: string
  order: number
}
