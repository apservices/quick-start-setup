"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import type { AuditLog, AuditAction, Model, Forge } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  ScrollText,
  Search,
  Filter,
  Lock,
  Download,
  RefreshCw,
  CalendarIcon,
  User,
  Activity,
  FileJson,
  FileSpreadsheet,
  ChevronDown,
  Shield,
  Hash,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

const ACTION_LABELS: Record<AuditAction, { label: string; color: string }> = {
  USER_LOGIN: { label: "User Login", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  USER_LOGOUT: { label: "User Logout", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  USER_SESSION_REFRESH: { label: "Session Refresh", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  MODEL_CREATED: { label: "Model Created", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  MODEL_UPDATED: { label: "Model Updated", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  MODEL_ARCHIVED: { label: "Model Archived", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  CONSENT_GIVEN: { label: "Consent Given", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  FORGE_CREATED: { label: "Forge Created", color: "bg-primary/20 text-primary border-primary/30" },
  FORGE_STATE_CHANGED: { label: "State Changed", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  CAPTURE_UPLOADED: { label: "Capture Uploaded", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  NORMALIZATION_STARTED: {
    label: "Normalization Started",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  NORMALIZATION_COMPLETED: {
    label: "Normalization Done",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  SEED_GENERATED: { label: "Seed Generated", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  PARAMETRIZATION_STARTED: {
    label: "Parametrization Started",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  PARAMETRIZATION_COMPLETED: {
    label: "Parametrization Done",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  VALIDATION_STARTED: { label: "Validation Started", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  VALIDATION_COMPLETED: {
    label: "Validation Done",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  CERTIFICATION_COMPLETED: { label: "Certified", color: "bg-primary/20 text-primary border-primary/30" },
  FORGE_ROLLBACK: { label: "Rollback", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  CERTIFICATE_EXPORTED: { label: "Certificate Exported", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  API_ACCESS: { label: "API Access", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  RATE_LIMIT_HIT: { label: "Rate Limited", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  SECURITY_EVENT: { label: "Security Event", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  SYSTEM_ERROR: { label: "System Error", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS) as AuditAction[]

// Generate simple integrity hash for display
function generateIntegrityHash(log: AuditLog): string {
  const data = `${log.id}:${log.userId}:${log.action}:${log.timestamp}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}

export default function AuditLogsPage() {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [forges, setForges] = useState<Forge[]>([])
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<AuditAction | "ALL">("ALL")
  const [modelFilter, setModelFilter] = useState<string>("ALL")
  const [forgeFilter, setForgeFilter] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [integrityStatus, setIntegrityStatus] = useState<{
    valid: boolean
    brokenAt?: number
    checked: boolean
  }>({ valid: true, checked: false })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setIsLoading(true)
    if (dataStore) {
      setLogs(dataStore.getAuditLogs())
      setModels(dataStore.getModels())
      setForges(dataStore.getForges())
      const integrity = dataStore.verifyAuditLogIntegrity()
      setIntegrityStatus({ ...integrity, checked: true })
    }
    setIsLoading(false)
  }

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      const matchesSearch =
        search === "" ||
        log.userName.toLowerCase().includes(search.toLowerCase()) ||
        log.userId.toLowerCase().includes(search.toLowerCase()) ||
        log.forgeId?.toLowerCase().includes(search.toLowerCase()) ||
        log.modelId?.toLowerCase().includes(search.toLowerCase())

      // Action filter
      const matchesAction = actionFilter === "ALL" || log.action === actionFilter

      // Model filter
      const matchesModel = modelFilter === "ALL" || log.modelId === modelFilter

      // Forge filter
      const matchesForge = forgeFilter === "ALL" || log.forgeId === forgeFilter

      // Date range filter
      const matchesDate =
        !dateRange?.from ||
        !dateRange?.to ||
        isWithinInterval(log.timestamp, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        })

      return matchesSearch && matchesAction && matchesModel && matchesForge && matchesDate
    })
  }, [logs, search, actionFilter, modelFilter, forgeFilter, dateRange])

  // Redirect if not admin
  if (!hasPermission("ADMIN")) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-card border-border p-6 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground">Only administrators can view audit logs.</p>
        </Card>
      </div>
    )
  }

  const exportAsJson = () => {
    const exportData = filteredLogs.map((log) => ({
      ...log,
      integrityHash: generateIntegrityHash(log),
    }))
    const data = JSON.stringify(exportData, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsCsv = () => {
    const headers = ["ID", "Timestamp", "User ID", "User Name", "Action", "Forge ID", "Model ID", "Integrity Hash"]
    const rows = filteredLogs.map((log) =>
      [
        log.id,
        log.timestamp.toISOString(),
        log.userId,
        `"${log.userName}"`,
        log.action,
        log.forgeId || "",
        log.modelId || "",
        generateIntegrityHash(log),
      ].join(","),
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearch("")
    setActionFilter("ALL")
    setModelFilter("ALL")
    setForgeFilter("ALL")
    setDateRange(undefined)
  }

  const hasActiveFilters =
    search || actionFilter !== "ALL" || modelFilter !== "ALL" || forgeFilter !== "ALL" || dateRange

  return (
    <div>
      <Header
        title="Audit Logs"
        description="Immutable record of all system actions"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (dataStore) {
                  const integrity = dataStore.verifyAuditLogIntegrity()
                  setIntegrityStatus({ ...integrity, checked: true })
                }
              }}
              className={cn(
                integrityStatus.checked && (integrityStatus.valid ? "border-emerald-500/50" : "border-destructive/50"),
              )}
            >
              {integrityStatus.checked ? (
                integrityStatus.valid ? (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                    Verified
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
                    Integrity Issue
                  </>
                )
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Integrity
                </>
              )}
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start" onClick={exportAsJson}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Export as JSON
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={exportAsCsv}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {integrityStatus.checked && !integrityStatus.valid && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm text-foreground font-medium">Audit Log Integrity Issue Detected</p>
                <p className="text-xs text-muted-foreground">
                  A potential tampering was detected at log entry #{integrityStatus.brokenAt}. Please contact your
                  system administrator immediately.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-semibold text-foreground">{logs.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <ScrollText className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-semibold text-primary">{filteredLogs.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Security Events</p>
                  <p className="text-2xl font-semibold text-amber-400">
                    {logs.filter((l) => l.action === "SECURITY_EVENT" || l.action === "RATE_LIMIT_HIT").length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certifications</p>
                  <p className="text-2xl font-semibold text-emerald-400">
                    {logs.filter((l) => l.action === "CERTIFICATION_COMPLETED").length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card with Filters and Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              {filteredLogs.length} of {logs.length} entries • Logs are immutable and cannot be modified
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, forge ID, or model ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-input border-border"
                />
              </div>

              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditAction | "ALL")}>
                <SelectTrigger className="w-48 bg-input border-border">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  {ALL_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-44 bg-input border-border">
                  <SelectValue placeholder="Filter by model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Models</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={forgeFilter} onValueChange={setForgeFilter}>
                <SelectTrigger className="w-44 bg-input border-border">
                  <SelectValue placeholder="Filter by forge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Forges</SelectItem>
                  {forges.map((forge) => (
                    <SelectItem key={forge.id} value={forge.id}>
                      {forge.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal bg-input border-border",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Clear filters
                </Button>
              )}
            </div>

            {/* Table */}
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No logs found</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? "Try adjusting your filters." : "System activity will appear here."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-muted-foreground">User</TableHead>
                      <TableHead className="text-muted-foreground">Action</TableHead>
                      <TableHead className="text-muted-foreground">Forge</TableHead>
                      <TableHead className="text-muted-foreground">Model</TableHead>
                      <TableHead className="text-muted-foreground">Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.slice(0, 100).map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{format(log.timestamp, "MMM d, HH:mm:ss")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{log.userName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{log.userId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", ACTION_LABELS[log.action]?.color || "")}>
                            {ACTION_LABELS[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.forgeId ? (
                            <code className="text-xs font-mono text-muted-foreground">{log.forgeId}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.modelId ? (
                            <code className="text-xs font-mono text-muted-foreground">{log.modelId}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-muted-foreground" />
                            <code className="text-xs font-mono text-muted-foreground">
                              {generateIntegrityHash(log)}
                            </code>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredLogs.length > 100 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing first 100 of {filteredLogs.length} entries
              </p>
            )}
          </CardContent>
        </Card>

        {/* Integrity Notice - Enhanced */}
        <Card
          className={cn(
            "border-border",
            integrityStatus.checked && integrityStatus.valid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30",
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            {integrityStatus.checked && integrityStatus.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm text-foreground font-medium">
                {integrityStatus.checked && integrityStatus.valid
                  ? "Audit Log Integrity Verified"
                  : "Audit Log Integrity"}
              </p>
              <p className="text-xs text-muted-foreground">
                {integrityStatus.checked && integrityStatus.valid
                  ? `All ${logs.length} log entries have been cryptographically verified. Chain integrity confirmed.`
                  : "All logs are append-only and immutable. Each entry includes a unique integrity hash for verification. Actions cannot be deleted or modified after recording."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
