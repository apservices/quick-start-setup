"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { phase2Store } from "@/lib/phase2-store"
import { Camera, CheckCircle, AlertTriangle, User } from "lucide-react"

interface CaptureViewerStatsProps {
  digitalTwinId: string
  modelName: string
}

export function CaptureViewerStats({ digitalTwinId, modelName }: CaptureViewerStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    captureStage: 0,
    normalizedStage: 0,
    valid: 0,
    invalid: 0,
    missing: 72,
  })

  useEffect(() => {
    if (phase2Store) {
      setStats(phase2Store.getCaptureStats(digitalTwinId))
    }
  }, [digitalTwinId])

  const completionPercent = Math.round((stats.total / 72) * 100)
  const validPercent = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Digital Twin</CardTitle>
          <User className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold text-foreground truncate">{modelName}</div>
          <p className="text-xs text-muted-foreground font-mono">{digitalTwinId}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Capture Progress</CardTitle>
          <Camera className="w-4 h-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.total}
            <span className="text-lg text-muted-foreground">/72</span>
          </div>
          <Progress value={completionPercent} className="h-1.5 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{completionPercent}% complete</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Valid Assets</CardTitle>
          <CheckCircle className="w-4 h-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.valid}</div>
          <p className="text-xs text-muted-foreground">{validPercent}% validation rate</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Stages</CardTitle>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Capture</span>
              <span className="text-foreground font-medium">{stats.captureStage}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Normalized</span>
              <span className="text-foreground font-medium">{stats.normalizedStage}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
