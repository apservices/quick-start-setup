import { systemConfig } from "./config"

// Error types for validation
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code = "VALIDATION_ERROR",
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

// Sanitization utilities
export function sanitizeString(input: string, maxLength = 255): string {
  if (typeof input !== "string") return ""
  // Remove potentially dangerous characters and limit length
  return input
    .trim()
    .replace(/[<>'"&]/g, "")
    .slice(0, maxLength)
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return ""
  return email.toLowerCase().trim().slice(0, 255)
}

// Validation functions
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeEmail(email)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!sanitized) {
    return { valid: false, error: "Email is required" }
  }
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: "Invalid email format" }
  }
  return { valid: true }
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" }
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" }
  }
  if (password.length > 128) {
    return { valid: false, error: "Password is too long" }
  }
  return { valid: true }
}

export function validateModelName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(name, 100)

  if (!sanitized) {
    return { valid: false, error: "Name is required" }
  }
  if (sanitized.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" }
  }
  if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
    return { valid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" }
  }
  return { valid: true }
}

export function validateInternalId(id: string): { valid: boolean; error?: string } {
  if (!id) return { valid: true } // Optional field

  const sanitized = sanitizeString(id, 50)
  if (!/^[A-Z0-9-]+$/i.test(sanitized)) {
    return { valid: false, error: "Internal ID can only contain letters, numbers, and hyphens" }
  }
  return { valid: true }
}

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "File is required" }
  }

  if (!systemConfig.allowedFileTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${systemConfig.allowedFileTypes.join(", ")}`,
    }
  }

  if (file.size > systemConfig.maxCaptureSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${Math.round(systemConfig.maxCaptureSize / 1024 / 1024)}MB`,
    }
  }

  // Validate filename
  if (!/^[\w\-. ]+$/.test(file.name)) {
    return { valid: false, error: "Invalid filename" }
  }

  return { valid: true }
}

export function validateForgeId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Forge ID is required" }
  }
  if (!/^frg_[a-z0-9]+$/.test(id)) {
    return { valid: false, error: "Invalid forge ID format" }
  }
  return { valid: true }
}

export function validateModelId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Model ID is required" }
  }
  if (!/^mdl_[a-z0-9]+$/.test(id)) {
    return { valid: false, error: "Invalid model ID format" }
  }
  return { valid: true }
}

// Rate limit validation
export function validateRateLimit(
  identifier: string,
  limit: number,
  rateLimiter: { isAllowed: (key: string, limit: number) => boolean },
): { valid: boolean; error?: string } {
  if (!rateLimiter.isAllowed(identifier, limit)) {
    return { valid: false, error: "Rate limit exceeded. Please try again later." }
  }
  return { valid: true }
}
