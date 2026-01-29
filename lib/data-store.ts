"use client"

import { type Model, type Forge, type AuditLog, type CaptureAsset, type ForgeState, FORGE_STATES } from "./types"
import { ForgeStateMachine } from "./forge-state-machine"
import { validateModelName, validateInternalId, sanitizeString } from "./validation"
import { systemLogger } from "./system-logger"

// Generate integrity hash for audit logs
function generateIntegrityHash(data: string, previousHash?: string): string {
  const input = previousHash ? `${previousHash}:${data}` : data
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(16, "0")
}

// Client-side data store with enhanced validation and security
class DataStore {
  private models: Map<string, Model> = new Map()
  private forges: Map<string, Forge> = new Map()
  private captureAssets: Map<string, CaptureAsset[]> = new Map()
  private lastAuditLogHash = ""

  constructor() {
    this.loadFromStorage()
    this.initializeDemoData()
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return

    try {
      const models = localStorage.getItem("atlas_models")
      const forges = localStorage.getItem("atlas_forges")
      const assets = localStorage.getItem("atlas_assets")
      const lastHash = localStorage.getItem("atlas_last_audit_hash")

      if (models) {
        const parsed = JSON.parse(models)
        parsed.forEach((m: Model) =>
          this.models.set(m.id, {
            ...m,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
            consentDate: m.consentDate ? new Date(m.consentDate) : undefined,
          }),
        )
      }

      if (forges) {
        const parsed = JSON.parse(forges)
        parsed.forEach((f: Forge) =>
          this.forges.set(f.id, {
            ...f,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
            certifiedAt: f.certifiedAt ? new Date(f.certifiedAt) : undefined,
          }),
        )
      }

      if (assets) {
        const parsed = JSON.parse(assets)
        Object.entries(parsed).forEach(([forgeId, assetList]) => {
          this.captureAssets.set(
            forgeId,
            (assetList as CaptureAsset[]).map((a) => ({
              ...a,
              uploadedAt: new Date(a.uploadedAt),
            })),
          )
        })
      }

      if (lastHash) {
        this.lastAuditLogHash = lastHash
      }
    } catch (error) {
      systemLogger?.error("Failed to load data from storage", "DataStore", error as Error)
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("atlas_models", JSON.stringify(Array.from(this.models.values())))
      localStorage.setItem("atlas_forges", JSON.stringify(Array.from(this.forges.values())))
      localStorage.setItem("atlas_last_audit_hash", this.lastAuditLogHash)

      const assetsObj: Record<string, CaptureAsset[]> = {}
      this.captureAssets.forEach((assets, forgeId) => {
        assetsObj[forgeId] = assets
      })
      localStorage.setItem("atlas_assets", JSON.stringify(assetsObj))
    } catch (error) {
      systemLogger?.error("Failed to save data to storage", "DataStore", error as Error)
    }
  }

  private initializeDemoData() {
    if (this.models.size > 0) return

    // Demo models
    const demoModels: Model[] = [
      {
        id: "mdl_001",
        name: "John Mitchell",
        internalId: "INT-2024-001",
        status: "ACTIVE",
        planType: "HYBRID",
        consentGiven: true,
        consentDate: new Date("2024-12-01"),
        createdAt: new Date("2024-11-28"),
        updatedAt: new Date("2024-12-15"),
        createdBy: "usr_admin_001",
      },
      {
        id: "mdl_002",
        name: "Sarah Chen",
        internalId: "INT-2024-002",
        status: "ACTIVE",
        planType: "DIGITAL",
        consentGiven: true,
        consentDate: new Date("2024-12-10"),
        createdAt: new Date("2024-12-05"),
        updatedAt: new Date("2024-12-20"),
        createdBy: "usr_admin_001",
      },
      {
        id: "mdl_003",
        name: "Marcus Webb",
        internalId: "INT-2024-003",
        status: "PENDING_CONSENT",
        planType: "PHYSICAL",
        consentGiven: false,
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
        createdBy: "usr_op_001",
      },
    ]

    // Demo forges
    const demoForges: Forge[] = [
      {
        id: "frg_001",
        modelId: "mdl_001",
        state: "CERTIFIED",
        version: 1,
        digitalTwinId: "DTW-2024-001-A7X9",
        seedHash: "sha256:8f14e45fceea167a5a36dedd4bea2543",
        captureProgress: 54,
        createdAt: new Date("2024-12-02"),
        updatedAt: new Date("2024-12-15"),
        certifiedAt: new Date("2024-12-15"),
        createdBy: "usr_admin_001",
      },
      {
        id: "frg_002",
        modelId: "mdl_002",
        state: "NORMALIZED",
        version: 1,
        captureProgress: 54,
        createdAt: new Date("2024-12-11"),
        updatedAt: new Date("2024-12-20"),
        createdBy: "usr_op_001",
      },
      {
        id: "frg_003",
        modelId: "mdl_001",
        state: "CAPTURED",
        version: 1,
        captureProgress: 54,
        createdAt: new Date("2025-01-05"),
        updatedAt: new Date("2025-01-10"),
        createdBy: "usr_op_001",
      },
    ]

    demoModels.forEach((m) => this.models.set(m.id, m))
    demoForges.forEach((f) => this.forges.set(f.id, f))
    this.saveToStorage()
  }

