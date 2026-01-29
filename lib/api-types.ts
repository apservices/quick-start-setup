// API architecture types for future external integrations
import type { Certificate, Forge, Model, SystemHealth } from "./types"

// API versioning
export const API_VERSION = "v1"

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface SingleResponse<T> {
  data: T
}

// Public API endpoints (future)
export interface PublicApiEndpoints {
  // Certificate verification - public access
  "GET /api/v1/certificates/:id/verify": {
    params: { id: string }
    response: SingleResponse<{
      valid: boolean
      certificate: Pick<Certificate, "digitalTwinId" | "status" | "issuedAt" | "modelName">
    }>
  }

  // Certificate lookup by verification code
  "GET /api/v1/certificates/verify/:code": {
    params: { code: string }
    response: SingleResponse<{
      valid: boolean
      certificate?: Pick<Certificate, "digitalTwinId" | "status" | "issuedAt" | "modelName">
    }>
  }

  // Health check
  "GET /api/v1/health": {
    response: SingleResponse<SystemHealth>
  }
}

// Protected API endpoints (requires authentication)
export interface ProtectedApiEndpoints {
  // Models
  "GET /api/v1/models": {
    query: { page?: number; pageSize?: number; status?: string }
    response: PaginatedResponse<Model>
  }
  "GET /api/v1/models/:id": {
    params: { id: string }
    response: SingleResponse<Model>
  }
  "POST /api/v1/models": {
    body: Omit<Model, "id" | "createdAt" | "updatedAt">
    response: SingleResponse<Model>
  }

  // Forges
  "GET /api/v1/forges": {
    query: { page?: number; pageSize?: number; state?: string; modelId?: string }
    response: PaginatedResponse<Forge>
  }
  "GET /api/v1/forges/:id": {
    params: { id: string }
    response: SingleResponse<Forge>
  }
  "POST /api/v1/forges/:id/transition": {
    params: { id: string }
    body: { targetState: string }
    response: SingleResponse<Forge>
  }

  // Certificates
  "GET /api/v1/certificates": {
    query: { page?: number; pageSize?: number; status?: string }
    response: PaginatedResponse<Certificate>
  }
}

// Webhook payloads (future)
export interface WebhookPayloads {
  "forge.created": { forge: Forge; model: Model }
  "forge.certified": { forge: Forge; certificate: Certificate }
  "certificate.revoked": { certificate: Certificate; reason: string }
}

// Contract system types (future)
export interface Contract {
  id: string
  modelId: string
  brandId: string
  type: "EXCLUSIVE" | "NON_EXCLUSIVE" | "LIMITED"
  startDate: Date
  endDate?: Date
  terms: Record<string, unknown>
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED"
}

// Licensing system types (future)
export interface License {
  id: string
  certificateId: string
  contractId: string
  scope: string[]
  usageLimit?: number
  currentUsage: number
  expiresAt?: Date
  status: "ACTIVE" | "EXPIRED" | "REVOKED"
}

// Blockchain certification types (future)
export interface BlockchainRecord {
  transactionHash: string
  blockNumber: number
  timestamp: Date
  certificateId: string
  digitalTwinId: string
  network: "ethereum" | "polygon" | "arbitrum"
  contractAddress: string
}
