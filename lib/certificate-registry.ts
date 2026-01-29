// Certificate Registry - Public-ready architecture for verified Digital Twins
import type { Certificate, Forge, Model } from "./types"

class CertificateRegistry {
  private certificates: Map<string, Certificate> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("atlas_certificates")
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.forEach((c: Certificate) =>
        this.certificates.set(c.id, {
          ...c,
          issuedAt: new Date(c.issuedAt),
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : undefined,
          revokedAt: c.revokedAt ? new Date(c.revokedAt) : undefined,
        }),
      )
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return
    localStorage.setItem("atlas_certificates", JSON.stringify(Array.from(this.certificates.values())))
  }

  private generateVerificationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += "-"
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  // Issue a new certificate for a certified forge
  issueCertificate(forge: Forge, model: Model, issuedBy: string): Certificate | null {
    if (forge.state !== "CERTIFIED" || !forge.digitalTwinId) {
      return null
    }

    // Check if certificate already exists
    const existing = Array.from(this.certificates.values()).find((c) => c.forgeId === forge.id && c.status === "ACTIVE")
    if (existing) return existing

    const certificate: Certificate = {
      id: `cert_${Date.now().toString(36)}`,
      forgeId: forge.id,
      modelId: model.id,
      digitalTwinId: forge.digitalTwinId,
      modelName: model.name,
      version: forge.version || 1,
      issuedAt: new Date(),
      issuedBy,
      status: "ACTIVE",
      verificationCode: this.generateVerificationCode(),
      planType: model.planType,
      forgeVersion: forge.version || 1,
    }

    this.certificates.set(certificate.id, certificate)
    this.saveToStorage()
    return certificate
  }

  // Get all certificates
  getAllCertificates(): Certificate[] {
    return Array.from(this.certificates.values()).sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
  }

  // Get active certificates only
  getActiveCertificates(): Certificate[] {
    return this.getAllCertificates().filter((c) => c.status === "ACTIVE")
  }

  // Get certificate by ID
  getCertificate(id: string): Certificate | undefined {
    return this.certificates.get(id)
  }

  // Get certificate by Digital Twin ID
  getCertificateByDigitalTwinId(digitalTwinId: string): Certificate | undefined {
    return Array.from(this.certificates.values()).find(
      (c) => c.digitalTwinId === digitalTwinId && c.status === "ACTIVE",
    )
  }

  // Get certificate by verification code
  verifyCertificate(code: string): Certificate | null {
    const normalizedCode = code.replace(/\s/g, "").toUpperCase()
    const cert = Array.from(this.certificates.values()).find(
      (c) => c.verificationCode.replace(/-/g, "") === normalizedCode.replace(/-/g, ""),
    )
    return cert || null
  }

  // Revoke a certificate
  revokeCertificate(id: string, reason: string): boolean {
    const cert = this.certificates.get(id)
    if (!cert || cert.status !== "ACTIVE") return false

    cert.status = "REVOKED"
    cert.revokedAt = new Date()
    cert.revokedReason = reason
    this.certificates.set(id, cert)
    this.saveToStorage()
    return true
  }

  // Get certificates for a specific model
  getCertificatesByModel(modelId: string): Certificate[] {
    return Array.from(this.certificates.values())
      .filter((c) => c.modelId === modelId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
  }

  // Export certificate data (for future API)
  exportCertificateData(id: string): Record<string, unknown> | null {
    const cert = this.certificates.get(id)
    if (!cert) return null

    return {
      digitalTwinId: cert.digitalTwinId,
      verificationCode: cert.verificationCode,
      status: cert.status,
      issuedAt: cert.issuedAt.toISOString(),
      modelName: cert.modelName,
      version: cert.version,
      planType: cert.planType,
    }
  }

  // Stats for dashboard
  getStats() {
    const all = this.getAllCertificates()
    return {
      total: all.length,
      active: all.filter((c) => c.status === "ACTIVE").length,
      revoked: all.filter((c) => c.status === "REVOKED").length,
      byPlanType: {
        PHYSICAL: all.filter((c) => c.planType === "PHYSICAL").length,
        DIGITAL: all.filter((c) => c.planType === "DIGITAL").length,
        HYBRID: all.filter((c) => c.planType === "HYBRID").length,
      },
    }
  }
}

export const certificateRegistry =
  typeof window !== "undefined" ? new CertificateRegistry() : (null as unknown as CertificateRegistry)