  // Model operations with validation
  getModels(): Model[] {
    return Array.from(this.models.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getModel(id: string): Model | undefined {
    if (!id || typeof id !== "string") return undefined
    return this.models.get(id)
  }

  createModel(data: Omit<Model, "id" | "createdAt" | "updatedAt">): Model {
    // Validate required fields
    const nameValidation = validateModelName(data.name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }

    if (data.internalId) {
      const idValidation = validateInternalId(data.internalId)
      if (!idValidation.valid) {
        throw new Error(idValidation.error)
      }
    }

    const model: Model = {
      ...data,
      name: sanitizeString(data.name, 100),
      internalId: data.internalId
        ? sanitizeString(data.internalId, 50)
        : `INT-${Date.now().toString(36).toUpperCase()}`,
      id: `mdl_${Date.now().toString(36)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.models.set(model.id, model)
    this.saveToStorage()

    systemLogger?.info("Model created", "DataStore", { modelId: model.id })
    return model
  }

  updateModel(id: string, data: Partial<Model>): Model | null {
    const model = this.models.get(id)
    if (!model) return null

    // Validate name if being updated
    if (data.name) {
      const nameValidation = validateModelName(data.name)
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error)
      }
      data.name = sanitizeString(data.name, 100)
    }

    const updated = { ...model, ...data, updatedAt: new Date() }
    this.models.set(id, updated)
    this.saveToStorage()

    systemLogger?.info("Model updated", "DataStore", { modelId: id })
    return updated
  }

  deleteModel(id: string): boolean {
    const deleted = this.models.delete(id)
    if (deleted) {
      this.saveToStorage()
      systemLogger?.info("Model deleted", "DataStore", { modelId: id })
    }
    return deleted
  }

  // Forge operations with strict state machine enforcement
  getForges(): Forge[] {
    return Array.from(this.forges.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getForge(id: string): Forge | undefined {
    if (!id || typeof id !== "string") return undefined
    return this.forges.get(id)
  }

  getForgesByModel(modelId: string): Forge[] {
    return Array.from(this.forges.values())
      .filter((f) => f.modelId === modelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  createForge(modelId: string, createdBy: string): Forge | null {
    const model = this.models.get(modelId)
    if (!model) {
      systemLogger?.warn("Attempted to create forge for non-existent model", "DataStore", { modelId })
      return null
    }

    if (!model.consentGiven) {
      systemLogger?.warn("Attempted to create forge without consent", "DataStore", { modelId })
      return null
    }

    const forge: Forge = {
      id: `frg_${Date.now().toString(36)}`,
      modelId,
      state: "CREATED",
      version: 1,
      captureProgress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    }
    this.forges.set(forge.id, forge)
    this.saveToStorage()

    systemLogger?.info("Forge created", "DataStore", { forgeId: forge.id, modelId })
    return forge
  }

  transitionForge(id: string, targetState: ForgeState): { success: boolean; error?: string; forge?: Forge } {
    const forge = this.forges.get(id)
    if (!forge) {
      return { success: false, error: "Forge not found" }
    }

    // Enforce read-only for certified forges
    if (forge.state === "CERTIFIED") {
      systemLogger?.warn("Attempted to modify certified forge", "DataStore", { forgeId: id })
      return { success: false, error: "Certified forges are read-only and cannot be modified" }
    }

    const stateMachine = new ForgeStateMachine(forge.state)
    const result = stateMachine.transition(targetState)

    if (!result.success) {
      systemLogger?.warn("Invalid forge state transition", "DataStore", {
        forgeId: id,
        fromState: forge.state,
        targetState,
        error: result.error,
      })
      return result
    }

    const updates: Partial<Forge> = {
      state: targetState,
      updatedAt: new Date(),
    }

    // Handle special state transitions
    if (targetState === "SEEDED" && !forge.seedHash) {
      updates.seedHash = `sha256:${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
    }

    if (targetState === "CERTIFIED") {
      const modelPart = forge.modelId.split("_")[1] || "000"
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase()
      updates.digitalTwinId = `DTW-${new Date().getFullYear()}-${modelPart}-${randomPart}`
      updates.certifiedAt = new Date()
    }

    const updated = { ...forge, ...updates }
    this.forges.set(id, updated)
    this.saveToStorage()

    systemLogger?.info("Forge state changed", "DataStore", {
      forgeId: id,
      fromState: forge.state,
      toState: targetState,
    })

    return { success: true, forge: updated }
  }

  updateForgeCapture(id: string, progress: number): Forge | null {
    const forge = this.forges.get(id)
    if (!forge) return null

    // Cannot modify certified forges
    if (forge.state === "CERTIFIED") {
      systemLogger?.warn("Attempted to update capture on certified forge", "DataStore", { forgeId: id })
      return null
    }

    const updated = {
      ...forge,
      captureProgress: Math.min(54, Math.max(0, progress)),
      updatedAt: new Date(),
    }
    this.forges.set(id, updated)
    this.saveToStorage()
    return updated
  }

  // Capture assets
  getCaptureAssets(forgeId: string): CaptureAsset[] {
    return this.captureAssets.get(forgeId) || []
  }

  addCaptureAsset(forgeId: string, asset: Omit<CaptureAsset, "id" | "uploadedAt">): CaptureAsset | null {
    const forge = this.forges.get(forgeId)
    if (!forge) return null

    // Cannot add assets to certified forges
    if (forge.state === "CERTIFIED") {
      systemLogger?.warn("Attempted to add capture asset to certified forge", "DataStore", { forgeId })
      return null
    }

    const newAsset: CaptureAsset = {
      ...asset,
      id: `ast_${Date.now().toString(36)}`,
      uploadedAt: new Date(),
    }

    const existing = this.captureAssets.get(forgeId) || []
    existing.push(newAsset)
    this.captureAssets.set(forgeId, existing)
    this.saveToStorage()

    return newAsset
  }

  // Immutable audit logs with integrity chain
  addAuditLog(log: Omit<AuditLog, "id" | "timestamp" | "integrityHash" | "previousLogHash">): AuditLog {
    const timestamp = new Date()
    const logData = `${log.userId}:${log.action}:${log.forgeId || ""}:${log.modelId || ""}:${timestamp.toISOString()}`
    const integrityHash = generateIntegrityHash(logData, this.lastAuditLogHash)

    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      integrityHash,
      previousLogHash: this.lastAuditLogHash || undefined,
    }

    const logs = JSON.parse(localStorage.getItem("atlas_audit_logs") || "[]")
    logs.push(newLog)
    localStorage.setItem("atlas_audit_logs", JSON.stringify(logs))

    // Update chain hash
    this.lastAuditLogHash = integrityHash
    localStorage.setItem("atlas_last_audit_hash", integrityHash)

    return newLog
  }

  getAuditLogs(): AuditLog[] {
    if (typeof window === "undefined") return []
    try {
      const logs = JSON.parse(localStorage.getItem("atlas_audit_logs") || "[]")
      return logs
        .map((l: AuditLog) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        }))
        .sort((a: AuditLog, b: AuditLog) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch {
      return []
    }
  }

  // Verify audit log integrity
  verifyAuditLogIntegrity(): { valid: boolean; brokenAt?: number } {
    const logs = this.getAuditLogs().reverse() // Oldest first
    let previousHash = ""

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      const logData = `${log.userId}:${log.action}:${log.forgeId || ""}:${log.modelId || ""}:${log.timestamp.toISOString()}`
      const expectedHash = generateIntegrityHash(logData, previousHash)

      if (log.integrityHash && log.integrityHash !== expectedHash) {
        return { valid: false, brokenAt: i }
      }

      previousHash = log.integrityHash || expectedHash
    }

    return { valid: true }
  }

  // Stats
  getStats() {
    const models = this.getModels()
    const forges = this.getForges()

    return {
      totalModels: models.length,
      activeModels: models.filter((m) => m.status === "ACTIVE").length,
      pendingConsent: models.filter((m) => m.status === "PENDING_CONSENT").length,
      totalForges: forges.length,
      certifiedForges: forges.filter((f) => f.state === "CERTIFIED").length,
      inProgressForges: forges.filter((f) => f.state !== "CERTIFIED").length,
      forgesByState: FORGE_STATES.reduce(
        (acc, state) => {
          acc[state] = forges.filter((f) => f.state === state).length
          return acc
        },
        {} as Record<ForgeState, number>,
      ),
    }
  }
}

// Singleton pattern with null safety for SSR
let dataStoreInstance: DataStore | null = null

export const dataStore: DataStore =
  typeof window !== "undefined"
    ? dataStoreInstance || (dataStoreInstance = new DataStore())
    : (null as unknown as DataStore)
