"use client"

import { useState, useEffect } from "react"
import { getSystemHealth, type SystemHealth } from "@/lib/system-logger"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null)

  useEffect(() => {
    // Initial check
    setHealth(getSystemHealth())

    // Poll every 30 seconds
    const interval = setInterval(() => {
      setHealth(getSystemHealth())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!health) return null

  const statusIcon = {
    healthy: <CheckCircle className="w-3 h-3 text-emerald-400" />,
    degraded: <AlertCircle className="w-3 h-3 text-amber-400" />,
    unhealthy: <XCircle className="w-3 h-3 text-rose-400" />,
  }

  const statusColor = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    unhealthy: "bg-rose-500",
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 cursor-default">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", statusColor[health.status])} />
            <span className="text-xs text-muted-foreground capitalize">{health.status}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="w-64">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">System Status</span>
              {statusIcon[health.status]}
            </div>
            <div className="space-y-2">
              {Object.entries(health.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{service}</span>
                  <span className={cn(status === "up" ? "text-emerald-400" : "text-rose-400")}>{status}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Error Rate</span>
                <span className="text-foreground">{health.metrics.errorRate}/min</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
