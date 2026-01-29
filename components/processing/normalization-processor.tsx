"use client"

import { useState } from "react"
import type { Forge, Model } from "@/lib/types"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Play, CheckCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface NormalizationProcessorProps {
  forge: Forge
  model: Model
  onComplete: () => void
}

type ProcessingStatus = "idle" | "processing" | "complete" | "error"

interface ProcessingStep {
  id: string
  name: string
  status: ProcessingStatus
  progress: number
}

export function NormalizationProcessor({ forge, model, onComplete }: NormalizationProcessorProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<ProcessingStatus>("idle")
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "color", name: "Color Normalization", status: "idle", progress: 0 },
    { id: "lighting", name: "Lighting Adjustment", status: "idle", progress: 0 },
    { id: "alignment", name: "Facial Alignment", status: "idle", progress: 0 },
    { id: "mesh", name: "Mesh Generation", status: "idle", progress: 0 },
  ])
  const [overallProgress, setOverallProgress] = useState(0)

  const runNormalization = async () => {
    if (!user) return

    setStatus("processing")

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "NORMALIZATION_STARTED",
      forgeId: forge.id,
      modelId: model.id,
    })

    // Process each step
    for (let i = 0; i < steps.length; i++) {
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "processing" } : s)))

      // Simulate processing with progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, progress } : s)))
        setOverallProgress(Math.round(((i * 100 + progress) / (steps.length * 100)) * 100))
      }

      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "complete", progress: 100 } : s)))
    }

    setStatus("complete")

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "NORMALIZATION_COMPLETED",
      forgeId: forge.id,
      modelId: model.id,
    })

    toast.success("Normalization complete", {
      description: "All assets have been normalized successfully.",
    })
  }

  const handleAdvance = () => {
    if (!user || status !== "complete") return

    const result = dataStore.transitionForge(forge.id, "NORMALIZED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_STATE_CHANGED",
        forgeId: forge.id,
        modelId: model.id,
        metadata: { from: "CAPTURED", to: "NORMALIZED" },
      })
      toast.success("Advanced to NORMALIZED state")
      onComplete()
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Normalization Processing</CardTitle>
        <CardDescription>Processing captured data for {model.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="text-foreground font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                step.status === "idle" && "border-border bg-muted/30",
                step.status === "processing" && "border-primary/50 bg-primary/5",
                step.status === "complete" && "border-emerald-500/30 bg-emerald-500/5",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{step.name}</span>
                {step.status === "idle" && <div className="w-5 h-5 rounded-full border border-muted-foreground/30" />}
                {step.status === "processing" && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                {step.status === "complete" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              </div>
              {step.status === "processing" && <Progress value={step.progress} className="h-1" />}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          {status === "idle" && (
            <Button onClick={runNormalization}>
              <Play className="w-4 h-4 mr-2" />
              Start Normalization
            </Button>
          )}

          {status === "processing" && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {status === "complete" && (
            <Button onClick={handleAdvance}>
              Continue to Seeding
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
