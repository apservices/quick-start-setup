"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import type { Forge, Model } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { StateBadge } from "@/components/forge/state-badge"
import { AlertCircle, CheckCircle, XCircle, Play, RotateCcw, Loader2, ClipboardCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ValidationStatus = "idle" | "running" | "passed" | "failed"

interface ValidationCheck {
  id: string
  name: string
  description: string
  status: ValidationStatus
  score?: number
}

export default function ValidationPage() {
  const { user } = useAuth()
  const [forges, setForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [selectedForgeId, setSelectedForgeId] = useState<string>("")
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle")
  const [checks, setChecks] = useState<ValidationCheck[]>([])
  const [overallScore, setOverallScore] = useState(0)

  useEffect(() => {
    if (dataStore) {
      // Get forges that are ready for validation (PARAMETRIZED state)
      const validatableForges = dataStore.getForges().filter((f) => f.state === "PARAMETRIZED")
      setForges(validatableForges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)
    }
  }, [])

  const selectedForge = forges.find((f) => f.id === selectedForgeId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : null

  const initialChecks: ValidationCheck[] = [
    {
      id: "facial_geometry",
      name: "Facial Geometry",
      description: "Validating facial landmark positioning",
      status: "idle",
    },
    { id: "texture_quality", name: "Texture Quality", description: "Checking skin texture fidelity", status: "idle" },
    {
      id: "lighting_consistency",
      name: "Lighting Consistency",
      description: "Verifying lighting normalization",
      status: "idle",
    },
    { id: "pose_accuracy", name: "Pose Accuracy", description: "Confirming angle coverage accuracy", status: "idle" },
    {
      id: "identity_coherence",
      name: "Identity Coherence",
      description: "Cross-referencing identity markers",
      status: "idle",
    },
    {
      id: "artifact_detection",
      name: "Artifact Detection",
      description: "Scanning for processing artifacts",
      status: "idle",
    },
  ]

  const runValidation = async () => {
    if (!selectedForge || !user) return

    setValidationStatus("running")
    setChecks(initialChecks.map((c) => ({ ...c, status: "idle" as ValidationStatus })))

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "VALIDATION_STARTED",
      forgeId: selectedForge.id,
      modelId: selectedForge.modelId,
    })

    let totalScore = 0
    const passThreshold = 70

    // Simulate running each check sequentially
    for (let i = 0; i < initialChecks.length; i++) {
      setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, status: "running" as ValidationStatus } : c)))

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))

      // Generate random score (biased toward passing)
      const score = Math.floor(Math.random() * 30) + 70 // 70-100
      totalScore += score

      setChecks((prev) =>
        prev.map((c, idx) =>
          idx === i
            ? {
                ...c,
                status: (score >= passThreshold ? "passed" : "failed") as ValidationStatus,
                score,
              }
            : c,
        ),
      )
    }

    const avgScore = Math.round(totalScore / initialChecks.length)
    setOverallScore(avgScore)

    const passed = avgScore >= passThreshold
    setValidationStatus(passed ? "passed" : "failed")

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "VALIDATION_COMPLETED",
      forgeId: selectedForge.id,
      modelId: selectedForge.modelId,
      metadata: { passed, score: avgScore },
    })

    if (passed) {
      toast.success("Validation Passed", {
        description: `Score: ${avgScore}% - Ready for certification`,
      })
    } else {
      toast.error("Validation Failed", {
        description: `Score: ${avgScore}% - Review and retry required`,
      })
    }
  }

  const handleAdvance = () => {
    if (!selectedForge || !user || validationStatus !== "passed") return

    const result = dataStore.transitionForge(selectedForge.id, "VALIDATED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_STATE_CHANGED",
        forgeId: selectedForge.id,
        modelId: selectedForge.modelId,
        metadata: { from: "PARAMETRIZED", to: "VALIDATED" },
      })
      toast.success("Advanced to VALIDATED state")
      // Refresh forges list
      const validatableForges = dataStore.getForges().filter((f) => f.state === "PARAMETRIZED")
      setForges(validatableForges)
      setSelectedForgeId("")
      setValidationStatus("idle")
      setChecks([])
    }
  }

  const handleRollback = () => {
    if (!selectedForge || !user) return

    const result = dataStore.transitionForge(selectedForge.id, "SEEDED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_ROLLBACK",
        forgeId: selectedForge.id,
        modelId: selectedForge.modelId,
        metadata: { from: "PARAMETRIZED", to: "SEEDED" },
      })
      toast.success("Rolled back to SEEDED state for reprocessing")
      const validatableForges = dataStore.getForges().filter((f) => f.state === "PARAMETRIZED")
      setForges(validatableForges)
      setSelectedForgeId("")
      setValidationStatus("idle")
      setChecks([])
    }
  }

  return (
    <div>
      <Header title="Validation" description="Run validation tests on processed forges" />

      <div className="p-6 space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Forge</CardTitle>
            <CardDescription>Choose a forge in PARAMETRIZED state to validate</CardDescription>
          </CardHeader>
          <CardContent>
            {forges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No forges ready for validation</p>
                  <p className="text-xs text-muted-foreground">
                    Forges must complete normalization, seeding, and parametrization first.
                  </p>
                </div>
              </div>
            ) : (
              <Select
                value={selectedForgeId}
                onValueChange={(v) => {
                  setSelectedForgeId(v)
                  setValidationStatus("idle")
                  setChecks([])
                }}
              >
                <SelectTrigger className="w-full max-w-md bg-input border-border">
                  <SelectValue placeholder="Select a forge..." />
                </SelectTrigger>
                <SelectContent>
                  {forges.map((forge) => {
                    const model = models.get(forge.modelId)
                    return (
                      <SelectItem key={forge.id} value={forge.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{forge.id}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{model?.name || "Unknown"}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedForge && selectedModel && (
          <>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    Validation Suite
                  </CardTitle>
                  <CardDescription>
                    {selectedModel.name} - {selectedForge.id}
                  </CardDescription>
                </div>
                <StateBadge state={selectedForge.state} />
              </CardHeader>
              <CardContent className="space-y-6">
                {validationStatus !== "idle" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Score</span>
                      <span
                        className={cn(
                          "font-bold text-lg",
                          validationStatus === "passed" && "text-emerald-400",
                          validationStatus === "failed" && "text-destructive",
                          validationStatus === "running" && "text-foreground",
                        )}
                      >
                        {validationStatus === "running" ? "..." : `${overallScore}%`}
                      </span>
                    </div>
                    <Progress
                      value={overallScore}
                      className={cn(
                        "h-3",
                        validationStatus === "passed" && "[&>div]:bg-emerald-500",
                        validationStatus === "failed" && "[&>div]:bg-destructive",
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(checks.length > 0 ? checks : initialChecks).map((check) => (
                    <div
                      key={check.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        check.status === "idle" && "border-border bg-muted/30",
                        check.status === "running" && "border-primary/50 bg-primary/5",
                        check.status === "passed" && "border-emerald-500/50 bg-emerald-500/5",
                        check.status === "failed" && "border-destructive/50 bg-destructive/5",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{check.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {check.score !== undefined && (
                            <span
                              className={cn(
                                "text-sm font-medium",
                                check.status === "passed" && "text-emerald-400",
                                check.status === "failed" && "text-destructive",
                              )}
                            >
                              {check.score}%
                            </span>
                          )}
                          {check.status === "idle" && (
                            <div className="w-5 h-5 rounded-full border border-muted-foreground/30" />
                          )}
                          {check.status === "running" && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                          {check.status === "passed" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                          {check.status === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  {validationStatus === "idle" && (
                    <Button onClick={runValidation}>
                      <Play className="w-4 h-4 mr-2" />
                      Run Validation Suite
                    </Button>
                  )}

                  {validationStatus === "running" && (
                    <Button disabled>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Validation...
                    </Button>
                  )}

                  {validationStatus === "passed" && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setValidationStatus("idle")
                          setChecks([])
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Re-run
                      </Button>
                      <Button onClick={handleAdvance}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Proceed to Certification
                      </Button>
                    </div>
                  )}

                  {validationStatus === "failed" && (
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={handleRollback}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Rollback for Reprocessing
                      </Button>
                      <Button
                        onClick={() => {
                          setValidationStatus("idle")
                          setChecks([])
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Retry Validation
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {validationStatus === "passed" && (
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-400">Validation Passed</p>
                    <p className="text-sm text-muted-foreground">
                      This forge has passed all validation checks and is ready for certification.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {validationStatus === "failed" && (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Validation Failed</p>
                    <p className="text-sm text-muted-foreground">
                      Review the failed checks and either retry or rollback for reprocessing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!selectedForge && forges.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Select a Forge</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Choose a forge from the dropdown above to run the validation suite.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
