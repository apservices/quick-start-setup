// Centralized logging system for observability
import type { SystemHealth } from "./types"

export type { SystemHealth } from "./types"

export type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  id: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: Date
  source: string
  errorStack?: string
}

class SystemLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private errorCount = 0
  private errorWindow: number[] = []

  constructor() {
    // Security: do not persist logs in localStorage.
  }

  private saveToStorage() {}

  private createEntry(
    level: LogLevel,
    message: string,
    source: string,
    context?: Record<string, unknown>,
    errorStack?: string,
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      context,
      timestamp: new Date(),
      source,
      errorStack,
    }
  }

  debug(message: string, source: string, context?: Record<string, unknown>) {
    const entry = this.createEntry("debug", message, source, context)
    this.logs.push(entry)
    console.debug(`[${source}]`, message, context || "")
  }

  info(message: string, source: string, context?: Record<string, unknown>) {
    const entry = this.createEntry("info", message, source, context)
    this.logs.push(entry)
    console.info(`[${source}]`, message, context || "")
  }

  warn(message: string, source: string, context?: Record<string, unknown>) {
    const entry = this.createEntry("warn", message, source, context)
    this.logs.push(entry)
    console.warn(`[${source}]`, message, context || "")
  }

  error(message: string, source: string, error?: Error, context?: Record<string, unknown>) {
    const entry = this.createEntry("error", message, source, context, error?.stack)
    this.logs.push(entry)

    // Track error rate
    this.errorWindow.push(Date.now())
    this.errorWindow = this.errorWindow.filter((t) => Date.now() - t < 60000)
    this.errorCount = this.errorWindow.length

    console.error(`[${source}]`, message, error, context || "")
  }

  // Get recent logs
  getLogs(options?: {
    level?: LogLevel
    source?: string
    limit?: number
    since?: Date
  }): LogEntry[] {
    let filtered = [...this.logs]

    if (options?.level) {
      const levels: LogLevel[] = ["debug", "info", "warn", "error"]
      const minLevel = levels.indexOf(options.level)
      filtered = filtered.filter((l) => levels.indexOf(l.level) >= minLevel)
    }

    if (options?.source) {
      filtered = filtered.filter((l) => l.source === options.source)
    }

    if (options?.since) {
      filtered = filtered.filter((l) => l.timestamp >= options.since!)
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  // Get error rate (errors per minute)
  getErrorRate(): number {
    return this.errorCount
  }

  // Clear old logs
  clearOldLogs(olderThan: Date) {
    this.logs = this.logs.filter((l) => l.timestamp >= olderThan)
  }

  // Export logs
  exportLogs(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      const headers = ["id", "level", "message", "source", "timestamp"]
      const rows = this.logs.map((l) =>
        [l.id, l.level, `"${l.message}"`, l.source, l.timestamp.toISOString()].join(","),
      )
      return [headers.join(","), ...rows].join("\n")
    }
    return JSON.stringify(this.logs, null, 2)
  }
}

export const systemLogger = typeof window !== "undefined" ? new SystemLogger() : (null as unknown as SystemLogger)

// System health checker
export function getSystemHealth(): SystemHealth {
  const errorRate = systemLogger?.getErrorRate() || 0

  // Simulate service checks (in production, these would be real health checks)
  const services = {
    database: "up" as const,
    storage: "up" as const,
    processing: "up" as const,
    certification: "up" as const,
    vtg: "up" as const,
  }

  // Determine overall status
  let status: SystemHealth["status"] = "healthy"
  if (errorRate > 10) status = "unhealthy"
  else if (errorRate > 5) status = "degraded"

  // Metrics are kept minimal and computed in-memory.
  let metrics = {
    totalForges: 0,
    certifiedForges: 0,
    activeModels: 0,
    pendingValidations: 0,
    activePreviews: 0,
    activeLicenses: 0,
    errorRate,
  }

  return {
    status,
    timestamp: new Date(),
    services,
    metrics,
  }
}
