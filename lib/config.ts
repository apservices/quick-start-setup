// System configuration with environment separation
import type { SystemConfig } from "./types"

const getEnvironment = (): "development" | "staging" | "production" => {
  // Check NEXT_PUBLIC env var first, then infer from host
  const envVar = process.env.NEXT_PUBLIC_APP_ENV
  if (envVar === "production" || envVar === "staging" || envVar === "development") {
    return envVar
  }

  if (typeof window === "undefined") return "development"
  const host = window.location.hostname
  if (host === "localhost" || host === "127.0.0.1") return "development"
  if (host.includes("staging") || host.includes("preview")) return "staging"
  return "production"
}

export const env = {
  get JWT_SECRET() {
    const secret = process.env.JWT_SECRET
    if (!secret && getEnvironment() === "production") {
      throw new Error("JWT_SECRET must be set in production")
    }
    return secret || "dev-secret-key-change-in-production"
  },
  get ENCRYPTION_KEY() {
    const key = process.env.ENCRYPTION_KEY
    if (!key && getEnvironment() === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production")
    }
    return key || "dev-encryption-key-change-in-production"
  },
  get API_KEY() {
    return process.env.API_KEY
  },
  get BLOCKCHAIN_RPC_URL() {
    return process.env.BLOCKCHAIN_RPC_URL
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL
  },
} as const

export const systemConfig: SystemConfig = {
  environment: getEnvironment(),
  apiRateLimit: getEnvironment() === "production" ? 100 : 1000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxCaptureSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ["image/jpeg", "image/png", "image/tiff", "image/webp"],
  features: {
    blockchainCertification: false,
    externalApi: false,
    modelPortal: false,
    brandPortal: false,
    contractSystem: false,
    licensingSystem: false,
  },
}

// API rate limiting tracker
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private windowMs: number

  constructor(windowMs = 60000) {
    this.windowMs = windowMs
  }

  isAllowed(key: string, limit: number): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter((t) => now - t < this.windowMs)

    if (validRequests.length >= limit) {
      return false
    }

    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }

  getRemainingRequests(key: string, limit: number): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter((t) => now - t < this.windowMs)
    return Math.max(0, limit - validRequests.length)
  }

  getResetTime(key: string): Date {
    const requests = this.requests.get(key) || []
    if (requests.length === 0) return new Date()
    const oldestRequest = Math.min(...requests)
    return new Date(oldestRequest + this.windowMs)
  }
}

export const rateLimiter = new RateLimiter()

// Validation helpers
export const isProduction = () => systemConfig.environment === "production"
export const isDevelopment = () => systemConfig.environment === "development"
export const isFeatureEnabled = (feature: keyof SystemConfig["features"]) => systemConfig.features[feature]
