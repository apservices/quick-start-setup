"use client"

import { useState } from "react"
import type { Forge, Model } from "@/lib/types"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Play, CheckCircle, ArrowRight, Cpu } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ParametrizationProcessorProps {
  forge: Forge
  model: Model
  onComplete: () => void
}

type ProcessingStatus = "idle" | "processing" | "complete"

interface Parameter {
  id: string
  name: string
  value: number | null
  status: ProcessingStatus
}

export function ParametrizationProcessor({ forge, model, onComplete }: ParametrizationProcessorProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<ProcessingStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [parameters, setParameters] = useState<Parameter[]>([
    { id: "facial_landmarks", name: "Facial Landmarks", value: null, status: "idle" },
    { id: "texture_maps", name: "Texture Maps", value: null, status: "idle" },
    { id: "mesh_vertices", name: "Mesh Vertices", value: null, status: "idle" },
    { id: "expression_blend", name: "Expression Blend Shapes", value: null, status: "idle" },
    { id: "uv_coordinates", name: "UV Coordinates", value: null, status: "idle" },
  ])

  const runParametrization = async () => {
    if (!user) return

    setStatus("processing")

    // Process parameters
    for (let i = 0; i < parameters.length; i++) {
      setParameters((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "processing" } : p)))

      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400))

      // Generate random parameter count
      const value = Math.floor(Math.random() * 50000) + 10000

      setParameters((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "complete", value } : p)))
      setProgress(Math.round(((i + 1) / parameters.length) * 100))
    }

    setStatus("complete")
    toast.success("Parametrization complete", {
      description: "All parameters extracted successfully.",
    })
  }

  const handleAdvance = () => {
    if (!user || status !== "complete") return

    const result = dataStore.transitionForge(forge.id, "PARAMETRIZED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_STATE_CHANGED",
        forgeId: forge.id,
        modelId: model.id,
        metadata: { from: "SEEDED", to: "PARAMETRIZED" },
      })
      toast.success("Advanced to PARAMETRIZED state")
      onComplete()
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          Parameter Extraction
        </CardTitle>
        <CardDescription>Extracting biometric parameters for {model.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Extraction Progress</span>
              <span className="text-foreground font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {parameters.map((param) => (
            <div
              key={param.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                param.status === "idle" && "border-border bg-muted/30",
                param.status === "processing" && "border-primary/50 bg-primary/5",
                param.status === "complete" && "border-emerald-500/30 bg-emerald-500/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{param.name}</span>
                {param.status === "idle" && <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />}
                {param.status === "processing" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {param.status === "complete" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </div>
              {param.value !== null && (
                <p className="text-xs text-muted-foreground mt-1">{param.value.toLocaleString()} data points</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          {status === "idle" && (
            <Button onClick={runParametrization}>
              <Play className="w-4 h-4 mr-2" />
              Extract Parameters
            </Button>
          )}

          {status === "processing" && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </Button>
          )}

          {status === "complete" && (
            <Button onClick={handleAdvance}>
              Continue to Validation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
