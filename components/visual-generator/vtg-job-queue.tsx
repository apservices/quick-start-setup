"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { phase2Store } from "@/lib/phase2-store"
import type { VTGJob, VTGJobStatus } from "@/lib/types"
import { List, Clock, CheckCircle, XCircle, Loader2, Zap } from "lucide-react"

interface VTGJobQueueProps {
  digitalTwinId: string
}

const statusConfig: Record<VTGJobStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  QUEUED: { icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10", label: "Queued" },
  PROCESSING: { icon: Loader2, color: "text-amber-400", bg: "bg-amber-400/10", label: "Processing" },
  DONE: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Done" },
  FAILED: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
}

const categoryLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
  PRODUCT_USAGE: "Product Usage",
  CAMPAIGN: "Campaign",
  CUSTOM: "Custom",
}

export function VTGJobQueue({ digitalTwinId }: VTGJobQueueProps) {
  const [jobs, setJobs] = useState<VTGJob[]>([])

  useEffect(() => {
    if (phase2Store) {
      setJobs(phase2Store.getVTGJobsByDigitalTwin(digitalTwinId))
    }

    // Poll for updates
    const interval = setInterval(() => {
      if (phase2Store) {
        setJobs(phase2Store.getVTGJobsByDigitalTwin(digitalTwinId))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [digitalTwinId])

  const queuedCount = jobs.filter((j) => j.status === "QUEUED").length
  const processingCount = jobs.filter((j) => j.status === "PROCESSING").length
  const doneCount = jobs.filter((j) => j.status === "DONE").length

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <List className="w-5 h-5" />
              Job Queue
            </CardTitle>
            <CardDescription>Track generation jobs for this Digital Twin</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-400 border-blue-400/30">
              {queuedCount} queued
            </Badge>
            <Badge variant="outline" className="text-amber-400 border-amber-400/30">
              {processingCount} processing
            </Badge>
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              {doneCount} done
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <List className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No jobs in queue</p>
            <p className="text-xs text-muted-foreground mt-1">Create a job to see it here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {jobs.map((job) => {
                const status = statusConfig[job.status]
                const StatusIcon = status.icon

                return (
                  <div key={job.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className={`p-2 rounded-full ${status.bg}`}>
                      <StatusIcon
                        className={`w-4 h-4 ${status.color} ${job.status === "PROCESSING" ? "animate-spin" : ""}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {categoryLabels[job.category] || job.category}
                        </span>
                        <Badge
                          className={
                            job.mode === "PREVIEW"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                          }
                        >
                          {job.mode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{job.id}</span>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">Priority {job.priority}</span>
                        </div>
                      </div>
                      {job.status === "PROCESSING" && <Progress value={50} className="h-1 mt-2" />}
                    </div>

                    <div className="text-right">
                      <Badge variant="outline" className={`${status.color} border-current/30`}>
                        {status.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.completedAt
                          ? new Date(job.completedAt).toLocaleTimeString()
                          : new Date(job.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
