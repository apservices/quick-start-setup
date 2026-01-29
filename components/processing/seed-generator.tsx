"use client"

import { useState } from "react"
import type { Forge, Model } from "@/lib/types"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Play, CheckCircle, ArrowRight, Lock, Hash } from "lucide-react"
import { toast } from "sonner"

interface SeedGeneratorProps {
  forge: Forge
  model: Model
  onComplete: () => void
}

type GenerationStatus = "idle" | "generating" | "complete"

export function SeedGenerator({ forge, model, onComplete }: SeedGeneratorProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<GenerationStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [seedHash, setSeedHash] = useState<string | null>(forge.seedHash || null)
  const [seedVersion, setSeedVersion] = useState(1)

  const generateSeed = async () => {
    if (!user) return

    setStatus("generating")

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "SEED_GENERATED",
      forgeId: forge.id,
      modelId: model.id,
    })

    // Simulate seed generation
    for (let p = 0; p <= 100; p += 5) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      setProgress(p)
    }

    // Generate a fake hash
    const hash = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`

    setSeedHash(hash)
    setStatus("complete")

    toast.success("Dataset seed generated", {
      description: `Version ${seedVersion} created successfully`,
    })
  }

  const handleAdvance = () => {
    if (!user || status !== "complete") return

    const result = dataStore.transitionForge(forge.id, "SEEDED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_STATE_CHANGED",
        forgeId: forge.id,
        modelId: model.id,
        metadata: { from: "NORMALIZED", to: "SEEDED", seedHash },
      })
      toast.success("Advanced to SEEDED state")
      onComplete()
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Dataset Seed Generation</CardTitle>
        <CardDescription>Generate a unique seed hash for {model.name}'s dataset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "generating" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating seed...</span>
              <span className="text-foreground font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {seedHash && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Seed Hash (Protected)</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <code className="text-xs font-mono text-muted-foreground break-all">
                {seedHash.substring(0, 20)}...{seedHash.substring(seedHash.length - 8)}
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Version {seedVersion} • This hash is cryptographically protected and cannot be downloaded.
            </p>
          </div>
        )}

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">
            <strong>Security Notice:</strong> The seed hash is never visible or downloadable in full. It serves as an
            immutable identifier for this dataset version.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          {status === "idle" && (
            <Button onClick={generateSeed}>
              <Play className="w-4 h-4 mr-2" />
              Generate Seed
            </Button>
          )}

          {status === "generating" && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </Button>
          )}

          {status === "complete" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>Seed generated</span>
              </div>
              <Button onClick={handleAdvance}>
                Continue to Parametrization
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
