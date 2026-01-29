"use client"

import type {
  VisualTwinPreview,
  VTGJob,
  VisualAsset,
  License,
  CaptureAsset,
  PreviewType,
  VTGMode,
  VTGCategory,
  VTGJobStatus,
  LicenseUsageType,
  AuditLog,
  CaptureStage,
} from "./types"

import { systemLogger } from "./system-logger"

// =============================================================================
// Utilitários
// =============================================================================

function generateAssetHash(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0  // força conversão para 32-bit integer
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(64, "0")}`
}

/* 🔧 PREVIEW ATLAS PROMPTS */
const PREVIEW_ATLAS_PROMPTS: Record<PreviewType, string> = {
  NEUTRAL_PORTRAIT:
    "ultra realistic neutral portrait, studio lighting, professional headshot, clean background, high fidelity",
  LIGHT_LIFESTYLE:
    "natural light lifestyle portrait, soft shadows, realistic skin texture, candid professional photo",
  SIMPLE_EDITORIAL:
    "editorial style portrait, minimal fashion look, magazine lighting, professional photography",
} as const

// =============================================================================
// Armazenamento Principal - Phase 2
// =============================================================================

class Phase2Store {
  private captureAssets: Map<string, CaptureAsset[]> = new Map()
  private previews: Map<string, VisualTwinPreview> = new Map()
  private vtgJobs: Map<string, VTGJob> = new Map()
  private visualAssets: Map<string, VisualAsset> = new Map()
  private licenses: Map<string, License> = new Map()

  private expirationIntervalId: NodeJS.Timeout | null = null

  constructor() {
    this.loadFromStorage()
    this.initializeDemoData()
    this.startExpirationChecker()
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Persistência
  // ────────────────────────────────────────────────────────────────────────────

  private loadFromStorage(): void {
    if (typeof window === "undefined") return

    try {
      const captureRaw = localStorage.getItem("forj_capture_assets_v2")
      const previewsRaw = localStorage.getItem("forj_previews")
      const jobsRaw = localStorage.getItem("forj_vtg_jobs")
      const assetsRaw = localStorage.getItem("forj_visual_assets")
      const licensesRaw = localStorage.getItem("forj_licenses")

      // Capture Assets (agrupados por digitalTwinId)
      if (captureRaw) {
        const parsed = JSON.parse(captureRaw) as Record<string, unknown>
        Object.entries(parsed).forEach(([digitalTwinId, assets]) => {
          if (Array.isArray(assets)) {
            this.captureAssets.set(
              digitalTwinId,
              assets.map((a: any) => ({
                ...a,
                uploadedAt: new Date(a.uploadedAt),
              })) as CaptureAsset[]
            )
          }
        })
      }

      // Função auxiliar para carregar arrays com campos de data
      const loadItems = <T extends { id: string }>(
        raw: string | null,
        targetMap: Map<string, T>,
        dateFields: (keyof T & string)[]
      ) => {
        if (!raw) return
        try {
          const items = JSON.parse(raw) as any[]
          items.forEach((item) => {
            const normalized = { ...item }
            dateFields.forEach((field) => {
              if (normalized[field]) {
                normalized[field] = new Date(normalized[field])
              }
            })
            targetMap.set(item.id, normalized as T)
          })
        } catch (e) {
          systemLogger?.warn(`Erro ao parsear ${raw.slice(0, 30)}...`, "Phase2Store", e)
        }
      }

      loadItems(previewsRaw, this.previews, ["createdAt", "expiresAt"])
      loadItems(jobsRaw, this.vtgJobs, ["createdAt", "completedAt"])
      loadItems(assetsRaw, this.visualAssets, ["createdAt"])
      loadItems(licensesRaw, this.licenses, ["createdAt", "validFrom", "validUntil", "revokedAt"])
    } catch (error) {
      systemLogger?.error("Failed to load Phase 2 data from storage", "Phase2Store", error as Error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return

    try {
      const captureAssetsObj: Record<string, CaptureAsset[]> = {}
      this.captureAssets.forEach((assets, digitalTwinId) => {
        captureAssetsObj[digitalTwinId] = assets
      })

      localStorage.setItem("forj_capture_assets_v2", JSON.stringify(captureAssetsObj))
      localStorage.setItem("forj_previews", JSON.stringify(Array.from(this.previews.values())))
      localStorage.setItem("forj_vtg_jobs", JSON.stringify(Array.from(this.vtgJobs.values())))
      localStorage.setItem("forj_visual_assets", JSON.stringify(Array.from(this.visualAssets.values())))
      localStorage.setItem("forj_licenses", JSON.stringify(Array.from(this.licenses.values())))
    } catch (error) {
      systemLogger?.error("Failed to save Phase 2 data to storage", "Phase2Store", error as Error)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Dados de demonstração
  // ────────────────────────────────────────────────────────────────────────────

  private initializeDemoData(): void {
    if (this.captureAssets.size > 0) return

    const demoDigitalTwinId = "DTW-2024-001-A7X9"
    const demoCaptureAssets: CaptureAsset[] = []

    const angles = [
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
    ]

    for (let i = 0; i < 72; i++) {
      const angle = i < 16 ? angles[i] : `angle-${i + 1}`
      demoCaptureAssets.push({
        id: `cap_${i.toString().padStart(3, "0")}`,
        forgeId: "frg_001",
        digitalTwinId: demoDigitalTwinId,
        type: "PHOTO",
        stage: "NORMALIZED",
        angle,
        fileName: `capture_${angle}.jpg`,
        fileUrl: `/placeholder.svg?height=800&width=600&query=professional headshot ${angle} angle`,
        fileSize: 2048000 + Math.floor(Math.random() * 500000),
        mimeType: "image/jpeg",
        resolution: { width: 4000, height: 6000 },
        status: "VALID",
        uploadedAt: new Date("2024-12-10"),
      })
    }

    this.captureAssets.set(demoDigitalTwinId, demoCaptureAssets)

    // Demo preview
    const demoPreview: VisualTwinPreview = {
      id: "vtp_001",
      digitalTwinId: demoDigitalTwinId,
      generatedBy: "usr_op_001",
      previewType: "NEUTRAL_PORTRAIT",
      imageUrl: "/professional-ai-generated-portrait-preview-waterma.jpg",
      watermarked: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date("2024-12-18"),
      status: "ACTIVE",
    }
    this.previews.set(demoPreview.id, demoPreview)

    // Demo license
    const demoLicense: License = {
      id: "lic_001",
      digitalTwinId: demoDigitalTwinId,
      clientId: "client_001",
      usageType: "COMMERCIAL",
      territory: ["US", "EU", "UK"],
      validFrom: new Date("2024-12-15"),
      validUntil: new Date("2025-12-15"),
      status: "ACTIVE",
      maxDownloads: 100,
      currentDownloads: 5,
      createdBy: "usr_admin_001",
      createdAt: new Date("2024-12-15"),
    }
    this.licenses.set(demoLicense.id, demoLicense)

    // Demo visual assets
    const demoAssets: VisualAsset[] = [
      {
        id: "vas_001",
        digitalTwinId: demoDigitalTwinId,
        vtgJobId: "vtg_job_001",
        type: "LICENSED",
        category: "NEUTRAL_PORTRAIT",
        fileUrl: "/professional-ai-generated-portrait-high-resolution.jpg",
        hash: generateAssetHash("vas_001_DTW-2024-001-A7X9"),
        licenseId: "lic_001",
        watermarked: false,
        certificateId: "cert_001",
        metadata: {
          resolution: { width: 4096, height: 3072 },
          format: "PNG",
          size: 15728640,
        },
        createdAt: new Date("2024-12-16"),
      },
      {
        id: "vas_002",
        digitalTwinId: demoDigitalTwinId,
        vtgJobId: "vtg_job_002",
        type: "LICENSED",
        category: "LIGHT_LIFESTYLE",
        fileUrl: "/lifestyle-portrait-natural-lighting.jpg",
        hash: generateAssetHash("vas_002_DTW-2024-001-A7X9"),
        licenseId: "lic_001",
        watermarked: false,
        certificateId: "cert_001",
        metadata: {
          resolution: { width: 4096, height: 3072 },
          format: "PNG",
          size: 14680064,
        },
        createdAt: new Date("2024-12-17"),
      },
    ]
    demoAssets.forEach((a) => this.visualAssets.set(a.id, a))

    this.saveToStorage()
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Expiração automática
  // ────────────────────────────────────────────────────────────────────────────

  private startExpirationChecker(): void {
    if (typeof window === "undefined" || this.expirationIntervalId) return

    this.expirationIntervalId = setInterval(() => {
      const now = new Date()
      let changed = false

      this.previews.forEach((preview) => {
        if (preview.status === "ACTIVE" && preview.expiresAt < now) {
          preview.status = "EXPIRED"
          changed = true
          this.addAuditLog({
            userId: "SYSTEM",
            userName: "System",
            action: "PREVIEW_EXPIRED",
            entityType: "VisualTwinPreview",
            entityId: preview.id,
            digitalTwinId: preview.digitalTwinId,
          })
        }
      })

      this.licenses.forEach((license) => {
        if (license.status === "ACTIVE" && license.validUntil < now) {
          license.status = "EXPIRED"
          changed = true
          this.addAuditLog({
            userId: "SYSTEM",
            userName: "System",
            action: "LICENSE_EXPIRED",
            entityType: "License",
            entityId: license.id,
            digitalTwinId: license.digitalTwinId,
          })
        }
      })

      if (changed) this.saveToStorage()
    }, 60000)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Métodos de Capture Assets
  // ────────────────────────────────────────────────────────────────────────────

  getCaptureAssets(digitalTwinId: string): CaptureAsset[] {
    return this.captureAssets.get(digitalTwinId) || []
  }

  getCaptureAssetsByForge(forgeId: string): CaptureAsset[] {
    const allAssets: CaptureAsset[] = []
    this.captureAssets.forEach((assets) => {
      assets.filter((a) => a.forgeId === forgeId).forEach((a) => allAssets.push(a))
    })
    return allAssets
  }

  getCaptureAssetsByStage(digitalTwinId: string, stage: CaptureStage): CaptureAsset[] {
    const assets = this.captureAssets.get(digitalTwinId) || []
    return assets.filter((a) => a.stage === stage)
  }

  getCaptureStats(digitalTwinId: string): {
    total: number
    captureStage: number
    normalizedStage: number
    valid: number
    invalid: number
    missing: number
  } {
    const assets = this.getCaptureAssets(digitalTwinId)
    return {
      total: assets.length,
      captureStage: assets.filter((a) => a.stage === "CAPTURE").length,
      normalizedStage: assets.filter((a) => a.stage === "NORMALIZED").length,
      valid: assets.filter((a) => a.status === "VALID").length,
      invalid: assets.filter((a) => a.status === "INVALID").length,
      missing: 72 - assets.length,
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Previews
  // ────────────────────────────────────────────────────────────────────────────

  generatePreview(digitalTwinId: string, previewType: PreviewType, generatedBy: string): VisualTwinPreview {
    const preview: VisualTwinPreview = {
      id: `vtp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      digitalTwinId,
      generatedBy,
      previewType,
      imageUrl: `/placeholder.svg?height=1024&width=768&query=${previewType
        .toLowerCase()
        .replace(/_/g, " ")} AI portrait preview watermarked`,
      watermarked: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      status: "ACTIVE",
    }

    this.previews.set(preview.id, preview)
    this.saveToStorage()

    this.addAuditLog({
      userId: generatedBy,
      userName: "User",
      action: "PREVIEW_GENERATED",
      entityType: "VisualTwinPreview",
      entityId: preview.id,
      digitalTwinId,
      metadata: { previewType },
    })

    return preview
  }

  getPreview(id: string): VisualTwinPreview | undefined {
    return this.previews.get(id)
  }

  getPreviewsByDigitalTwin(digitalTwinId: string): VisualTwinPreview[] {
    return Array.from(this.previews.values())
      .filter((p) => p.digitalTwinId === digitalTwinId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getActivePreviews(): VisualTwinPreview[] {
    return Array.from(this.previews.values())
      .filter((p) => p.status === "ACTIVE")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  deletePreview(id: string): boolean {
    const preview = this.previews.get(id)
    if (!preview) return false
    preview.status = "DELETED"
    this.saveToStorage()
    return true
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VTG Jobs
  // ────────────────────────────────────────────────────────────────────────────

  createVTGJob(
    digitalTwinId: string,
    mode: VTGMode,
    category: VTGCategory,
    createdBy: string,
    planType: "BASIC" | "HYBRID" | "ENTERPRISE",
  ): VTGJob {
    if (mode === "PREVIEW") {
      const allowed: VTGCategory[] = ["NEUTRAL_PORTRAIT", "LIGHT_LIFESTYLE", "SIMPLE_EDITORIAL"]
      if (!allowed.includes(category)) {
        throw new Error(
          "Invalid category for PREVIEW mode. Only NEUTRAL_PORTRAIT, LIGHT_LIFESTYLE, SIMPLE_EDITORIAL allowed."
        )
      }
    }

    const priority = planType === "ENTERPRISE" ? 3 : planType === "HYBRID" ? 2 : 1

    const job: VTGJob = {
      id: `vtg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      digitalTwinId,
      mode,
      category,
      status: "QUEUED",
      priority,
      createdBy,
      createdAt: new Date(),
    }

    this.vtgJobs.set(job.id, job)
    this.saveToStorage()

    this.addAuditLog({
      userId: createdBy,
      userName: "User",
      action: "VTG_JOB_CREATED",
      entityType: "VTGJob",
      entityId: job.id,
      digitalTwinId,
      metadata: { mode, category, priority },
    })

    this.processVTGJob(job.id)

    return job
  }

  private async processVTGJob(jobId: string) {
    const job = this.vtgJobs.get(jobId)
    if (!job) return

    job.status = "PROCESSING"
    this.saveToStorage()

    const delay = (4 - job.priority) * 1000
    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      if (job.mode === "PREVIEW") {
        const preview = this.generatePreview(job.digitalTwinId, job.category as PreviewType, job.createdBy)
        job.result = { previewId: preview.id }
      } else {
        const asset = this.createVisualAsset(job)
        job.result = { assetId: asset.id }
      }

      job.status = "DONE"
      job.completedAt = new Date()
    } catch (err) {
      job.status = "FAILED"
      systemLogger?.error("VTG job processing failed", "Phase2Store", err as Error)
    }

    this.saveToStorage()

    this.addAuditLog({
      userId: job.createdBy,
      userName: "User",
      action: job.status === "DONE" ? "VTG_JOB_COMPLETED" : "VTG_JOB_FAILED",
      entityType: "VTGJob",
      entityId: job.id,
      digitalTwinId: job.digitalTwinId,
      metadata: job.result ? { result: job.result } : undefined,
    })
  }

  getVTGJob(id: string): VTGJob | undefined {
    return this.vtgJobs.get(id)
  }

  getVTGJobsByDigitalTwin(digitalTwinId: string): VTGJob[] {
    return Array.from(this.vtgJobs.values())
      .filter((j) => j.digitalTwinId === digitalTwinId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getVTGJobsByStatus(status: VTGJobStatus): VTGJob[] {
    return Array.from(this.vtgJobs.values())
      .filter((j) => j.status === status)
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime())
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Visual Assets
  // ────────────────────────────────────────────────────────────────────────────

  private createVisualAsset(job: VTGJob): VisualAsset {
    const asset: VisualAsset = {
      id: `vas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      digitalTwinId: job.digitalTwinId,
      vtgJobId: job.id,
      type: job.mode === "PREVIEW" ? "PREVIEW" : "LICENSED",
      category: job.category,
      fileUrl: `/placeholder.svg?height=2048&width=1536&query=${job.category.toLowerCase().replace(/_/g, " ")} professional AI portrait`,
      hash: generateAssetHash(`${job.id}_${job.digitalTwinId}_${Date.now()}`),
      watermarked: job.mode === "PREVIEW",
      metadata: {
        resolution: { width: 4096, height: 3072 },
        format: "PNG",
        size: 15728640,
      },
      createdAt: new Date(),
    }

    this.visualAssets.set(asset.id, asset)
    this.saveToStorage()

    this.addAuditLog({
      userId: job.createdBy,
      userName: "User",
      action: "ASSET_CREATED",
      entityType: "VisualAsset",
      entityId: asset.id,
      digitalTwinId: job.digitalTwinId,
      metadata: { type: asset.type, category: asset.category },
    })

    return asset
  }

  getVisualAsset(id: string): VisualAsset | undefined {
    return this.visualAssets.get(id)
  }

  getVisualAssetsByDigitalTwin(digitalTwinId: string, type?: "PREVIEW" | "LICENSED"): VisualAsset[] {
    return Array.from(this.visualAssets.values())
      .filter((a) => a.digitalTwinId === digitalTwinId && (!type || a.type === type))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getLicensedAssets(digitalTwinId: string, licenseId?: string): VisualAsset[] {
    return Array.from(this.visualAssets.values())
      .filter(
        (a) => a.digitalTwinId === digitalTwinId && a.type === "LICENSED" && (!licenseId || a.licenseId === licenseId)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  recordAssetDownload(assetId: string, userId: string, userName: string): boolean {
    const asset = this.visualAssets.get(assetId)
    if (!asset || asset.type !== "LICENSED") return false

    if (asset.licenseId) {
      const license = this.licenses.get(asset.licenseId)
      if (!license || license.status !== "ACTIVE") return false
      if (license.maxDownloads && license.currentDownloads >= license.maxDownloads) {
        return false
      }
      license.currentDownloads++
      this.saveToStorage()
    }

    this.addAuditLog({
      userId,
      userName,
      action: "ASSET_DOWNLOADED",
      entityType: "VisualAsset",
      entityId: assetId,
      digitalTwinId: asset.digitalTwinId,
    })

    return true
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Licenses
  // ────────────────────────────────────────────────────────────────────────────

  createLicense(
    digitalTwinId: string,
    clientId: string,
    usageType: LicenseUsageType,
    territory: string[],
    validFrom: Date,
    validUntil: Date,
    createdBy: string,
    maxDownloads?: number,
  ): License {
    const license: License = {
      id: `lic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      digitalTwinId,
      clientId,
      usageType,
      territory,
      validFrom,
      validUntil,
      status: "ACTIVE",
      maxDownloads,
      currentDownloads: 0,
      createdBy,
      createdAt: new Date(),
    }

    this.licenses.set(license.id, license)
    this.saveToStorage()

    this.addAuditLog({
      userId: createdBy,
      userName: "User",
      action: "LICENSE_ACTIVATED",
      entityType: "License",
      entityId: license.id,
      digitalTwinId,
      metadata: { usageType, territory, validUntil: validUntil.toISOString() },
    })

    return license
  }

  getLicense(id: string): License | undefined {
    return this.licenses.get(id)
  }

  getLicensesByDigitalTwin(digitalTwinId: string): License[] {
    return Array.from(this.licenses.values())
      .filter((l) => l.digitalTwinId === digitalTwinId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getLicensesByClient(clientId: string): License[] {
    return Array.from(this.licenses.values())
      .filter((l) => l.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getActiveLicenses(): License[] {
    return Array.from(this.licenses.values())
      .filter((l) => l.status === "ACTIVE")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  revokeLicense(id: string, reason: string, revokedBy: string): boolean {
    const license = this.licenses.get(id)
    if (!license || license.status !== "ACTIVE") return false

    license.status = "REVOKED"
    license.revokedAt = new Date()
    license.revokedReason = reason
    this.saveToStorage()

    this.addAuditLog({
      userId: revokedBy,
      userName: "User",
      action: "LICENSE_REVOKED",
      entityType: "License",
      entityId: id,
      digitalTwinId: license.digitalTwinId,
      metadata: { reason },
    })

    return true
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Audit Logging
  // ────────────────────────────────────────────────────────────────────────────

  private addAuditLog(log: Omit<AuditLog, "id" | "timestamp" | "integrityHash" | "previousLogHash">) {
    const timestamp = new Date()
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
    }

    const logs = JSON.parse(localStorage.getItem("forj_audit_logs") || "[]")
    logs.push(newLog)
    localStorage.setItem("forj_audit_logs", JSON.stringify(logs))
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Estatísticas gerais
  // ────────────────────────────────────────────────────────────────────────────

  getStats() {
    return {
      captureAssets: {
        total: Array.from(this.captureAssets.values()).reduce((sum, assets) => sum + assets.length, 0),
        digitalTwins: this.captureAssets.size,
      },
      previews: {
        total: this.previews.size,
        active: Array.from(this.previews.values()).filter((p) => p.status === "ACTIVE").length,
        expired: Array.from(this.previews.values()).filter((p) => p.status === "EXPIRED").length,
      },
      vtgJobs: {
        total: this.vtgJobs.size,
        queued: Array.from(this.vtgJobs.values()).filter((j) => j.status === "QUEUED").length,
        processing: Array.from(this.vtgJobs.values()).filter((j) => j.status === "PROCESSING").length,
        done: Array.from(this.vtgJobs.values()).filter((j) => j.status === "DONE").length,
        failed: Array.from(this.vtgJobs.values()).filter((j) => j.status === "FAILED").length,
      },
      visualAssets: {
        total: this.visualAssets.size,
        previews: Array.from(this.visualAssets.values()).filter((a) => a.type === "PREVIEW").length,
        licensed: Array.from(this.visualAssets.values()).filter((a) => a.type === "LICENSED").length,
      },
      licenses: {
        total: this.licenses.size,
        active: Array.from(this.licenses.values()).filter((l) => l.status === "ACTIVE").length,
        expired: Array.from(this.licenses.values()).filter((l) => l.status === "EXPIRED").length,
        revoked: Array.from(this.licenses.values()).filter((l) => l.status === "REVOKED").length,
      },
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Limpeza (recomendado chamar em logout / unmount se possível)
  // ────────────────────────────────────────────────────────────────────────────

  public destroy(): void {
    if (this.expirationIntervalId) {
      clearInterval(this.expirationIntervalId)
      this.expirationIntervalId = null
    }
  }
}

// Singleton com segurança para SSR
let phase2StoreInstance: Phase2Store | null = null

export const phase2Store: Phase2Store =
  typeof window !== "undefined"
    ? phase2StoreInstance || (phase2StoreInstance = new Phase2Store())
    : (null as unknown as Phase2Store)

// Limpeza automática ao fechar aba/janela (opcional, mas ajuda em dev)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    phase2Store?.destroy?.()
  })
}
