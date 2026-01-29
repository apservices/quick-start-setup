"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { systemLogger, getSystemHealth, type LogLevel } from "@/lib/system-logger"
import { systemConfig } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Info,
  Lock,
  RefreshCw,
  Server,
  Settings,
  XCircle,
  Bug,
  Shield,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const LOG_LEVEL_STYLES: Record<LogLevel, { icon: typeof Info; color: string }> = {
  debug: { icon: Bug, color: "text-zinc-400" },
  info: { icon: Info, color: "text-blue-400" },
  warn: { icon: AlertTriangle, color: "text-amber-400" },
  error: { icon: XCircle, color: "text-rose-400" },
}

export default function SystemLogsPage() {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<ReturnType<typeof systemLogger.getLogs>>([])
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all")
  const [health, setHealth] = useState(getSystemHealth())

  useEffect(() => {
    loadLogs()
    const interval = setInterval(() => {
      setHealth(getSystemHealth())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadLogs = () => {
    if (systemLogger) {
      setLogs(
        systemLogger.getLogs({
          level: levelFilter === "all" ? undefined : levelFilter,
          limit: 200,
        }),
      )
    }
    setHealth(getSystemHealth())
  }

  useEffect(() => {
    loadLogs()
  }, [levelFilter])

  if (!hasPermission("ADMIN")) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-card border-border p-6 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground">Only administrators can view system logs.</p>
        </Card>
      </div>
    )
  }

  const exportLogs = () => {
    if (!systemLogger) return
    const data = systemLogger.exportLogs("json")
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `system-logs-${format(new Date(), "yyyy-MM-dd")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header
        title="System Logs"
        description="Centralized logging and system observability"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Status</p>
                  <p
                    className={cn(
                      "text-lg font-semibold capitalize",
                      health.status === "healthy"
                        ? "text-emerald-400"
                        : health.status === "degraded"
                          ? "text-amber-400"
                          : "text-rose-400",
                    )}
                  >
                    {health.status}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    health.status === "healthy"
                      ? "bg-emerald-500/10"
                      : health.status === "degraded"
                        ? "bg-amber-500/10"
                        : "bg-rose-500/10",
                  )}
                >
                  {health.status === "healthy" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : health.status === "degraded" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-lg font-semibold text-foreground">{health.metrics.errorRate}/min</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Environment</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{systemConfig.environment}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Server className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limit</p>
                  <p className="text-lg font-semibold text-foreground">{systemConfig.apiRateLimit}/min</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Server className="w-5 h-5" />
              Service Health
            </CardTitle>
            <CardDescription>Current status of system services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(health.services).map(([service, status]) => (
                <div
                  key={service}
                  className={cn(
                    "p-3 rounded-lg border",
                    status === "up" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize text-foreground">{service}</span>
                    {status === "up" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <p className={cn("text-xs mt-1", status === "up" ? "text-emerald-400" : "text-rose-400")}>
                    {status === "up" ? "Operational" : "Down"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Configuration
            </CardTitle>
            <CardDescription>Current feature flag status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(systemConfig.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-foreground">
                    {feature
                      .replace(/([A-Z])/g, " $1")
                      .trim()
                      .replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      enabled
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
                    )}
                  >
                    {enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Logs
            </CardTitle>
            <CardDescription>{logs.length} log entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | "all")}>
                <SelectTrigger className="w-40 bg-input border-border">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No logs</h3>
                <p className="text-sm text-muted-foreground">System logs will appear here.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground w-[100px]">Level</TableHead>
                      <TableHead className="text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-muted-foreground">Source</TableHead>
                      <TableHead className="text-muted-foreground">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 100).map((log) => {
                      const style = LOG_LEVEL_STYLES[log.level]
                      const Icon = style.icon
                      return (
                        <TableRow key={log.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("w-4 h-4", style.color)} />
                              <span className={cn("text-xs font-medium uppercase", style.color)}>{log.level}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {format(log.timestamp, "HH:mm:ss.SSS")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-foreground max-w-md truncate">{log.message}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
